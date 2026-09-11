// @ts-nocheck -- Node test harness; production modules remain checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceNavigation } from '../../src/lib/workspace/navigation-guard.js';
import { createSingleFlightCommit } from '../../src/lib/note/text-commit.js';

test('navigation waits for existing save and does not navigate after rejection', async () => {
  const run = createSingleFlightCommit();
  let finish = /** @type {(value: boolean) => void} */ (() => {}), current = 'notes', saves = 0;
  const saving = run(() => { saves++; return new Promise(resolve => { finish = resolve; }); });
  await Promise.resolve();
  const navigate = createWorkspaceNavigation({ current: () => current, canLeave: () => run.wait(), resolve: async t => t, apply: async t => { current = t; }, error: () => {} });
  const first = navigate('plugins');
  assert.equal(await navigate('timetable'), false);
  assert.equal(current, 'notes');
  finish(false); await saving;
  assert.equal(await first, false); assert.equal(current, 'notes'); assert.equal(saves, 1);
});

test('navigation itself never starts a save; stale target resolves before applying', async () => {
  const run = createSingleFlightCommit(); let current = 'notes';
  const navigate = createWorkspaceNavigation({ current: () => current, canLeave: () => run.wait(), resolve: async () => 'plugins', apply: async t => { current = t; }, error: () => {} });
  assert.equal(await navigate('timetable'), true); assert.equal(current, 'plugins');
});

test('navigation rechecks a save that starts during target resolution', async () => {
  let allowed = true, current = 'notes';
  const navigate = createWorkspaceNavigation({ current: () => current, canLeave: async () => allowed, resolve: async t => { allowed = false; return t; }, apply: async t => { current = t; }, error: () => {} });
  assert.equal(await navigate('plugins'), false); assert.equal(current, 'notes');
});
