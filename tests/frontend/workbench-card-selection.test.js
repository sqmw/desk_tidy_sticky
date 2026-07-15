// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import { shouldOpenWorkbenchCardFromClick } from "../../src/lib/workspace/note/workbench-card-selection.js";
import {
  isNotesStorageRecoveryRequired,
  isNotesStorageRecoveryError,
  normalizeNotesStorageStatus,
} from "../../src/lib/notes/storage-recovery.js";

test("single click opens details only while the inspector is expanded", () => {
  const plainTarget = { closest: () => null };
  assert.equal(shouldOpenWorkbenchCardFromClick({ target: plainTarget }, true), true);
  assert.equal(shouldOpenWorkbenchCardFromClick({ target: plainTarget }, false), false);
});

test("card actions and markdown links do not switch the inspector", () => {
  const actionTarget = { closest: () => ({}) };
  assert.equal(shouldOpenWorkbenchCardFromClick({ target: actionTarget }, true), false);
});

test("recovery status normalizes backend state and recognizes blocked writes", () => {
  assert.deepEqual(normalizeNotesStorageStatus({ state: "recoveryRequired", message: "bad json" }), {
    state: "recoveryRequired",
    message: "bad json",
  });
  assert.equal(isNotesStorageRecoveryRequired({ state: "recoveryRequired" }), true);
  assert.equal(isNotesStorageRecoveryRequired({ state: "ready" }), false);
  assert.equal(isNotesStorageRecoveryError("recovery_required: notes unreadable"), true);
});
