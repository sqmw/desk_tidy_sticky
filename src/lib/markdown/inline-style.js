/**
 * @param {string} value
 */
export function isSafeInlineColor(value) {
  const v = String(value ?? "").trim();
  return (
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    /^rgba?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}(\s*,\s*(0|0?\.\d+|1))?\s*\)$/.test(v) ||
    /^[a-zA-Z]{3,20}$/.test(v)
  );
}

/**
 * @param {string} raw
 */
function getSafeColorFromSpanAttributes(raw) {
  const attrs = String(raw ?? "");
  const styleMatch = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
  if (!styleMatch) return null;
  const styleRaw = styleMatch[2] ?? styleMatch[3] ?? "";
  for (const part of styleRaw.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (prop === "color" && isSafeInlineColor(value)) return value;
  }
  return null;
}

/**
 * @typedef {{ start: number; end: number; color: string }} InlineColorRange
 */

/**
 * @param {string} markdown
 * @returns {{ text: string; ranges: InlineColorRange[] }}
 */
export function parseMarkdownInlineStylesForEditing(markdown) {
  const ranges = /** @type {InlineColorRange[]} */ ([]);
  let text = "";
  let cursor = 0;
  const source = String(markdown ?? "");
  const pattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let match;

  while ((match = pattern.exec(source))) {
    const before = source.slice(cursor, match.index);
    text += before;
    const content = match[2] ?? "";
    const color = getSafeColorFromSpanAttributes(match[1] ?? "");
    if (!color) {
      text += match[0];
      cursor = match.index + match[0].length;
      continue;
    }
    const start = text.length;
    text += content;
    if (content.length > 0) {
      ranges.push({ start, end: text.length, color });
    }
    cursor = match.index + match[0].length;
  }

  text += source.slice(cursor);
  return { text, ranges };
}

/**
 * @param {InlineColorRange[]} ranges
 */
function normalizeInlineColorRanges(ranges) {
  return ranges
    .map((range) => ({
      start: Math.max(0, Number(range.start) || 0),
      end: Math.max(0, Number(range.end) || 0),
      color: String(range.color ?? "").trim(),
    }))
    .filter((range) => range.end > range.start && isSafeInlineColor(range.color))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * @param {string} text
 * @param {InlineColorRange[]} ranges
 */
export function serializeMarkdownInlineStylesFromEditing(text, ranges) {
  const source = String(text ?? "");
  const normalized = normalizeInlineColorRanges(ranges);
  let out = "";
  let cursor = 0;

  for (const range of normalized) {
    const start = Math.max(cursor, Math.min(range.start, source.length));
    const end = Math.max(start, Math.min(range.end, source.length));
    if (start >= end) continue;
    out += source.slice(cursor, start);
    const colored = source
      .slice(start, end)
      .split("\n")
      .map((line) => (line ? `<span style="color: ${range.color}">${line}</span>` : line))
      .join("\n");
    out += colored;
    cursor = end;
  }

  return `${out}${source.slice(cursor)}`;
}

/**
 * @param {InlineColorRange[]} ranges
 * @param {number} start
 * @param {number} end
 * @param {string} color
 * @param {number} textLength
 */
export function applyInlineColorRange(ranges, start, end, color, textLength) {
  const safeColor = String(color ?? "").trim();
  if (!isSafeInlineColor(safeColor)) return null;
  const from = Math.max(0, Math.min(Number(start) || 0, textLength));
  const to = Math.max(from, Math.min(Number(end) || 0, textLength));
  if (from === to) return null;

  const next = /** @type {InlineColorRange[]} */ ([]);
  for (const range of normalizeInlineColorRanges(ranges)) {
    if (range.end <= from || range.start >= to) {
      next.push(range);
      continue;
    }
    if (range.start < from) next.push({ start: range.start, end: from, color: range.color });
    if (range.end > to) next.push({ start: to, end: range.end, color: range.color });
  }
  next.push({ start: from, end: to, color: safeColor });
  return normalizeInlineColorRanges(next);
}

/**
 * @param {InlineColorRange[]} ranges
 * @param {string} previousText
 * @param {string} nextText
 */
export function adjustInlineColorRangesForTextChange(ranges, previousText, nextText) {
  const previous = String(previousText ?? "");
  const next = String(nextText ?? "");
  if (previous === next) return ranges;

  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < next.length - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldEditEnd = previous.length - suffix;
  const delta = next.length - previous.length;

  return normalizeInlineColorRanges(
    ranges.map((range) => {
      if (oldEditEnd <= range.start) {
        return { ...range, start: range.start + delta, end: range.end + delta };
      }
      if (prefix > range.end) return range;
      return {
        ...range,
        start: Math.min(range.start, prefix),
        end: Math.max(Math.min(next.length, range.end + delta), Math.min(range.start, prefix)),
      };
    }),
  );
}

/**
 * @param {string} markdown
 * @param {number} start
 * @param {number} end
 * @param {string} color
 */
export function wrapMarkdownSelectionWithColor(markdown, start, end, color) {
  const source = String(markdown ?? "");
  const safeColor = String(color ?? "").trim();
  if (!isSafeInlineColor(safeColor)) return null;

  const from = Math.max(0, Math.min(Number(start) || 0, source.length));
  const to = Math.max(from, Math.min(Number(end) || 0, source.length));
  if (from === to) return null;

  const selected = source.slice(from, to);
  const wrapped = selected
    .split("\n")
    .map((line) => (line ? `<span style="color: ${safeColor}">${line}</span>` : line))
    .join("\n");

  return {
    markdown: `${source.slice(0, from)}${wrapped}${source.slice(to)}`,
    selectionStart: from,
    selectionEnd: from + wrapped.length,
  };
}
