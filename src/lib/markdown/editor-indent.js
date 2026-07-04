const DEFAULT_INDENT = "  ";

/**
 * @param {string} text
 * @param {number} offset
 */
function lineStartAt(text, offset) {
  return String(text ?? "").lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
}

/**
 * @param {string} text
 * @param {number} selectionStart
 * @param {number} selectionEnd
 */
function getSelectedLineStarts(text, selectionStart, selectionEnd) {
  const source = String(text ?? "");
  const start = Math.max(0, Math.min(Number(selectionStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selectionEnd) || start, source.length));
  const lastOffset = end > start ? end - 1 : start;
  const firstLineStart = lineStartAt(source, start);
  const lastLineStart = lineStartAt(source, lastOffset);
  const starts = [];
  let cursor = firstLineStart;
  while (cursor <= lastLineStart) {
    starts.push(cursor);
    const nextNewline = source.indexOf("\n", cursor);
    if (nextNewline < 0) break;
    cursor = nextNewline + 1;
  }
  return starts;
}

/**
 * @param {string} text
 * @param {number} selectionStart
 * @param {number} selectionEnd
 * @param {{ indent?: string; outdent?: boolean }} [options]
 */
export function applyLineIndentToText(text, selectionStart, selectionEnd, options = {}) {
  const source = String(text ?? "");
  const indent = String(options.indent || DEFAULT_INDENT);
  const start = Math.max(0, Math.min(Number(selectionStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selectionEnd) || start, source.length));
  const lineStarts = getSelectedLineStarts(source, start, end);

  if (options.outdent) {
    /** @type {Array<{ lineStart: number; length: number }>} */
    const removals = [];
    for (const lineStart of lineStarts) {
      if (source.startsWith(indent, lineStart)) {
        removals.push({ lineStart, length: indent.length });
      } else if (source[lineStart] === "\t" || source[lineStart] === " ") {
        removals.push({ lineStart, length: 1 });
      }
    }
    if (removals.length === 0) {
      return { text: source, selectionStart: start, selectionEnd: end };
    }
    let next = source;
    for (const removal of [...removals].reverse()) {
      next = `${next.slice(0, removal.lineStart)}${next.slice(removal.lineStart + removal.length)}`;
    }
    /** @param {number} pos */
    const shiftPosition = (pos) =>
      removals.reduce((value, removal) => value - (removal.lineStart < pos ? removal.length : 0), pos);
    return {
      text: next,
      selectionStart: shiftPosition(start),
      selectionEnd: Math.max(shiftPosition(start), shiftPosition(end)),
    };
  }

  let next = source;
  for (const lineStart of [...lineStarts].reverse()) {
    next = `${next.slice(0, lineStart)}${indent}${next.slice(lineStart)}`;
  }
  /** @param {number} pos */
  const shiftPosition = (pos) =>
    lineStarts.reduce((value, lineStart) => value + (lineStart <= pos ? indent.length : 0), pos);
  return {
    text: next,
    selectionStart: shiftPosition(start),
    selectionEnd: Math.max(shiftPosition(start), shiftPosition(end)),
  };
}
