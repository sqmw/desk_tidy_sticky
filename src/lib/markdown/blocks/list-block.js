import { parseTaskLine } from "$lib/markdown/task-list.js";

/**
 * @typedef {"bullet" | "ordered"} MarkdownListKind
 */

/**
 * @typedef {{ kind: MarkdownListKind; content: string; marker?: string; number?: number }} MarkdownListMarker
 */

/**
 * @typedef {{ marker: MarkdownListMarker; lines: string[] }} MarkdownListItem
 */

/** @param {string} line */
export function parseMarkdownListMarker(line) {
  const source = String(line ?? "");
  if (parseTaskLine(source)) return null;

  const bullet = /^ {0,3}([-*])\s+(.*)$/.exec(source);
  if (bullet) {
    return /** @type {MarkdownListMarker} */ ({
      kind: "bullet",
      marker: bullet[1],
      content: bullet[2] ?? "",
    });
  }

  const ordered = /^ {0,3}(\d+)\.\s+(.*)$/.exec(source);
  if (ordered) {
    return /** @type {MarkdownListMarker} */ ({
      kind: "ordered",
      number: Number(ordered[1]),
      content: ordered[2] ?? "",
    });
  }

  return null;
}

/** @param {string} line */
export function isBulletListLine(line) {
  return parseMarkdownListMarker(line)?.kind === "bullet";
}

/** @param {string} line */
export function isOrderedListLine(line) {
  return parseMarkdownListMarker(line)?.kind === "ordered";
}

/**
 * @param {string} line
 * @param {MarkdownListKind} kind
 */
export function isListBlockLine(line, kind) {
  const source = String(line ?? "");
  if (source === "") return false;
  if (source.trim() === "") return true;
  const marker = parseMarkdownListMarker(source);
  return !marker || marker.kind === kind;
}

/**
 * @param {string[]} lines
 * @param {MarkdownListKind} kind
 * @returns {MarkdownListItem[]}
 */
export function collectMarkdownListItems(lines, kind) {
  /** @type {MarkdownListItem[]} */
  const items = [];

  for (const line of lines) {
    const marker = parseMarkdownListMarker(line);
    if (marker?.kind === kind) {
      items.push({ marker, lines: [marker.content] });
      continue;
    }
    if (items.length === 0) {
      items.push({ marker: { kind, content: "" }, lines: [line] });
      continue;
    }
    items[items.length - 1].lines.push(line);
  }

  return items;
}
