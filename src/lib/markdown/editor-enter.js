const DEFAULT_INDENT = "  ";

/**
 * @typedef {"bullet" | "numeric" | "alpha" | "task"} EditorListMarkerKind
 */

/**
 * @typedef {object} EditorListMarker
 * @property {EditorListMarkerKind} kind
 * @property {string} indent
 * @property {string} marker
 * @property {string} content
 * @property {string} line
 */

/**
 * @param {string} text
 * @param {number} offset
 */
function lineStartAt(text, offset) {
  return String(text ?? "").lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
}

/**
 * @param {string} text
 * @param {number} offset
 */
function lineEndAt(text, offset) {
  const end = String(text ?? "").indexOf("\n", Math.max(0, offset));
  return end < 0 ? String(text ?? "").length : end;
}

/**
 * @param {string} line
 * @returns {EditorListMarker | null}
 */
export function parseEditorListMarker(line) {
  const source = String(line ?? "");

  const task = /^(\s*)([-*])\s+\[( |x|X)\](?:\s*(.*))?$/.exec(source);
  if (task) {
    return {
      kind: "task",
      indent: task[1] ?? "",
      marker: `${task[2] ?? "-"} [ ]`,
      content: task[4] ?? "",
      line: source,
    };
  }

  const bullet = /^(\s*)([-*])\s+(.*)$/.exec(source);
  if (bullet) {
    return {
      kind: "bullet",
      indent: bullet[1] ?? "",
      marker: bullet[2] ?? "-",
      content: bullet[3] ?? "",
      line: source,
    };
  }

  const numeric = /^(\s*)(\d+)\.\s*(.*)$/.exec(source);
  if (numeric) {
    return {
      kind: "numeric",
      indent: numeric[1] ?? "",
      marker: `${numeric[2] ?? "1"}.`,
      content: numeric[3] ?? "",
      line: source,
    };
  }

  const alpha = /^(\s*)([A-Za-z]+)\.\s*(.*)$/.exec(source);
  if (alpha) {
    return {
      kind: "alpha",
      indent: alpha[1] ?? "",
      marker: `${alpha[2] ?? "a"}.`,
      content: alpha[3] ?? "",
      line: source,
    };
  }

  return null;
}

/** @param {string} marker */
function nextNumericMarker(marker) {
  const number = Number.parseInt(String(marker ?? "").replace(/\D+/g, ""), 10);
  return `${Math.max(1, Number.isFinite(number) ? number + 1 : 1)}.`;
}

/** @param {string} marker */
function nextAlphaMarker(marker) {
  const source = String(marker ?? "a").replace(/[^A-Za-z]/g, "") || "a";
  const upper = source[0] === source[0]?.toUpperCase();
  let carry = 1;
  const chars = source.toLowerCase().split("");

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const code = chars[index].charCodeAt(0) - 97 + carry;
    if (code >= 26) {
      chars[index] = "a";
      carry = 1;
    } else {
      chars[index] = String.fromCharCode(97 + code);
      carry = 0;
      break;
    }
  }

  if (carry) chars.unshift("a");
  const next = chars.join("");
  return `${upper ? next.toUpperCase() : next}.`;
}

/**
 * @param {EditorListMarker} marker
 */
function nextMarkerFor(marker) {
  switch (marker.kind) {
    case "numeric":
      return nextNumericMarker(marker.marker);
    case "alpha":
      return nextAlphaMarker(marker.marker);
    case "task":
      return marker.marker;
    case "bullet":
    default:
      return marker.marker;
  }
}

/**
 * @param {string[]} lines
 * @param {number} currentLineIndex
 * @param {string} currentIndent
 */
function findParentMarker(lines, currentLineIndex, currentIndent) {
  for (let index = currentLineIndex - 1; index >= 0; index -= 1) {
    const marker = parseEditorListMarker(lines[index]);
    if (!marker) continue;
    if (marker.indent.length < currentIndent.length) return marker;
  }
  return null;
}

/**
 * @param {string} text
 * @param {number} selectionStart
 * @param {number} selectionEnd
 * @param {{ indent?: string }} [options]
 */
export function applyListEnterContinuation(text, selectionStart, selectionEnd, options = {}) {
  const source = String(text ?? "");
  const start = Math.max(0, Math.min(Number(selectionStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selectionEnd) || start, source.length));
  if (start !== end) return null;

  const lineStart = lineStartAt(source, start);
  const lineEnd = lineEndAt(source, start);
  const line = source.slice(lineStart, lineEnd);
  const marker = parseEditorListMarker(line);
  if (!marker) return null;

  const cursorInLine = start - lineStart;
  const markerPrefix = `${marker.indent}${marker.marker}`;
  const contentStart = markerPrefix.length + (line[markerPrefix.length] === " " ? 1 : 0);
  const beforeCursor = line.slice(0, cursorInLine);
  const afterCursor = line.slice(cursorInLine);

  if (marker.content.trim() === "" && cursorInLine >= contentStart) {
    const linesBeforeCurrent = source.slice(0, lineStart).split("\n");
    const currentLineIndex = linesBeforeCurrent.length - 1;
    const parent = findParentMarker(source.split("\n"), currentLineIndex, marker.indent);

    if (parent) {
      const parentLine = `${parent.indent}${nextMarkerFor(parent)} `;
      const nextText = `${source.slice(0, lineStart)}${parentLine}${source.slice(lineEnd)}`;
      const nextCaret = lineStart + parentLine.length;
      return { text: nextText, selectionStart: nextCaret, selectionEnd: nextCaret };
    }

    if (marker.indent.length > 0) {
      const indent = String(options.indent || DEFAULT_INDENT);
      const nextIndent = marker.indent.endsWith(indent)
        ? marker.indent.slice(0, -indent.length)
        : marker.indent.replace(/\s{1,2}$/, "");
      const nextLine = `${nextIndent}${marker.marker} `;
      const nextText = `${source.slice(0, lineStart)}${nextLine}${source.slice(lineEnd)}`;
      const nextCaret = lineStart + nextLine.length;
      return { text: nextText, selectionStart: nextCaret, selectionEnd: nextCaret };
    }

    const nextText = `${source.slice(0, lineStart)}${source.slice(lineEnd)}`;
    return { text: nextText, selectionStart: lineStart, selectionEnd: lineStart };
  }

  const nextLine = `${marker.indent}${nextMarkerFor(marker)} ${afterCursor}`;
  const currentLine = beforeCursor.replace(/\s+$/, "");
  const nextText = `${source.slice(0, lineStart)}${currentLine}\n${nextLine}${source.slice(lineEnd)}`;
  const nextCaret = lineStart + currentLine.length + 1 + `${marker.indent}${nextMarkerFor(marker)} `.length;
  return { text: nextText, selectionStart: nextCaret, selectionEnd: nextCaret };
}
