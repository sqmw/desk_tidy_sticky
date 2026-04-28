import { formatNoteDate } from "$lib/note/note-date-format.js";
import { renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
import { normalizeTagKey, normalizeTagText } from "$lib/note/tags.js";
import { hasQuadrantPriority } from "$lib/panel/note-priority.js";
import { matchNote } from "$lib/note/search.js";
import {
  WORKSPACE_NOTE_VIEW_ACTIVE,
  WORKSPACE_NOTE_VIEW_ARCHIVED,
  WORKSPACE_NOTE_VIEW_QUADRANT,
  WORKSPACE_NOTE_VIEW_TODO,
  WORKSPACE_NOTE_VIEW_TRASH,
} from "$lib/workspace/workspace-tabs.js";

/**
 * @param {any[]} source
 * @param {string} mode
 */
export function notesByWorkspaceView(source, mode) {
  const notes = Array.isArray(source) ? source : [];
  if (mode === WORKSPACE_NOTE_VIEW_ACTIVE) {
    return notes.filter((note) => !note.isArchived && !note.isDeleted);
  }
  if (mode === WORKSPACE_NOTE_VIEW_QUADRANT) {
    return notes.filter(
      (note) => !note.isArchived && !note.isDeleted && hasQuadrantPriority(note.priority),
    );
  }
  if (mode === WORKSPACE_NOTE_VIEW_TODO) {
    return notes.filter((note) => !note.isArchived && !note.isDeleted && !note.isDone);
  }
  if (mode === WORKSPACE_NOTE_VIEW_ARCHIVED) {
    return notes.filter((note) => note.isArchived && !note.isDeleted);
  }
  return notes.filter((note) => note.isDeleted);
}

/** @param {unknown} raw */
export function normalizeWorkspaceNoteTag(raw) {
  return normalizeTagKey(raw);
}

/**
 * @param {any} note
 * @param {string} tag
 */
export function workspaceNoteHasTag(note, tag) {
  const needle = normalizeWorkspaceNoteTag(tag);
  if (!needle || !Array.isArray(note?.tags)) return false;
  return note.tags.some((/** @type {any} */ tagValue) => normalizeWorkspaceNoteTag(tagValue) === needle);
}

/** @param {string} isoStr */
export function formatWorkspaceNoteDate(isoStr) {
  return formatNoteDate(isoStr);
}

/**
 * @param {{
 *   notes: any[];
 *   viewMode: string;
 *   selectedTag: string;
 *   searchQuery: string;
 * }} input
 */
export function getVisibleWorkspaceNotes(input) {
  let base = notesByWorkspaceView(input.notes, input.viewMode);

  if (input.selectedTag) {
    base = base.filter((note) => workspaceNoteHasTag(note, input.selectedTag));
  }

  const query = String(input.searchQuery || "").trim();
  if (!query) return base;
  return base
    .map((note) => {
      const tagText = Array.isArray(note.tags) ? note.tags.join(" ") : "";
      return { note, ...matchNote(query, note.text || "", { tagText }) };
    })
    .filter((match) => match.matched)
    .sort((left, right) => right.score - left.score)
    .map((match) => match.note);
}

/**
 * @param {any[]} notes
 * @param {string} viewMode
 */
export function getWorkspaceNoteTagEntries(notes, viewMode) {
  const scoped = notesByWorkspaceView(notes, viewMode);
  /** @type {Map<string, { tag: string; count: number }>} */
  const buckets = new Map();
  for (const note of scoped) {
    if (!Array.isArray(note?.tags)) continue;
    const seenInNote = new Set();
    for (const rawTag of note.tags) {
      const text = normalizeTagText(rawTag);
      const key = normalizeWorkspaceNoteTag(text);
      if (!key || seenInNote.has(key)) continue;
      seenInNote.add(key);
      const prev = buckets.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        buckets.set(key, { tag: text, count: 1 });
      }
    }
  }
  return [...buckets.values()]
    .sort((left, right) => (right.count !== left.count ? right.count - left.count : left.tag.localeCompare(right.tag)))
    .slice(0, 24);
}

/**
 * @param {any[]} notes
 * @param {string} viewMode
 */
export function countTaggedWorkspaceNotes(notes, viewMode) {
  const scoped = notesByWorkspaceView(notes, viewMode);
  return scoped.filter((note) => {
    if (!Array.isArray(note?.tags)) return false;
    return note.tags.some((/** @type {any} */ tag) => String(tag || "").trim());
  }).length;
}

/** @param {any[]} visibleNotes */
export function getRenderedWorkspaceNotes(visibleNotes) {
  return visibleNotes.map((note) => ({
    ...note,
    renderedHtml: renderNoteMarkdown(note.text || ""),
    priority: note.priority ?? null,
  }));
}

/** @param {any[]} notes */
export function getWorkspaceNoteViewCounts(notes) {
  const source = Array.isArray(notes) ? notes : [];
  const activeNotes = source.filter((note) => !note.isArchived && !note.isDeleted);
  const quadrantNotes = activeNotes.filter((note) => hasQuadrantPriority(note.priority));
  return {
    [WORKSPACE_NOTE_VIEW_ACTIVE]: activeNotes.length,
    [WORKSPACE_NOTE_VIEW_TODO]: activeNotes.filter((note) => !note.isDone).length,
    [WORKSPACE_NOTE_VIEW_QUADRANT]: quadrantNotes.length,
    [WORKSPACE_NOTE_VIEW_ARCHIVED]: source.filter((note) => note.isArchived && !note.isDeleted).length,
    [WORKSPACE_NOTE_VIEW_TRASH]: source.filter((note) => note.isDeleted).length,
  };
}

/**
 * @param {any[]} renderedNotes
 * @param {string | null} inspectorNoteId
 */
export function getWorkspaceInspectorNote(renderedNotes, inspectorNoteId) {
  if (!inspectorNoteId) return null;
  return renderedNotes.find((note) => note.id === inspectorNoteId) ?? null;
}
