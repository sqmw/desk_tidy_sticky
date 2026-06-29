import { splitMarkdownLines, parseTaskLine } from "$lib/markdown/task-list.js";
import { tryRenderTable } from "$lib/markdown/renderer.js";

/**
 * @typedef {"paragraph" | "heading" | "task_block" | "bullet_list" | "ordered_list" | "blockquote" | "code_block" | "table" | "image" | "hr"} MarkdownBlockType
 */

/**
 * @typedef {object} MarkdownBlock
 * @property {string} id
 * @property {MarkdownBlockType} type
 * @property {number} startLine
 * @property {number} endLine
 * @property {string[]} rawLines
 * @property {string} markdown
 * @property {boolean} editable
 */

/**
 * @param {MarkdownBlockType} type
 * @param {number} startLine
 * @param {number} endLine
 * @param {string[]} rawLines
 * @returns {MarkdownBlock}
 */
function createBlock(type, startLine, endLine, rawLines) {
  const markdown = rawLines.join("\n");
  return {
    id: `${type}:${startLine}:${endLine}:${hashMarkdown(markdown)}`,
    type,
    startLine,
    endLine,
    rawLines,
    markdown,
    editable: type !== "hr",
  };
}

/**
 * @param {string} text
 */
function hashMarkdown(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * @param {string} line
 */
function isBulletLine(line) {
  return /^[-*]\s+/.test(line) && !parseTaskLine(line);
}

/**
 * @param {string} text
 * @param {{ preserveBlankBlocks?: boolean }} [options]
 * @returns {MarkdownBlock[]}
 */
export function parseMarkdownBlocks(text, options = {}) {
  if (String(text ?? "") === "") return [];

  const lines = splitMarkdownLines(text);
  /** @type {MarkdownBlock[]} */
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line === "") {
      if (options.preserveBlankBlocks) {
        blocks.push(createBlock("paragraph", i, i, [line]));
      }
      i += 1;
      continue;
    }

    const startLine = i;

    if (!line.trim()) {
      blocks.push(createBlock("paragraph", startLine, i, [line]));
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push(createBlock("hr", startLine, i, [line]));
      i += 1;
      continue;
    }

    const table = tryRenderTable(lines, i);
    if (table) {
      const endLine = table.nextIndex - 1;
      blocks.push(createBlock("table", startLine, endLine, lines.slice(startLine, table.nextIndex)));
      i = table.nextIndex;
      continue;
    }

    if (parseTaskLine(line)) {
      while (i < lines.length && parseTaskLine(lines[i])) {
        i += 1;
      }
      blocks.push(createBlock("task_block", startLine, i - 1, lines.slice(startLine, i)));
      continue;
    }

    if (/^(#{1,6})\s+(.*)$/.test(line)) {
      blocks.push(createBlock("heading", startLine, i, [line]));
      i += 1;
      continue;
    }

    if (/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?\s*$/.test(line)) {
      blocks.push(createBlock("image", startLine, i, [line]));
      i += 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        i += 1;
      }
      blocks.push(createBlock("blockquote", startLine, i - 1, lines.slice(startLine, i)));
      continue;
    }

    if (isBulletLine(line)) {
      while (i < lines.length && isBulletLine(lines[i])) {
        i += 1;
      }
      blocks.push(createBlock("bullet_list", startLine, i - 1, lines.slice(startLine, i)));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        i += 1;
      }
      blocks.push(createBlock("ordered_list", startLine, i - 1, lines.slice(startLine, i)));
      continue;
    }

    if (/^```/.test(line)) {
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(createBlock("code_block", startLine, i - 1, lines.slice(startLine, i)));
      continue;
    }

    blocks.push(createBlock("paragraph", startLine, i, [line]));
    i += 1;
  }

  return blocks;
}
