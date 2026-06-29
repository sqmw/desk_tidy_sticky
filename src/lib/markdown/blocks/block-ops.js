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

/**
 * @param {string} noteText
 * @param {{ endLine: number }} block
 * @param {string} nextMarkdown
 */
export function insertBlockAfter(noteText, block, nextMarkdown = "") {
  const lines = splitMarkdownLines(noteText);
  const insertAt = Math.max(0, Math.min(Number(block.endLine) + 1 || 0, lines.length));
  const nextLines = splitMarkdownLines(nextMarkdown);
  lines.splice(insertAt, 0, ...nextLines);
  return {
    text: lines.join("\n"),
    startLine: insertAt,
  };
}

/**
 * @param {string} noteText
 * @param {{ startLine: number; endLine: number }} block
 */
export function removeBlockMarkdown(noteText, block) {
  const lines = splitMarkdownLines(noteText);
  const startLine = Math.max(0, Math.min(Number(block.startLine) || 0, lines.length));
  const endLine = Math.max(startLine, Math.min(Number(block.endLine) || startLine, lines.length - 1));
  lines.splice(startLine, endLine - startLine + 1);
  return lines.length > 0 ? lines.join("\n") : "";
}

/**
 * @param {string} noteText
 * @param {{ startLine: number; endLine: number; markdown: string }} previousBlock
 * @param {{ startLine: number; endLine: number }} currentBlock
 * @param {string} currentMarkdown
 */
export function mergeBlockIntoPreviousMarkdown(noteText, previousBlock, currentBlock, currentMarkdown) {
  const lines = splitMarkdownLines(noteText);
  const startLine = Math.max(0, Math.min(Number(previousBlock.startLine) || 0, lines.length));
  const endLine = Math.max(startLine, Math.min(Number(currentBlock.endLine) || startLine, lines.length - 1));
  const previousMarkdown = String(previousBlock.markdown ?? "");
  const mergedMarkdown = `${previousMarkdown}${String(currentMarkdown ?? "")}`;
  const mergedLines = splitMarkdownLines(mergedMarkdown);
  lines.splice(startLine, endLine - startLine + 1, ...mergedLines);
  return {
    text: lines.join("\n"),
    startLine,
    caretOffset: previousMarkdown.length,
  };
}

/**
 * @param {string} noteText
 * @param {{ startLine: number; endLine: number }} block
 * @param {string} currentMarkdown
 * @param {string} nextMarkdown
 */
export function splitBlockMarkdown(noteText, block, currentMarkdown, nextMarkdown = "") {
  const lines = splitMarkdownLines(noteText);
  const startLine = Math.max(0, Math.min(Number(block.startLine) || 0, lines.length));
  const endLine = Math.max(startLine, Math.min(Number(block.endLine) || startLine, lines.length - 1));
  const currentLines = splitMarkdownLines(currentMarkdown);
  const nextLines = splitMarkdownLines(nextMarkdown);
  const nextStartLine = startLine + currentLines.length;
  lines.splice(startLine, endLine - startLine + 1, ...currentLines, ...nextLines);
  return {
    text: lines.join("\n"),
    nextStartLine,
  };
}
