// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyStickyNoteChange,
  estimateMarkdownCaretOffset,
  insertTextAtSelection,
} from "../../src/lib/note/sticky-note-interaction.js";
import {
  getCollapsedNoteWindowFrame,
  getExpandedNoteWindowFrame,
  getPersistedNotePosition,
} from "../../src/lib/note/note-window-frame.js";
import {
  createNoteWindowDragController,
  NOTE_WINDOW_NON_DRAGGABLE_SELECTOR,
} from "../../src/lib/note/note-window-drag.js";

test("sticky reloads idle changes but preserves an active draft as a conflict", () => {
  const base = {
    changedNoteId: "note-a",
    noteId: "note-a",
    ignoreUntil: 0,
    now: 100,
  };
  assert.equal(classifyStickyNoteChange({ ...base, isEditing: false }), "reload");
  assert.equal(classifyStickyNoteChange({ ...base, isEditing: true }), "conflict");
  assert.equal(
    classifyStickyNoteChange({ ...base, changedNoteId: "note-b", isEditing: true }),
    "unrelated",
  );
});

test("sticky ignores its own short-lived notes_changed echo", () => {
  assert.equal(
    classifyStickyNoteChange({
      changedNoteId: "note-a",
      noteId: "note-a",
      isEditing: true,
      ignoreUntil: 150,
      now: 100,
    }),
    "local",
  );
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
    outerY: 300,
    currentHeight: 420,
    collapsedHeight: 0,
    wasExpanded: false,
    previousTopReserve: 0,
    nextTopReserve: 58,
    nextBottomReserve: 74,
  });
  assert.deepEqual(expanded, {
    outerY: 242,
    height: 552,
    collapsedHeight: 420,
    topReserve: 58,
    bottomReserve: 74,
  });
  assert.equal(expanded.outerY + expanded.topReserve, 300);

  const collapsed = getCollapsedNoteWindowFrame({
    outerY: expanded.outerY,
    collapsedHeight: expanded.collapsedHeight,
    appliedTopReserve: expanded.topReserve,
  });
  assert.deepEqual(collapsed, { outerY: 300, height: 420 });
});

test("expanded window drag persists the note rectangle position", () => {
  assert.deepEqual(getPersistedNotePosition({ x: 120, y: 242 }, 58, true), {
    x: 120,
    y: 300,
  });
  assert.deepEqual(getPersistedNotePosition({ x: 120, y: 300 }, 58, false), {
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
