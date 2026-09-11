// @ts-nocheck -- UI integration with real external JS Worker; native IPC is a fixture.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'desk-tidy-plugin-dom-')));
const plugin = fs.readFileSync(path.join(repo, 'plugins/timetable-v01/timetable.dtplugin'), 'utf8');
const example = JSON.parse(fs.readFileSync(path.join(repo, 'plugins/timetable-v01/example.json'), 'utf8'));
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'junction');
fs.writeFileSync(path.join(root, 'index.html'), '<html><meta charset="utf-8"><body style="margin:0"><div id="app"></div><script type="module" src="/main.js"></script></body></html>');
fs.writeFileSync(path.join(root, 'main.js'), `import {mount} from 'svelte';const App=location.pathname==='/workspace-test'?(await import('./WorkspaceFixture.svelte')).default:(await import('${path.join(repo, 'src/routes/plugins/+page.svelte')}')).default;mount(App,{target:document.getElementById('app')});`);
fs.writeFileSync(path.join(root, 'WorkspaceFixture.svelte'), `
<script>
 import Sidebar from '$lib/components/workspace/WorkspaceSidebar.svelte';
 import Notes from '$lib/components/workspace/WorkspaceNotesPane.svelte';
 import Panel from '$lib/plugins/WorkspacePluginPanel.svelte';
 import {createWorkspaceNavigation} from '$lib/workspace/navigation-guard.js';
 import {getStrings} from '$lib/strings.js';
 import {buildWorkspaceThemeVarStyle} from '$lib/workspace/theme/theme-presets.js';
 let tab=$state('notes'),notesApi=$state(null),panelApi=$state(null),error=$state('');
 let quick=$state(''),query=$state(''),draft=$state(''),note=$state({id:'note',text:'original',updatedAt:'2026-09-11',tags:[]});
 let theme=$state('light');const strings=getStrings('zh');window.noteSaves=0;window.noteFail=false;window.currentTab=()=>tab;window.setFixtureTheme=(value)=>theme=value;
 async function save(text,expected){window.noteSaves++;await new Promise(r=>setTimeout(r,120));if(window.noteFail||note.text!==expected)return false;note={...note,text};return true;}
 const navigate=createWorkspaceNavigation({current:()=>tab,canLeave:async()=>{error='';if(tab==='notes'&&!await notesApi.canNavigate()){error='笔记保存失败';return false;}return await panelApi.canLeave();},resolve:t=>panelApi.resolveTarget(t),apply:async t=>{tab=t;},error:e=>error=e});
 window.navigate=navigate;
</script>
<div class="fixture" style={buildWorkspaceThemeVarStyle(theme)}>
 <Sidebar {strings} mainTab={tab} viewModes={[]} viewMode="active" onSetMainTab={navigate} onDragStart={()=>{}}/>
 <main>
 {#if error}<p role="alert">{error}</p>{/if}
 <div class="notes" class:hidden={tab!=='notes'} inert={tab!=='notes'}><Notes bind:this={notesApi} active={tab==='notes'} {strings} viewMode="active" bind:newNoteText={quick} bind:searchQuery={query} inspectorOpen={true} inspectorNote={note} bind:inspectorDraftText={draft} onInspectorTextChange={save}/></div>
 <Panel bind:this={panelApi} view={tab} {navigate} availability={()=>{}}/>
 </main>
</div>
<style>.fixture{display:grid;grid-template-columns:210px minmax(0,1fr);height:100vh;background:var(--ws-panel-bg,#f6f7fb);color:var(--ws-text,#202938)}main{min-width:0;min-height:0;display:flex;flex-direction:column;padding:16px}.notes{height:100%;min-height:0;display:flex;flex-direction:column}.hidden{display:none}</style>`);
fs.writeFileSync(path.join(root, 'events.js'), `const events=new Map();export async function listen(name,fn){const set=events.get(name)||new Set();events.set(name,set);set.add(fn);return()=>set.delete(fn);}export async function emit(name,payload){for(const fn of events.get(name)||[])await fn({payload});}`);
fs.writeFileSync(path.join(root, 'notification.js'), `export async function requestPermission(){return 'granted';}`);
fs.writeFileSync(path.join(root, 'native.js'), `
const approved=${JSON.stringify(plugin)};
function read(){return JSON.parse(localStorage.getItem('fixture')||'null')||{manifest:null,enabled:false,revision:0,data:null,reminderStatus:'',mobile:false};}
function write(s){s.revision++;localStorage.setItem('fixture',JSON.stringify(s));return s;}
window.fixture=()=>read();window.failSave=false;
export async function invoke(command,args={}){
 let s=read();
 if(command==='plugin_status')return s;
 if(command==='plugin_preview'||command==='plugin_install'){
  if(args.raw!==approved)throw new Error('插件包未通过审查');
  const p=JSON.parse(approved);if(command==='plugin_preview')return p.manifest;
  if(JSON.stringify(args.grants)!=='["storage","reminders"]')throw new Error('未确认权限');
  return write({...s,manifest:p.manifest,enabled:true});
 }
 if(command==='plugin_open'){if(!s.manifest||!s.enabled)throw new Error('插件未启用');return JSON.parse(approved).source;}
 if(command==='plugin_save'){
  if(args.data?.mode==='demo'&&args.plan.length)throw new Error('demo must not schedule reminders');
  if(window.failSave)throw new Error('模拟磁盘写入失败');
  if(!s.enabled||args.expectedRevision!==s.revision)throw new Error('状态已变化');
  return write({...s,data:args.data,reminderStatus:'测试接口：不调度系统提醒'});
 }
 if(command==='plugin_lifecycle'){s.enabled=args.action==='enable';if(args.action==='uninstall')s.manifest=null;return write(s);}
 throw new Error('unexpected command '+command);
}`);
const server = await createServer({configFile:false,root,cacheDir:path.join(root,'.vite-cache'),plugins:[svelte({configFile:false})],resolve:{alias:{$lib:path.join(repo,'src/lib'),'@tauri-apps/api/core':path.join(root,'native.js'),'@tauri-apps/api/event':path.join(root,'events.js'),'@tauri-apps/plugin-notification':path.join(root,'notification.js')},dedupe:['svelte']},server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});
let browser;
try {
  await server.listen();
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:980,height:760}});
  page.setDefaultTimeout(8000);
  await page.addInitScript(() => {
    window.liveWorkers=0; const NativeWorker=window.Worker;
    window.Worker=class extends NativeWorker {
      constructor(...args){super(...args);window.liveWorkers++;this.counted=true;}
      terminate(){if(this.counted){window.liveWorkers--;this.counted=false;}super.terminate();}
    };
  });
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port);
  await page.getByText('还没有安装插件',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'课表',exact:true}).count(),0);
  const packageInput=page.getByLabel('选择插件包',{exact:true});
  await packageInput.setInputFiles({name:'bad.dtplugin',mimeType:'application/json',buffer:Buffer.from('{}')});
  await page.getByRole('alert').filter({hasText:'未通过审查'}).waitFor();
  await packageInput.setInputFiles({name:'timetable.dtplugin',mimeType:'application/json',buffer:Buffer.from(plugin)});
  await page.getByRole('button',{name:'确认安装',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'确认安装',exact:true}).isEnabled(),false);
  await page.getByLabel('我同意以上权限').focus();
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('dialog')),true);}
  await page.getByLabel('我同意以上权限').check();await page.getByRole('button',{name:'确认安装',exact:true}).click();
  await page.getByRole('button',{name:'打开课表',exact:true}).click();
  await page.getByRole('button',{name:'导入第一份课表'}).waitFor();
  await page.getByRole('button',{name:'查看真实课表示例'}).click();
  await page.getByRole('button',{name:/学术规范与实验室安全，周四/}).waitFor();
  assert.equal(await page.evaluate(()=>window.fixture().data),null);
  await page.getByRole('button',{name:'退出演示'}).click();
  await page.getByRole('button',{name:'导入第一份课表'}).waitFor();
  console.log('PASS empty entry, rejected package, explicit consent, installed timetable entry');
  async function importData(data){await page.getByRole('button',{name:'导入课表',exact:true}).click();await page.getByLabel('导入课表JSON',{exact:true}).setInputFiles({name:'course.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});}
  await importData(example);await page.getByRole('button',{name:'确认导入并保存'}).waitFor();
  assert.equal(await page.evaluate(()=>window.fixture().data),null);
  assert.equal(await page.locator('tbody tr').count(),example.meetings.length);
  await page.getByRole('button',{name:'插件管理',exact:true}).click();
  await page.getByRole('button',{name:'继续导入'}).click();
  await page.getByRole('button',{name:'取消导入',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.fixture().data),null);
  console.log('PASS full preview, navigation guard and cancel do not persist');
  await importData(example);await page.getByRole('button',{name:'确认导入并保存'}).click();
  await page.getByText('课表已保存，重新打开后仍可查看。',{exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.fixture().data)).id,example.id);
  await page.reload();await page.getByRole('button',{name:'打开课表'}).click();
  await page.getByLabel('查看周次').selectOption('1');
  await page.getByText(example.courses[0].name,{exact:true}).waitFor();
  await page.screenshot({path:path.join(root,'saved-timetable.png')});
  await page.getByRole('button',{name:/学术规范与实验室安全，周四/}).click();
  await page.getByRole('dialog',{name:'学术规范与实验室安全',exact:true}).waitFor();
  await page.getByRole('button',{name:'关闭详情'}).click();
  await page.getByLabel('查看周次').selectOption('2');
  await page.getByRole('button',{name:/先进生物医学材料，周一/}).waitFor();
  assert.equal(await page.locator('.week-grid .course').count(),2);
  await page.getByLabel('查看周次').selectOption('1');
  await page.getByRole('button',{name:/学术规范与实验室安全，周四/}).waitFor();
  console.log('PASS actual Worker parse/save/reopen and daily courses');
  await importData({schemaVersion:99});await page.getByRole('alert').filter({hasText:'无法导入'}).waitFor();
  assert.equal((await page.evaluate(()=>window.fixture().data)).id,example.id);
  await page.getByRole('button',{name:'取消导入',exact:true}).click();
  const replacement=structuredClone(example);replacement.id='replacement';
  await importData(replacement);await page.evaluate(()=>window.failSave=true);
  await page.getByRole('button',{name:'确认导入并保存'}).click();
  await page.getByRole('alert').filter({hasText:'模拟磁盘写入失败'}).waitFor();
  assert.equal((await page.evaluate(()=>window.fixture().data)).id,example.id);
  await page.evaluate(()=>window.failSave=false);await page.getByRole('button',{name:'确认导入并保存'}).click();
  await page.getByText('课表已保存，重新打开后仍可查看。',{exact:true}).waitFor();
  console.log('PASS invalid import retains saved data, failed save preserves preview and retries');
  await page.getByRole('button',{name:'插件管理',exact:true}).click();
  await page.getByRole('button',{name:'停用',exact:true}).click();await page.getByRole('button',{name:'确认停用',exact:true}).click();
  await page.getByRole('button',{name:'启用',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'课表',exact:true}).count(),0);
  assert.equal((await page.evaluate(()=>window.fixture().data)).id,'replacement');
  await page.getByRole('button',{name:'卸载',exact:true}).click();await page.getByRole('button',{name:'确认卸载',exact:true}).click();
  await page.getByText('还没有安装插件',{exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.fixture().data)).id,'replacement');
  assert.deepEqual(errors,[]);
  console.log('PASS disable/uninstall hide entry and retain timetable');
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/workspace-test');
  await page.getByRole('button',{name:'插件',exact:true}).waitFor();
  const quick=page.getByPlaceholder('输入后回车快速创建，或点 + 新建笔记。');
  await quick.fill('保留快速输入');
  await page.locator('.note-block.rendered').first().click();
  await page.locator('.notes textarea').fill('未保存的笔记草稿');
  await page.getByRole('button',{name:'插件',exact:true}).click();
  await page.getByText('还没有安装插件',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.noteSaves),0);
  await page.getByRole('button',{name:'笔记',exact:true}).click();
  assert.equal(await page.locator('.notes textarea').inputValue(),'未保存的笔记草稿');
  assert.equal(await quick.inputValue(),'保留快速输入');
  console.log('PASS workspace navigation retains editor and composer without implicit saves');
  await page.evaluate(()=>window.noteFail=true);
  await page.locator('.notes textarea').focus();
  // Tab inside this editor indents text; moving focus outside triggers its blur save.
  await page.getByRole('button',{name:'插件',exact:true}).focus();
  await page.getByRole('button',{name:'插件',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'笔记保存失败'}).waitFor();
  assert.equal(await page.evaluate(()=>window.currentTab()),'notes');
  assert.equal(await page.locator('.notes textarea').inputValue(),'未保存的笔记草稿');
  await page.evaluate(()=>window.noteFail=false);
  await page.getByRole('button',{name:stringsRetry(),exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.notes textarea'));
  await page.getByRole('button',{name:'插件',exact:true}).click();
  await page.getByLabel('选择插件包',{exact:true}).setInputFiles({name:'timetable.dtplugin',mimeType:'application/json',buffer:Buffer.from(plugin)});
  await page.getByLabel('我同意以上权限').check();
  await page.getByRole('button',{name:'确认安装',exact:true}).click();
  await page.getByRole('button',{name:'打开课表',exact:true}).click();
  await page.getByLabel('查看周次').selectOption('1');
  await page.getByText(example.courses[0].name,{exact:true}).waitFor();
  const date=await page.getByLabel('查看周次').inputValue();
  await page.getByRole('button',{name:'笔记',exact:true}).click();
  await page.getByRole('button',{name:'课表',exact:true}).click();
  assert.equal(await page.getByLabel('查看周次').inputValue(),date);
  assert.equal(await page.evaluate(()=>window.liveWorkers),1);
  await importData(example);
  await page.getByRole('button',{name:'笔记',exact:true}).click();
  await page.getByRole('dialog',{name:'放弃本次导入？'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.currentTab()),'timetable');
  await page.getByRole('button',{name:'笔记',exact:true}).click();
  await page.getByRole('button',{name:'放弃导入并离开'}).click();
  await page.waitForFunction(()=>window.currentTab()==='notes');
  await page.getByRole('button',{name:'课表',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'确认导入并保存'}).count(),0);
  await page.waitForFunction(()=>document.querySelector('button[aria-label="课表"]')?.getAttribute('aria-current')==='page');
  await page.screenshot({path:path.join(root,'workspace-light.png')});
  // Use the real 2026-10-26 week, not invented course names or schedules.
  await page.getByLabel('查看周次').selectOption('7');
  await page.getByRole('button',{name:/科研设计与论文写作/}).waitFor();
  assert.equal(await page.locator('.week-grid .course').count(),9);
  await page.setViewportSize({width:1400,height:1500});
  await page.screenshot({path:path.join(root,'week-dense-light.png')});
  const tones=await page.locator('.week-grid .course').evaluateAll(nodes=>new Set(nodes.map(node=>getComputedStyle(node).backgroundColor)).size);
  assert.ok(tones>1,'course colors must not be overridden by shared button styles');
  await page.evaluate(()=>window.setFixtureTheme('dark'));
  await page.screenshot({path:path.join(root,'week-dense-dark.png'),animations:'disabled'});
  const contrast=await page.locator('.week-grid .course').evaluateAll(nodes=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
    const luminance=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    return Math.min(...nodes.map(node=>{const fg=luminance(getComputedStyle(node.querySelector('strong')).color),bg=luminance(getComputedStyle(node).backgroundColor);return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);}));
  });
  assert.ok(contrast>=4.5,'dark course titles must remain readable: '+contrast);
  await page.setViewportSize({width:760,height:650});
  await page.screenshot({path:path.join(root,'workspace-dark.png')});
  await page.getByRole('button',{name:'插件',exact:true}).click();
  await page.getByRole('button',{name:'停用',exact:true}).click();
  await page.getByRole('button',{name:'确认停用',exact:true}).click();
  await page.waitForFunction(()=>window.liveWorkers===0);
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="课表"]'));
  await page.evaluate(()=>window.navigate('timetable'));
  assert.equal(await page.evaluate(()=>window.currentTab()),'plugins');
  assert.deepEqual(errors,[]);
  console.log('PASS failed-save blocks navigation, retry restores access, date retained, import departure guarded, light/dark rendering, one Worker then zero on disable, stale entry rejected');
  console.log('UI artifacts: '+root);
} catch(error) {
  const failedPage=browser?.contexts()[0]?.pages()[0];
  if(failedPage){console.error(await failedPage.locator('body').innerText());await failedPage.screenshot({path:path.join(root,'failure.png')});}
  console.error('Failure artifacts: '+root);throw error;
} finally {await browser?.close();await server.close();}

function stringsRetry(){return '重试保存';}
