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
 * @param {string} value
 */
function isSafeColor(value) {
  const v = value.trim();
  return (
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    /^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}(\s*,\s*(0|0?\.\d+|1))?\s*\)$/.test(v) ||
    /^[a-zA-Z]{3,20}$/.test(v)
  );
}

/**
 * @param {string} value
 */
function isSafeFontSize(value) {
  return /^(?:\d+(?:\.\d+)?)(px|rem|em|%)$/.test(value.trim());
}

/**
 * @param {string} value
 */
function isSafeLineHeight(value) {
  const v = value.trim();
  return /^(normal|\d+(?:\.\d+)?|\d+(?:\.\d+)?(px|rem|em|%))$/.test(v);
}

/**
 * @param {string} raw
 * @param {{ allowRelative?: boolean; allowDataImage?: boolean }} [options]
 */
function isSafeUrl(raw, options = {}) {
  const value = String(raw ?? "").trim();
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:")) return false;
  if (options.allowDataImage && /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/.test(value)) {
    return true;
  }
  if (/^https?:\/\/[^\s]+$/i.test(value)) return true;
  if (/^asset:\/\/[^\s]+$/i.test(value)) return true;
  if (options.allowRelative && /^(?:\/|\.\/|\.\.\/|[a-zA-Z0-9._-]+\/)[^\s]*$/.test(value)) return true;
  return false;
}

/**
 * @param {string} raw
 */
function parseImageSizeValue(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return null;
  if (/^\d+(?:\.\d+)?%$/.test(value)) {
    const n = Number.parseFloat(value);
    if (n > 0 && n <= 100) return `${n}%`;
    return null;
  }
  if (/^\d+(?:\.\d+)?(px)?$/.test(value)) {
    const n = Number.parseFloat(value);
    if (n > 0 && n <= 4096) return `${n}px`;
    return null;
  }
  return null;
}

/**
 * @param {string | undefined} raw
 */
function parseImageMeta(raw) {
  if (!raw) return { width: null, height: null };
  let width = null;
  let height = null;
  const pairs = String(raw)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim().toLowerCase();
    const value = parseImageSizeValue(pair.slice(idx + 1));
    if (!value) continue;
    if (key === "w" || key === "width") width = value;
    if (key === "h" || key === "height") height = value;
  }
  return { width, height };
}

/**
 * @param {{ alt: string; src: string; title?: string; meta?: string }} options
 */
function buildImageTag(options) {
  const safeAlt = escapeHtml(options.alt ?? "");
  const safeSrc = escapeHtml(options.src ?? "");
  const titleAttr = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const meta = parseImageMeta(options.meta);
  let styleAttr = "";
  if (meta.width || meta.height) {
    const styles = [];
    if (meta.width) styles.push(`width: ${meta.width}`);
    if (meta.height) styles.push(`height: ${meta.height}`);
    styleAttr = ` style="${escapeHtml(styles.join("; "))}"`;
  }
  return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy"${titleAttr}${styleAttr} />`;
}

/**
 * @param {string} raw
 */
function sanitizeSpanAttributes(raw) {
  const attrs = String(raw ?? "");
  const classMatch = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
  const styleMatch = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
  let classAttr = "";
  let styleAttr = "";

  if (classMatch) {
    const classRaw = (classMatch[2] ?? classMatch[3] ?? "")
      .split(/\s+/)
      .filter((c) => /^[a-zA-Z0-9_-]{1,32}$/.test(c))
      .join(" ")
      .trim();
    if (classRaw) {
      classAttr = ` class="${escapeHtml(classRaw)}"`;
    }
  }

  if (styleMatch) {
    const styleRaw = styleMatch[2] ?? styleMatch[3] ?? "";
    /** @type {string[]} */
    const safePairs = [];
    for (const part of styleRaw.split(";")) {
      const idx = part.indexOf(":");
      if (idx < 0) continue;
      let prop = part.slice(0, idx).trim().toLowerCase();
      const value = part.slice(idx + 1).trim();
      if (!value) continue;
      // tolerate common typos and common alias for better UX
      if (prop === "backgroud") prop = "background";
      if (prop === "background") prop = "background-color";
      if ((prop === "color" || prop === "background-color") && isSafeColor(value)) {
        safePairs.push(`${prop}: ${value}`);
        continue;
      }
      if (prop === "font-weight" && /^(normal|bold|[1-9]00)$/.test(value)) {
        safePairs.push(`${prop}: ${value}`);
        continue;
      }
      if (prop === "font-style" && /^(normal|italic|oblique)$/.test(value)) {
        safePairs.push(`${prop}: ${value}`);
        continue;
      }
      if (prop === "text-decoration" && /^(none|underline|line-through|overline)$/.test(value)) {
        safePairs.push(`${prop}: ${value}`);
        continue;
      }
      if (prop === "font-size" && isSafeFontSize(value)) {
        safePairs.push(`${prop}: ${value}`);
        continue;
      }
      if (prop === "line-height" && isSafeLineHeight(value)) {
        safePairs.push(`${prop}: ${value}`);
      }
    }
    if (safePairs.length > 0) {
      styleAttr = ` style="${escapeHtml(safePairs.join("; "))}"`;
    }
  }

  return `${classAttr}${styleAttr}`;
}

/**
 * @param {string} inline
 */
function extractSafeSpanTokens(inline) {
  /** @type {Map<string, string>} */
  const tokenMap = new Map();
  let idx = 0;
  const masked = String(inline ?? "").replace(
    /<span\b([^>]*)>([\s\S]*?)<\/span>/gi,
    (_all, rawAttrs, rawContent) => {
      const attrs = sanitizeSpanAttributes(rawAttrs);
      const content = renderInlineCore(rawContent, false);
      const token = `@@SPAN_TOKEN_${idx}@@`;
      idx += 1;
      tokenMap.set(token, `<span${attrs}>${content}</span>`);
      return token;
    },
  );
  return { masked, tokenMap };
}

/**
 * @param {string} inline
 * @param {boolean} allowSafeSpan
 */
function renderInlineCore(inline, allowSafeSpan) {
  let out = String(inline ?? "");
  /** @type {Map<string, string>} */
  let tokenMap = new Map();
  if (allowSafeSpan) {
    const extracted = extractSafeSpanTokens(out);
    out = extracted.masked;
    tokenMap = extracted.tokenMap;
  }
  out = escapeHtml(out);
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)(?:\{([^}]*)\})?/g,
    (_all, alt, src, title, meta) => {
    if (!isSafeUrl(src, { allowRelative: true, allowDataImage: true })) return _all;
      return buildImageTag({ alt, src, title, meta });
    },
  );
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  out = out.replace(/(?<!["'(>])(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  for (const [token, html] of tokenMap.entries()) {
    out = out.replaceAll(token, html);
  }
  return out;
}

/**
 * @param {string} inline
 */
function renderInline(inline) {
  return renderInlineCore(inline, true);
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

    const image = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?\s*$/.exec(line);
    if (image) {
      if (!isSafeUrl(image[2], { allowRelative: true, allowDataImage: true })) {
        chunks.push(`<p>${renderInline(line)}</p>`);
        i += 1;
        continue;
      }
      chunks.push(`<p>${buildImageTag({ alt: image[1], src: image[2], title: image[3], meta: image[4] })}</p>`);
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
