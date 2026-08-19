// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyStickyNoteChange,
  estimateMarkdownCaretOffset,
  insertTextAtSelection,
  shouldDeferKeydownToIme,
} from "../../src/lib/note/sticky-note-interaction.js";
import {
  createStickyEdgeRevealController,
  getStickyEdgeRevealDistance,
  normalizeStickyEdgeWheel,
} from "../../src/lib/note/sticky-edge-reveal.js";
import {
  getCollapsedNoteWindowFrame,
  getExpandedNoteWindowFrame,
  getPersistedNotePosition,
} from "../../src/lib/note/note-window-frame.js";
import {
  createNoteWindowDragController,
  NOTE_WINDOW_NON_DRAGGABLE_SELECTOR,
} from "../../src/lib/note/note-window-drag.js";
import {
  clampNoteFrost,
  clampNoteOpacity,
} from "../../src/lib/note/note-style-actions.js";
import { resolveNoteSurfaceAlpha } from "../../src/lib/note/note-theme.js";
import { applyStructuralTextChange } from "../../src/lib/note/block-structural-commit.js";

function createStructuralCommitHarness(saveResult) {
  const calls = { restored: [], conflicts: 0, pendingCleared: 0, saved: [] };
  const snapshot = { activeBlockId: "paragraph:2:2:abc", activeBlockDraft: "half typed" };
  return {
    calls,
    snapshot,
    run: () =>
      applyStructuralTextChange({
        nextText: "rewritten document",
        snapshot,
        save: async (nextText) => {
          calls.saved.push(nextText);
          return saveResult;
        },
        restore: (restoredSnapshot) => calls.restored.push(restoredSnapshot),
        clearPendingCaret: () => (calls.pendingCleared += 1),
        onConflict: () => (calls.conflicts += 1),
      }),
  };
}

test("a rejected structural rewrite restores the torn-down editing session", async () => {
  const harness = createStructuralCommitHarness(false);

  assert.equal(await harness.run(), false);
  assert.deepEqual(harness.calls.saved, ["rewritten document"]);
  assert.deepEqual(harness.calls.restored, [harness.snapshot]);
  assert.equal(harness.calls.pendingCleared, 1);
  assert.equal(harness.calls.conflicts, 1);
});

test("a persisted structural rewrite keeps the new document and reports no conflict", async () => {
  const harness = createStructuralCommitHarness(true);

  assert.equal(await harness.run(), true);
  assert.deepEqual(harness.calls.restored, []);
  assert.equal(harness.calls.pendingCleared, 0);
  assert.equal(harness.calls.conflicts, 0);
});

test("a save handler that returns nothing counts as persisted", async () => {
  const harness = createStructuralCommitHarness(undefined);

  assert.equal(await harness.run(), true);
  assert.deepEqual(harness.calls.restored, []);
  assert.equal(harness.calls.conflicts, 0);
});

test("sticky reports conflicts only when a text event meets an unsaved draft", () => {
  const base = {
    changedNoteId: "note-a",
    noteId: "note-a",
    eventKind: "text",
    ignoreUntil: 0,
    now: 100,
  };
  assert.equal(classifyStickyNoteChange({ ...base, hasUnsavedDraft: false }), "reload");
  assert.equal(classifyStickyNoteChange({ ...base, hasUnsavedDraft: true }), "conflict");
  assert.equal(
    classifyStickyNoteChange({ ...base, changedNoteId: "note-b", hasUnsavedDraft: true }),
    "unrelated",
  );
  assert.equal(
    classifyStickyNoteChange({
      ...base,
      eventKind: "metadata",
      hasUnsavedDraft: true,
    }),
    "metadata",
  );
});

test("sticky ignores its own short-lived notes_changed echo", () => {
  assert.equal(
    classifyStickyNoteChange({
      changedNoteId: "note-a",
      noteId: "note-a",
      eventKind: "text",
      hasUnsavedDraft: true,
      ignoreUntil: 150,
      now: 100,
    }),
    "local",
  );
});

test("IME composition owns Enter before block editing shortcuts", () => {
  const enter = { isComposing: false, keyCode: 13 };

  assert.equal(shouldDeferKeydownToIme(enter, true), true);
  assert.equal(shouldDeferKeydownToIme(enter, false), false);
  assert.equal(shouldDeferKeydownToIme({ isComposing: true, keyCode: 13 }, false), true);
  assert.equal(shouldDeferKeydownToIme({ isComposing: false, keyCode: 229 }, false), true);
});

test("note opacity preserves zero and frost reveals the blurred surface", () => {
  assert.equal(clampNoteOpacity(0), 0);
  assert.equal(clampNoteOpacity(Number.NaN), 1);
  assert.equal(clampNoteFrost(0), 0);
  assert.equal(clampNoteFrost(Number.NaN), 0);
  assert.equal(resolveNoteSurfaceAlpha(1, 0), 1);
  assert.ok(Math.abs(resolveNoteSurfaceAlpha(1, 1) - 0.58) < 1e-9);
  assert.ok(resolveNoteSurfaceAlpha(0.6, 1) < resolveNoteSurfaceAlpha(0.6, 0));
});

test("edge reveal wheel normalizes platform units without relying on scroll sign", () => {
  assert.deepEqual(normalizeStickyEdgeWheel({ deltaX: -2, deltaY: 3, deltaMode: 1 }), {
    x: 32,
    y: 48,
  });
  assert.equal(getStickyEdgeRevealDistance("top", { x: 2, y: 18 }), 18);
  assert.equal(getStickyEdgeRevealDistance("bottom", { x: 2, y: 18 }), 18);
  assert.equal(getStickyEdgeRevealDistance("left", { x: 12, y: 30 }), 19.5);
});

test("hidden edge reveals after one deliberate trackpad gesture and debounces repeats", async () => {
  let now = 100;
  let revealCount = 0;
  const controller = createStickyEdgeRevealController({
    getEdge: () => "top",
    isHidden: () => true,
    now: () => now,
    threshold: 28,
    onReveal: async () => {
      revealCount += 1;
    },
  });
  const event = {
    deltaX: 0,
    deltaY: -16,
    deltaMode: 0,
    preventDefault() {},
    stopPropagation() {},
  };

  assert.equal(await controller.handleWheel(event), false);
  now += 40;
  assert.equal(await controller.handleWheel(event), true);
  assert.equal(revealCount, 1);
});

test("rendered block click estimates a caret within the selected markdown line", () => {
  const offset = estimateMarkdownCaretOffset({
    markdown: "# Heading\nsecond line",
    rect: { left: 0, top: 0, width: 100, height: 40 },
    clientX: 50,
    clientY: 30,
  });
  assert.equal(offset, 16);
});

test("image markdown replaces only the active textarea selection", () => {
  assert.deepEqual(insertTextAtSelection("before after", 7, 12, "![image](asset://a)"), {
    text: "before ![image](asset://a)",
    caret: 26,
  });
});

test("external controls expand around the note without moving its rectangle", () => {
  const expanded = getExpandedNoteWindowFrame({
    outerX: 120,
    outerY: 300,
    currentWidth: 300,
    currentHeight: 420,
    collapsedWidth: 0,
    collapsedHeight: 0,
    wasExpanded: false,
    previousLeftReserve: 0,
    previousTopReserve: 0,
    nextLeftReserve: 32,
    nextRightReserve: 32,
    nextTopReserve: 58,
    nextBottomReserve: 74,
  });
  assert.deepEqual(expanded, {
    outerX: 88,
    outerY: 242,
    width: 364,
    height: 552,
    collapsedWidth: 300,
    collapsedHeight: 420,
    leftReserve: 32,
    rightReserve: 32,
    topReserve: 58,
    bottomReserve: 74,
  });
  assert.equal(expanded.outerX + expanded.leftReserve, 120);
  assert.equal(expanded.outerY + expanded.topReserve, 300);

  const remeasured = getExpandedNoteWindowFrame({
    outerX: expanded.outerX,
    outerY: expanded.outerY,
    currentWidth: expanded.width,
    currentHeight: expanded.height,
    collapsedWidth: expanded.collapsedWidth,
    collapsedHeight: expanded.collapsedHeight,
    wasExpanded: true,
    previousLeftReserve: expanded.leftReserve,
    previousTopReserve: expanded.topReserve,
    nextLeftReserve: 42,
    nextRightReserve: 42,
    nextTopReserve: 64,
    nextBottomReserve: 80,
  });
  assert.equal(remeasured.outerX + remeasured.leftReserve, 120);
  assert.equal(remeasured.outerY + remeasured.topReserve, 300);
  assert.equal(remeasured.width, 384);
  assert.equal(remeasured.height, 564);

  const collapsed = getCollapsedNoteWindowFrame({
    outerX: expanded.outerX,
    outerY: expanded.outerY,
    collapsedWidth: expanded.collapsedWidth,
    collapsedHeight: expanded.collapsedHeight,
    appliedLeftReserve: expanded.leftReserve,
    appliedTopReserve: expanded.topReserve,
  });
  assert.deepEqual(collapsed, { outerX: 120, outerY: 300, width: 300, height: 420 });
});

test("expanded window drag persists the note rectangle position", () => {
  assert.deepEqual(getPersistedNotePosition({ x: 88, y: 242 }, { left: 32, top: 58 }, true), {
    x: 120,
    y: 300,
  });
  assert.deepEqual(getPersistedNotePosition({ x: 120, y: 300 }, { left: 32, top: 58 }, false), {
    x: 120,
    y: 300,
  });
});

test("note surface is not globally excluded from window dragging", () => {
  assert.equal(NOTE_WINDOW_NON_DRAGGABLE_SELECTOR.includes("data-no-drag"), false);
  assert.equal(NOTE_WINDOW_NON_DRAGGABLE_SELECTOR.includes(".note-conflict-notice"), true);
});

test("note surface drag moves the native window and persists its final position", async () => {
  const moves = [];
  const persisted = [];
  const surface = {
    setPointerCapture() {},
    hasPointerCapture() {
      return true;
    },
    releasePointerCapture() {},
  };
  const controller = createNoteWindowDragController({
    getCurrentWindow: () => ({
      outerPosition: async () => ({ x: 100, y: 200 }),
      scaleFactor: async () => 1,
    }),
    moveWindow: async (position) => {
      moves.push(position);
    },
    getCanInteract: () => true,
    getIsEditing: () => false,
    getIsAlwaysOnTop: () => true,
    dismissFloatingPanels() {},
    onPositionPersist: (position) => {
      persisted.push(position);
    },
  });
  const target = {
    closest: (selector) => (selector === ".note-shell" ? surface : null),
  };

  controller.handleDragPointerDown({
    button: 0,
    pointerId: 7,
    screenX: 10,
    screenY: 10,
    target,
    currentTarget: surface,
  });
  controller.onDragPointerMove({
    pointerId: 7,
    buttons: 1,
    screenX: 16,
    screenY: 16,
    preventDefault() {},
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.onDragPointerMove({
    pointerId: 7,
    buttons: 1,
    screenX: 26,
    screenY: 31,
    preventDefault() {},
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.onDragPointerUp({
    pointerId: 7,
    currentTarget: surface,
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(moves, [{ x: 110, y: 215 }]);
  assert.deepEqual(persisted, [{ x: 110, y: 215 }]);
});
