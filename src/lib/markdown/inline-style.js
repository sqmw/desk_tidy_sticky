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
