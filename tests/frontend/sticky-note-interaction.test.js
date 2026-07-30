// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyStickyNoteChange,
  estimateMarkdownCaretOffset,
  insertTextAtSelection,
} from "../../src/lib/note/sticky-note-interaction.js";

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
