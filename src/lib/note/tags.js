/**
 * Tags are user-facing labels attached to notes. They are stored without leading `#`
 * and should be compared case-insensitively.
 */

/**
 * Normalize a tag's display text.
 * - trims whitespace
 * - strips leading `#`
 * - caps length (UI/editor contract)
 *
 * @param {unknown} raw
 * @param {{ maxLen?: number } | undefined} [options]
 */
export function normalizeTagText(raw, options) {
  const maxLen = options?.maxLen ?? 32;
  const trimmed = String(raw || "").trim().replace(/^#+/, "").trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLen);
}

/**
 * Normalize a tag for equality checks.
 *
 * @param {unknown} raw
 * @param {{ maxLen?: number } | undefined} [options]
 */
export function normalizeTagKey(raw, options) {
  return normalizeTagText(raw, options).toLocaleLowerCase();
}

/**
 * Collect unique tag texts from a list of notes.
 *
 * @param {any[]} notes
 * @param {{ limit?: number; sort?: boolean; maxLen?: number } | undefined} [options]
 * @returns {string[]}
 */
export function collectTagSuggestionsFromNotes(notes, options) {
  const limit = options?.limit ?? 60;
  const sort = options?.sort ?? false;
  const maxLen = options?.maxLen;

  /** @type {Map<string, string>} */
  const unique = new Map();
  for (const note of Array.isArray(notes) ? notes : []) {
    if (!Array.isArray(note?.tags)) continue;
    for (const rawTag of /** @type {any[]} */ (note.tags)) {
      const text = normalizeTagText(rawTag, { maxLen });
      const key = normalizeTagKey(text, { maxLen });
      if (!key || unique.has(key)) continue;
      unique.set(key, text);
    }
  }

  const values = [...unique.values()];
  if (sort) values.sort((a, b) => a.localeCompare(b));
  return values.slice(0, limit);
}

