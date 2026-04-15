import { matchNote } from "$lib/note/search.js";
import { normalizeTagKey, normalizeTagText } from "$lib/note/tags.js";
import { hasQuadrantPriority } from "$lib/panel/note-priority.js";

export const PANEL_NOTE_VIEW_MODES = ["active", "archived", "trash"];

/**
 * @param {any[]} source
 * @param {string} mode
 */
export function notesByPanelView(source, mode) {
  const notes = Array.isArray(source) ? source : [];
  if (mode === "active") {
    return notes.filter((note) => !note.isArchived && !note.isDeleted);
  }
  if (mode === "todo") {
    return notes
      .filter((note) => !note.isArchived && !note.isDeleted)
      .sort((a, b) => {
        if (!!a.isDone !== !!b.isDone) return a.isDone ? 1 : -1;
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
  }
  if (mode === "quadrant") {
    return notes.filter(
      (note) => !note.isArchived && !note.isDeleted && hasQuadrantPriority(note.priority),
    );
  }
  if (mode === "archived") {
    return notes.filter((note) => note.isArchived && !note.isDeleted);
  }
  return notes.filter((note) => note.isDeleted);
}

/**
 * @param {{
 *   notes: any[];
 *   viewMode: string;
 *   searchQuery: string;
 * }} input
 */
export function getVisiblePanelNotes(input) {
  const base = notesByPanelView(input.notes, input.viewMode);
  const query = String(input.searchQuery || "").trim();
  if (!query) return base;
  return base
    .map((note) => ({ note, ...matchNote(query, note.text) }))
    .filter((match) => match.matched)
    .sort((left, right) => right.score - left.score)
    .map((match) => match.note);
}

/**
 * @param {any[]} notes
 * @param {{ limit?: number } | undefined} [options]
 */
export function getPanelNoteTagOptions(notes, options) {
  const limit = options?.limit ?? 80;
  /** @type {Map<string, string>} */
  const bucket = new Map();
  for (const note of Array.isArray(notes) ? notes : []) {
    if (!Array.isArray(note?.tags)) continue;
    for (const rawTag of /** @type {any[]} */ (note.tags)) {
      const text = normalizeTagText(rawTag);
      if (!text) continue;
      const key = normalizeTagKey(text);
      if (!key || bucket.has(key)) continue;
      bucket.set(key, text);
    }
  }
  return [...bucket.values()].sort((a, b) => a.localeCompare(b)).slice(0, limit);
}
