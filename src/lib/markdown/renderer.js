import { expandNoteCommands } from "$lib/markdown/command-expander.js";

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {string} inline
 */
function renderInline(inline) {
  let out = escapeHtml(inline);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(/(?<!["'(>])(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

/**
 * @param {string[]} lines
 * @param {number} i
 */
function tryRenderTable(lines, i) {
  const header = lines[i] ?? "";
  const splitter = lines[i + 1] ?? "";
  if (!header.includes("|")) return null;
  if (!/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(splitter)) return null;

  /** @param {string} line */
  const sliceRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((/** @type {string} */ x) => x.trim());

  const headerCells = sliceRow(header);
  if (headerCells.length === 0) return null;

  /** @type {string[]} */
  const bodyRows = [];
  let cursor = i + 2;
  while (cursor < lines.length && lines[cursor].includes("|") && lines[cursor].trim()) {
    bodyRows.push(lines[cursor]);
    cursor += 1;
  }

  const thead = `<thead><tr>${headerCells.map((/** @type {string} */ c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map((row) => {
      const cols = sliceRow(row);
      return `<tr>${headerCells
        .map((/** @type {string} */ _, /** @type {number} */ idx) => `<td>${renderInline(cols[idx] ?? "")}</td>`)
        .join("")}</tr>`;
    })
    .join("")}</tbody>`;

  return {
    html: `<table>${thead}${tbody}</table>`,
    nextIndex: cursor,
  };
}

/**
 * @param {string[]} lines
 * @param {number} i
 */
function tryRenderTaskList(lines, i) {
  if (!/^[-*]\s+\[( |x|X)\]\s+/.test(lines[i] ?? "")) return null;
  /** @type {string[]} */
  const items = [];
  let cursor = i;
  while (cursor < lines.length && /^[-*]\s+\[( |x|X)\]\s+/.test(lines[cursor])) {
    const m = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(lines[cursor]);
    if (m) {
      const checked = m[1].toLowerCase() === "x";
      const content = renderInline(m[2]);
      items.push(
        `<li class="task-item"><input type="checkbox" disabled ${checked ? "checked" : ""}/> <span>${content}</span></li>`,
      );
    }
    cursor += 1;
  }
  return {
    html: `<ul class="task-list">${items.join("")}</ul>`,
    nextIndex: cursor,
  };
}

/**
 * @param {string} input
 */
export function renderNoteMarkdown(input) {
  const text = expandNoteCommands(input ?? "");
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  /** @type {string[]} */
  const chunks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      chunks.push("<hr/>");
      i += 1;
      continue;
    }

    const table = tryRenderTable(lines, i);
    if (table) {
      chunks.push(table.html);
      i = table.nextIndex;
      continue;
    }

    const taskList = tryRenderTaskList(lines, i);
    if (taskList) {
      chunks.push(taskList.html);
      i = taskList.nextIndex;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      chunks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    const image = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\s*$/.exec(line);
    if (image) {
      chunks.push(
        `<p><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" loading="lazy" /></p>`,
      );
      i += 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      chunks.push(`<blockquote>${renderInline(line.replace(/^>\s+/, ""))}</blockquote>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      /** @type {string[]} */
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      chunks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      /** @type {string[]} */
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      chunks.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^```/.test(line)) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      chunks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s+|>\s+|[-*]\s+|\d+\.\s+|```|!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)|(-{3,}|\*{3,}|_{3,})\s*$)/.test(
        lines[i],
      )
    ) {
      para.push(lines[i]);
      i += 1;
    }
    chunks.push(`<p>${para.map((p) => renderInline(p)).join("<br/>")}</p>`);
  }

  return chunks.join("\n");
}
