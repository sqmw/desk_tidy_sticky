import { splitMarkdownLines } from "$lib/markdown/task-list.js";

/**
 * @param {string} noteText
 * @param {{ startLine: number; endLine: number }} block
 * @param {string} nextMarkdown
 */
export function replaceBlockMarkdown(noteText, block, nextMarkdown) {
  const lines = splitMarkdownLines(noteText);
  const startLine = Math.max(0, Math.min(Number(block.startLine) || 0, lines.length));
  const endLine = Math.max(startLine, Math.min(Number(block.endLine) || startLine, lines.length - 1));
  const nextLines = splitMarkdownLines(nextMarkdown);
  lines.splice(startLine, endLine - startLine + 1, ...nextLines);
  return lines.join("\n");
}

/**
 * @param {string} noteText
 * @param {{ startLine: number; endLine: number; markdown: string }} block
 */
export function blockRangeMatches(noteText, block) {
  const lines = splitMarkdownLines(noteText);
  const current = lines.slice(block.startLine, block.endLine + 1).join("\n");
  return current === block.markdown;
}
