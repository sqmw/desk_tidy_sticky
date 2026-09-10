// @ts-nocheck -- Node test harness, matching the existing frontend test convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { commitNoteText, shouldPreserveEditorDocument, createSingleFlightCommit } from '../../src/lib/note/text-commit.js';
import { applyStructuralTextChange } from '../../src/lib/note/block-structural-commit.js';
import { createWorkspaceInspectorActions } from '../../src/lib/workspace/controllers/workspace-inspector-actions.js';
import { classifyStickyNoteChange } from '../../src/lib/note/sticky-note-interaction.js';

test('closing a saved new note or placeholder never invokes deletion', async () => {
  const commands=[];
  const action=createWorkspaceInspectorActions({invoke:async cmd=>commands.push(cmd), setPendingEditorDraft:()=>{},setInspectorOpen:()=>{},setInspectorNoteId:()=>{},setInspectorListCollapsed:()=>{}});
  await action.handleInspectorClose();
  assert.deepEqual(commands,[]);
});

test('actual text command failure reaches the structural rollback contract', async () => {
  let restore=0, errors=0;
  const saved=await applyStructuralTextChange({ nextText:'draft',snapshot:{draft:'draft'},
    save:text=>commitNoteText({invoke:async()=>{throw Error('disk failed');},id:'n',text,expectedText:'old',sortMode:'custom',onError:()=>errors++}),
    restore:()=>restore++,clearPendingCaret:()=>{},onConflict:()=>{},
  });
  assert.equal(saved,false); assert.equal(restore,1); assert.equal(errors,1);
});

test('throwing save callbacks also restore a structural draft',async()=>{
  let restore=0;
  assert.equal(await applyStructuralTextChange({nextText:'next',snapshot:{},save:async()=>{throw Error('failed')},restore:()=>restore++,clearPendingCaret:()=>{},onConflict:()=>{}}),false);
  assert.equal(restore,1);
});

test('text saves send a captured baseline and return success explicitly',async()=>{
  let args;
  assert.equal(await commitNoteText({invoke:async(_,next)=>args=next,id:'n',text:'new',expectedText:'old',sortMode:'custom',onError:()=>assert.fail()}),true);
  assert.equal(args.expectedText,'old');assert.equal(args.text,'new');
});

test('dirty editor preserves external text and note switches but accepts own save',()=>{
  const base={currentId:'n',incomingId:'n',currentText:'old',incomingText:'other',dirty:true,saving:false,savingText:null};
  assert.equal(shouldPreserveEditorDocument(base),true);
  assert.equal(shouldPreserveEditorDocument({...base,incomingId:'other',incomingText:'old'}),true);
  assert.equal(shouldPreserveEditorDocument({...base,incomingText:'old'}),false);
  assert.equal(shouldPreserveEditorDocument({...base,saving:true,savingText:'other'}),false);
});

test('a same-note external event during the former cooldown is never local',()=>{
  assert.equal(classifyStickyNoteChange({noteId:'n',changedNoteId:'n',eventKind:'text',sourceWindow:'workspace',currentWindow:'note-n',ignoreUntil:10000,now:100,hasUnsavedDraft:true}),'conflict');
});

test('blur and close await the same write, and failure remains retryable', async()=>{
  const run=createSingleFlightCommit();let count=0, release;
  const gate=new Promise(r=>release=r);
  const save=async()=>{count++;await gate;return false;};
  const first=run(save), second=run(save);
  assert.equal(first,second);release();
  assert.deepEqual(await Promise.all([first,second]),[false,false]);
  assert.equal(count,1);assert.equal(await run(async()=>true),true);
});
