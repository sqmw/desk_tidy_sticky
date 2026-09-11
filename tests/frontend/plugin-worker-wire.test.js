// @ts-nocheck -- Node runner exercises the real transport against structuredClone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePluginMessage } from '../../src/lib/plugins/wire.js';
import { createPluginRuntime } from '../../src/lib/plugins/runtime.ts';

test('reactive proxy requests become cloneable JSON without changing data',()=>{
  const draft=new Proxy({courses:[new Proxy({id:'a',name:'课程'}, {})]},{});
  assert.throws(()=>structuredClone(draft),{name:'DataCloneError'});
  const message=encodePluginMessage({id:1,action:'plan',input:draft,now:123});
  assert.deepEqual(structuredClone(message),{id:1,action:'plan',input:{courses:[{id:'a',name:'课程'}]},now:123});
});

test('invalid messages are rejected before sending',()=>{
  const cycle={};cycle.self=cycle;
  assert.throws(()=>encodePluginMessage(cycle));
  assert.throws(()=>encodePluginMessage(undefined));
  assert.throws(()=>encodePluginMessage('x'.repeat(1024*1024)));
});

test('runtime sends proxies successfully and remains usable after post failure',async(t)=>{
  const original=globalThis.Worker;
  let instance;
  globalThis.Worker=class {
    fail=false;
    constructor(){instance=this;}
    postMessage(value){if(this.fail)throw new Error('send failed');const message=structuredClone(value);queueMicrotask(()=>this.onmessage({data:{id:message.id,value:message.input}}));}
    terminate(){}
  };
  const runtime=createPluginRuntime('');
  t.after(()=>{runtime.close();globalThis.Worker=original;});
  const draft=new Proxy({saved:true},{});
  assert.deepEqual(await runtime.call('plan',draft),{saved:true});
  instance.fail=true;await assert.rejects(runtime.call('plan',draft),/send failed/);
  instance.fail=false;assert.deepEqual(await runtime.call('view',draft),{saved:true});
});
