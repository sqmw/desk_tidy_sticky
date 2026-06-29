import { parseMarkdownBlocks } from "$lib/markdown/blocks/block-parser.js";
import { renderMarkdownBlocks } from "$lib/markdown/blocks/block-renderer.js";
import { expandNoteCommands } from "$lib/markdown/command-expander.js";

/**
 * @param {string} input
 * @param {{ interactiveTasks?: boolean }} [options]
 */
export function renderNoteMarkdown(input, options = {}) {
  const text = expandNoteCommands(input ?? "");
  return renderMarkdownBlocks(parseMarkdownBlocks(text), { interactiveTasks: !!options.interactiveTasks });
}
