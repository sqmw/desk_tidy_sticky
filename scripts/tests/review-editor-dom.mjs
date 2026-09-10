// @ts-nocheck -- Optional Node/Playwright integration harness; no production data.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const req = createRequire(path.join(repo, 'package.json'));
const browserRequire = process.env.BROWSER_TEST_NODE_MODULES
  ? createRequire(path.join(process.env.BROWSER_TEST_NODE_MODULES, 'package.json')) : req;
const { chromium } = browserRequire('playwright');
const { createServer } = await import(pathToFileURL(req.resolve('vite')).href);
const { svelte } = await import(pathToFileURL(path.join(repo, 'node_modules/@sveltejs/vite-plugin-svelte/src/index.js')).href);
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'desk-tidy-editor-dom-')));
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'junction');
fs.writeFileSync(path.join(root, 'index.html'), '<html><head><meta charset="utf-8"></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>');
fs.writeFileSync(path.join(root, 'main.js'), "import { mount } from 'svelte'; import Fixture from './Fixture.svelte'; mount(Fixture, {target:document.getElementById('app')});");
fs.writeFileSync(path.join(root, 'Fixture.svelte'), `
<script>
  import Inspector from '$lib/components/workspace/WorkspaceNoteInspector.svelte';
  import {getStrings} from '$lib/strings.js';
  let note=$state({id:'n',text:'original',updatedAt:'2026-09-10',tags:[]});
  let open=$state(true);
  window.__fail=false;window.__calls=[];
  window.__external=(text)=>{note={...note,text};};
  window.__saved=()=>note.text;
  async function save(text,expectedText,id){
    window.__calls.push({text,expectedText,id});
    await new Promise(resolve=>setTimeout(resolve,120));
    if(window.__fail || note.text!==expectedText) return false;
    note={...note,text};return true;
  }
</script>
<div style="position:relative;height:700px;width:800px">
{#if open}<Inspector strings={getStrings('en')} {note} formatDate={()=>''} onBlockTextChange={save} onClose={()=>{open=false}}/>{:else}<p>closed</p>{/if}
</div>`);

const server = await createServer({
  configFile:false, root, cacheDir:path.join(root,'.vite-cache'),
  plugins:[svelte({configFile:false})],
  resolve:{alias:{$lib:path.join(repo,'src/lib')},dedupe:['svelte']},
  server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}},
});
let browser;
try {
  await server.listen();
  const port=server.httpServer.address().port;
  browser=await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}),
  });
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const url='http://127.0.0.1:'+port;
  const edit=async(text)=>{await page.locator('.note-block.rendered').first().click();await page.locator('textarea').fill(text);};
  await page.goto(url);await edit('saved');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByText('closed',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__saved()),'saved');
  assert.equal(await page.evaluate(()=>window.__calls.length),1);
  console.log('PASS: blur + close save once and close only after success');

  await page.goto(url);await edit('unsaved draft');await page.evaluate(()=>{window.__fail=true;});
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('textarea').inputValue(),'unsaved draft');
  assert.equal(await page.evaluate(()=>window.__saved()),'original');
  console.log('PASS: failed save keeps textarea and draft');
  await page.evaluate(()=>{window.__fail=false;});
  await page.getByRole('button',{name:'Retry save',exact:true}).click();
  await page.waitForFunction(()=>window.__saved()==='unsaved draft');
  assert.equal(await page.getByRole('alert').count(),0);
  console.log('PASS: retry saves the preserved draft without reloading');

  await page.goto(url);await edit('local draft');await page.evaluate(()=>window.__external('remote saved'));
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('textarea').inputValue(),'local draft');
  await page.screenshot({path:path.join(root,'conflict.png')});
  await page.getByRole('button',{name:'Reload',exact:true}).click();
  await page.getByText('remote saved',{exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0);
  console.log('PASS: external update preserves draft until explicit reload');

  for (const fail of [false,true]) {
    await page.goto(url);await edit('firstsecond');
    await page.evaluate(value=>{window.__fail=value;document.querySelector('textarea').setSelectionRange(5,5);},fail);
    await page.locator('textarea').press('Enter');
    if (fail) {
      await page.getByRole('alert').waitFor();
      assert.equal(await page.locator('textarea').inputValue(),'firstsecond');
      assert.equal(await page.evaluate(()=>window.__saved()),'original');
    } else {
      await page.waitForFunction(()=>window.__saved()==='first\nsecond');
      await page.waitForFunction(()=>document.querySelector('textarea')?.value==='second');
    }
    console.log('PASS: Enter split '+(fail?'restores rejected draft':'opens the saved next block'));
  }
  assert.deepEqual(errors,[]);
  console.log('Isolated DOM artifacts: '+root);
} finally {
  await browser?.close();
  await server.close();
}
