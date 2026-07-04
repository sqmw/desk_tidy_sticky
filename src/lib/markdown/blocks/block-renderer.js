import {
  buildImageTag,
  escapeHtml,
  isSafeUrl,
  renderInline,
  tryRenderTable,
  tryRenderTaskList,
} from "$lib/markdown/renderer.js";
import { collectMarkdownListItems } from "$lib/markdown/blocks/list-block.js";

/**
 * @param {string[]} lines
 * @param {"bullet" | "ordered"} kind
 */
function renderListBlock(lines, kind) {
  const items = collectMarkdownListItems(lines, kind);
  const body = items
    .map((item) => `<li>${item.lines.map((part) => (part.trim() === "" ? "" : renderInline(part))).join("<br/>")}</li>`)
    .join("");

  if (kind === "ordered") {
    const start = items[0]?.marker.number;
    const startAttr = Number.isFinite(start) && start !== 1 ? ` start="${start}"` : "";
    return `<ol${startAttr}>${body}</ol>`;
  }

  return `<ul>${body}</ul>`;
}

/**
 * @param {import("./block-parser.js").MarkdownBlock} block
 * @param {{ interactiveTasks: boolean }} options
 */
function renderBlock(block, options) {
  const lines = block.rawLines;
  const line = lines[0] ?? "";

  if (block.type === "hr") return "<hr/>";

  if (block.type === "table") {
    return tryRenderTable(lines, 0)?.html ?? `<p>${lines.map((p) => renderInline(p)).join("<br/>")}</p>`;
  }

  if (block.type === "task_block") {
    return tryRenderTaskList(lines, 0, { ...options, lineOffset: block.startLine })?.html ?? "";
  }

  if (block.type === "heading") {
    const heading = /^ {0,3}(#{1,6})\s+(.*)$/.exec(line);
    if (!heading) return `<p>${renderInline(line)}</p>`;
    const level = heading[1].length;
    return `<h${level}>${renderInline(heading[2])}</h${level}>`;
  }

  if (block.type === "image") {
    const image = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?\s*$/.exec(line);
    if (!image || !isSafeUrl(image[2], { allowRelative: true, allowDataImage: true })) {
      return `<p>${renderInline(line)}</p>`;
    }
    return `<p>${buildImageTag({ alt: image[1], src: image[2], title: image[3], meta: image[4] })}</p>`;
  }

  if (block.type === "blockquote") {
    return lines.map((item) => `<blockquote>${renderInline(item.replace(/^>\s+/, ""))}</blockquote>`).join("\n");
  }

  if (block.type === "bullet_list") {
    return renderListBlock(lines, "bullet");
  }

  if (block.type === "ordered_list") {
    return renderListBlock(lines, "ordered");
  }

  if (block.type === "code_block") {
    const codeLines = [...lines];
    if (codeLines.length > 0 && /^```/.test(codeLines[0])) codeLines.shift();
    if (codeLines.length > 0 && /^```/.test(codeLines[codeLines.length - 1])) codeLines.pop();
    return `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
  }

  return `<p>${lines.map((p) => renderInline(p)).join("<br/>")}</p>`;
}

/**
 * @param {import("./block-parser.js").MarkdownBlock[]} blocks
 * @param {{ interactiveTasks?: boolean }} [options]
 */
export function renderMarkdownBlocks(blocks, options = {}) {
  const renderOptions = { interactiveTasks: !!options.interactiveTasks };
  return blocks.map((block) => renderBlock(block, renderOptions)).join("\n");
}
