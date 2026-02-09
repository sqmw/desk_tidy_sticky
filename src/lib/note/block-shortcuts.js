import { BLOCK_TYPE } from "$lib/note/block-model.js";

/**
 * @typedef {{
 *   nextType: string;
 *   nextText: string;
 *   checked?: boolean;
 *   caret: number;
 * }} BlockShortcutResult
 */

/**
 * Parse Notion-like markdown shortcut from current block input.
 * Shortcut only applies when the whole block equals the trigger token.
 *
 * @param {{ currentType: string; text: string; selectionStart: number; selectionEnd: number }} input
 * @returns {BlockShortcutResult | null}
 */
export function matchBlockShortcut(input) {
  const text = String(input.text ?? "");
  if (input.selectionStart !== input.selectionEnd) return null;
  if (input.currentType !== BLOCK_TYPE.PARAGRAPH) return null;
  if (input.selectionStart !== text.length) return null;

  if (/^###\s$/.test(text)) return { nextType: BLOCK_TYPE.HEADING3, nextText: "", caret: 0 };
  if (/^##\s$/.test(text)) return { nextType: BLOCK_TYPE.HEADING2, nextText: "", caret: 0 };
  if (/^#\s$/.test(text)) return { nextType: BLOCK_TYPE.HEADING1, nextText: "", caret: 0 };
  if (/^[-*]\s$/.test(text)) return { nextType: BLOCK_TYPE.BULLET, nextText: "", caret: 0 };
  if (/^>\s$/.test(text)) return { nextType: BLOCK_TYPE.QUOTE, nextText: "", caret: 0 };
  if (/^\[\s\]\s$/.test(text) || /^\[\]\s$/.test(text)) {
    return { nextType: BLOCK_TYPE.TODO, nextText: "", checked: false, caret: 0 };
  }
  if (/^\[(x|X)\]\s$/.test(text)) {
    return { nextType: BLOCK_TYPE.TODO, nextText: "", checked: true, caret: 0 };
  }
  if (/^```(?:[a-zA-Z0-9_-]+)?\s$/.test(text)) {
    return { nextType: BLOCK_TYPE.CODE, nextText: "", caret: 0 };
  }
  return null;
}
