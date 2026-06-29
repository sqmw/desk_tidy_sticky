const TASK_LINE_PATTERN = /^(\s*)([-*])\s+\[( |x|X)\](?:\s+(.*))?$/;
const TODO_COMMAND_LINE_PATTERN = /^(\s*)@(todo|done)(?:\s+(.*))?\s*$/i;

/** @param {string} text */
export function splitMarkdownLines(text) {
  return String(text ?? "").replaceAll("\r\n", "\n").split("\n");
}

/**
 * @param {string} line
 */
export function parseTaskLine(line) {
  const matched = TASK_LINE_PATTERN.exec(String(line ?? ""));
  if (!matched) return null;
  return {
    indent: matched[1] ?? "",
    marker: matched[2] ?? "-",
    checked: (matched[3] ?? "").toLowerCase() === "x",
    content: matched[4] ?? "",
  };
}

/** @param {string} line */
export function parseTodoCommandLine(line) {
  const matched = TODO_COMMAND_LINE_PATTERN.exec(String(line ?? ""));
  if (!matched) return null;
  return {
    indent: matched[1] ?? "",
    checked: String(matched[2] ?? "").toLowerCase() === "done",
    content: matched[3]?.trim() || (String(matched[2] ?? "").toLowerCase() === "done" ? "done" : "todo"),
  };
}

/** @param {string} line */
export function isTaskLine(line) {
  return !!parseTaskLine(line) || !!parseTodoCommandLine(line);
}

/**
 * @param {string} text
 * @param {number} lineIndex
 */
export function toggleTaskLineAt(text, lineIndex) {
  const lines = splitMarkdownLines(text);
  const index = Math.max(0, Math.min(Number(lineIndex) || 0, lines.length - 1));
  const parsed = parseTaskLine(lines[index]);
  if (parsed) {
    const nextMark = parsed.checked ? " " : "x";
    lines[index] = `${parsed.indent}${parsed.marker} [${nextMark}] ${parsed.content}`.trimEnd();
    return lines.join("\n");
  }

  const command = parseTodoCommandLine(lines[index]);
  if (!command) return null;
  const nextMark = command.checked ? " " : "x";
  lines[index] = `${command.indent}- [${nextMark}] ${command.content}`.trimEnd();
  return lines.join("\n");
}

/**
 * @param {string[]} lines
 * @param {number} lineIndex
 */
function findTaskBlockEnd(lines, lineIndex) {
  let cursor = Math.max(0, Math.min(Number(lineIndex) || 0, lines.length - 1));
  if (!isTaskLine(lines[cursor])) return cursor;
  while (cursor + 1 < lines.length && isTaskLine(lines[cursor + 1])) {
    cursor += 1;
  }
  return cursor;
}

/**
 * @param {string} text
 * @param {number} lineIndex
 */
export function appendTaskLineAfterBlock(text, lineIndex) {
  const lines = splitMarkdownLines(text);
  if (lines.length === 0) return "- [ ] ";
  const index = Math.max(0, Math.min(Number(lineIndex) || 0, lines.length - 1));
  const baseTask = parseTaskLine(lines[index]);
  const baseCommand = parseTodoCommandLine(lines[index]);
  if (!baseTask && !baseCommand) return null;
  const blockEnd = findTaskBlockEnd(lines, index);
  const indent = baseTask?.indent ?? baseCommand?.indent ?? "";
  const marker = baseTask?.marker ?? "-";
  lines.splice(blockEnd + 1, 0, `${indent}${marker} [ ] `);
  return lines.join("\n");
}
