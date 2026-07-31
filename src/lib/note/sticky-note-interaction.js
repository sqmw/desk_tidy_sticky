/**
 * Classifies a notes_changed event without mutating the active editor session.
 *
 * @param {{
 *   changedNoteId: string;
 *   noteId: string;
 *   eventKind: string;
 *   hasUnsavedDraft: boolean;
 *   ignoreUntil: number;
 *   now?: number;
 * }} input
 * @returns {"unrelated" | "local" | "metadata" | "conflict" | "reload"}
 */
export function classifyStickyNoteChange(input) {
  if (input.changedNoteId && input.changedNoteId !== input.noteId) return "unrelated";
  if ((input.now ?? Date.now()) <= input.ignoreUntil) return "local";
  if (input.eventKind === "metadata") return "metadata";
  return input.hasUnsavedDraft ? "conflict" : "reload";
}

/**
 * Provides a stable, best-effort caret position when switching from rendered
 * Markdown to a textarea without pretending the two layouts are identical.
 *
 * @param {{
 *   markdown: string;
 *   rect: { left: number; top: number; width: number; height: number } | null;
 *   clientX: number;
 *   clientY: number;
 * }} input
 */
export function estimateMarkdownCaretOffset(input) {
  const { markdown, rect, clientX, clientY } = input;
  if (!rect || rect.width <= 0 || rect.height <= 0 || !markdown) return null;
  const lines = markdown.split("\n");
  const lineIndex = Math.min(
    lines.length - 1,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * lines.length)),
  );
  const line = lines[lineIndex] || "";
  const column = Math.min(
    line.length,
    Math.max(0, Math.round(((clientX - rect.left) / rect.width) * line.length)),
  );
  return lines.slice(0, lineIndex).reduce((sum, item) => sum + item.length + 1, 0) + column;
}

/** @param {string} text @param {number} start @param {number} end @param {string} insert */
export function insertTextAtSelection(text, start, end, insert) {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return {
    text: text.slice(0, safeStart) + insert + text.slice(safeEnd),
    caret: safeStart + insert.length,
  };
}
