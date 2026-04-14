import { collectTagSuggestionsFromNotes } from "$lib/note/tags.js";

/**
 * @param {unknown} raw
 * @returns {any[]}
 */
export function normalizeNotesList(raw) {
  return Array.isArray(raw) ? raw : [];
}

/**
 * @param {unknown} raw
 * @param {string} noteId
 */
export function findNoteById(raw, noteId) {
  return normalizeNotesList(raw).find((note) => String(note?.id || "") === String(noteId || "")) ?? null;
}

/**
 * @param {any} note
 * @param {string} fallbackId
 */
export function resolveNoteId(note, fallbackId) {
  return String(note?.id || fallbackId || "");
}

/**
 * @param {any} note
 * @param {{ defaultOpacity: number; defaultFrost: number }} defaults
 */
export function buildNoteDraftState(note, defaults) {
  return {
    text: String(note?.text || ""),
    opacityDraft: note?.opacity ?? defaults.defaultOpacity,
    frostDraft: note?.frost ?? defaults.defaultFrost,
  };
}

/**
 * @param {{
 *   invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *   noteId: string;
 *   sortMode?: string;
 *   defaultOpacity: number;
 *   defaultFrost: number;
 *   tagSuggestionLimit?: number;
 * }} input
 */
export async function loadNoteWindowSnapshot(input) {
  const allNotes = normalizeNotesList(await input.invoke("load_notes", { sortMode: input.sortMode ?? "custom" }));
  const note = findNoteById(allNotes, input.noteId);
  const draft = note
    ? buildNoteDraftState(note, {
        defaultOpacity: input.defaultOpacity,
        defaultFrost: input.defaultFrost,
      })
    : {
        text: "",
        opacityDraft: input.defaultOpacity,
        frostDraft: input.defaultFrost,
      };

  return {
    note,
    tagSuggestions: collectTagSuggestionsFromNotes(allNotes, { limit: input.tagSuggestionLimit ?? 60 }),
    ...draft,
  };
}

/**
 * @param {{
 *   invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *   command: string;
 *   note: any;
 *   noteId: string;
 *   sortMode?: string;
 *   payload?: Record<string, any>;
 * }} input
 */
export async function invokeNoteCommand(input) {
  return input.invoke(input.command, {
    id: resolveNoteId(input.note, input.noteId),
    sortMode: input.sortMode ?? "custom",
    ...(input.payload || {}),
  });
}
