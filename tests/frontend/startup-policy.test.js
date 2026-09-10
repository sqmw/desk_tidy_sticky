// @ts-nocheck -- Node harness uses the project's existing test convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceStartupActions } from '../../src/lib/workspace/controllers/workspace-startup-actions.js';

test('unavailable builds never call the autostart plugin, including disable', async()=>{
  const calls=[];
  const actions=createWorkspaceStartupActions({getAutostartAvailable:async()=>false,setAutostartAvailable:()=>{},setAutostartEnabled:()=>{},autostartEnable:async()=>calls.push('enable'),autostartDisable:async()=>calls.push('disable'),autostartIsEnabled:async()=>calls.push('read'),broadcastPreferencesChanged:async()=>{}});
  await actions.toggleAutostart(true);await actions.initAutostart();
  await actions.toggleAutostart(true);await actions.toggleAutostart(false);
  assert.deepEqual(calls,[]);
});

test('supported builds keep explicit enable and disable operations', async()=>{
  const calls=[];
  const actions=createWorkspaceStartupActions({getAutostartAvailable:async()=>true,setAutostartAvailable:()=>{},setAutostartEnabled:()=>{},autostartEnable:async()=>{calls.push('enable')},autostartDisable:async()=>{calls.push('disable')},autostartIsEnabled:async()=>false,broadcastPreferencesChanged:async()=>{}});
  await actions.initAutostart();await actions.toggleAutostart(true);await actions.toggleAutostart(false);
  assert.deepEqual(calls,['enable','disable']);
});
