// @ts-nocheck -- Node harness uses the project's existing test convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceStorageActions } from '../../src/lib/workspace/controllers/workspace-storage-actions.js';

test('import refreshes only after a successful storage commit',async()=>{
  for (const fail of [false,true]) {
    const calls=[];
    const actions=createWorkspaceStorageActions({
      invoke:async()=>{calls.push('import');if(fail)throw Error('failed');return {filesImported:1};},
      onImported:async()=>{calls.push('refresh');},setMarkdownStorageImporting:()=>{},
    });
    assert.equal((await actions.importMarkdownStorage()).ok,!fail);
    assert.deepEqual(calls,fail?['import']:['import','refresh']);
  }
});
