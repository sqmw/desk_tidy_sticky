/**
 * Lightweight markdown + command expansion for sticky notes.
 * Keeps rendering safe by escaping HTML first, then applying controlled transforms.
 */

/**
 * @param {string} text
 * @param {Date} [now]
 */
export function expandNoteCommands(text, now = new Date()) {
  let next = String(text ?? "");

  // @time -> local timestamp once at save/render time.
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  next = next.replace(/(^|\s)@time(?=\s|$)/g, `$1${timestamp}`);

  // @table CxR -> markdown table with C columns and R body rows.
  next = next.replace(/(^|\s)@table\s+(\d+)\s*[xX]\s*(\d+)(?=\s|$)/g, (_m, lead, c, r) => {
    const cols = Math.max(1, Math.min(10, Number(c) || 1));
    const rows = Math.max(1, Math.min(30, Number(r) || 1));
    const header = `| ${Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(" | ")} |`;
    const split = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const bodyLine = `| ${Array.from({ length: cols }, () => " ").join(" | ")} |`;
    const body = Array.from({ length: rows }, () => bodyLine).join("\n");
    return `${lead}${header}\n${split}\n${body}`;
  });

  return next;
}

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

    const table = tryRenderTable(lines, i);
    if (table) {
      chunks.push(table.html);
      i = table.nextIndex;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      chunks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
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

    // Paragraph block
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s+|>\s+|[-*]\s+|\d+\.\s+|```)/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    chunks.push(`<p>${para.map((p) => renderInline(p)).join("<br/>")}</p>`);
  }

  return chunks.join("\n");
}
