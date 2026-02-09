/**
 * @param {Date} now
 */
function formatTimestamp(now) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * @param {Date} now
 */
function formatDate(now) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {string} text
 * @param {{ now: Date }} ctx
 */
function replaceTimeTokens(text, ctx) {
  const timestamp = formatTimestamp(ctx.now);
  return text
    .replace(/(^|\s)@time(?=\s|$)/g, `$1${timestamp}`)
    .replace(/(^|\s)@now(?=\s|$)/g, `$1${timestamp}`);
}

/**
 * @param {string} text
 * @param {{ now: Date }} ctx
 */
function replaceDateTokens(text, ctx) {
  const date = formatDate(ctx.now);
  return text.replace(/(^|\s)@date(?=\s|$)/g, `$1${date}`);
}

/**
 * @param {string} line
 */
function lineToHr(line) {
  const m = /^(\s*)@hr\s*$/.exec(line);
  if (!m) return null;
  return `${m[1]}---`;
}

/**
 * @param {string} line
 */
function lineToTodo(line) {
  const m = /^(\s*)@todo(?:\s+(.*))?\s*$/.exec(line);
  if (!m) return null;
  return `${m[1]}- [ ] ${m[2]?.trim() || "todo"}`;
}

/**
 * @param {string} line
 */
function lineToDone(line) {
  const m = /^(\s*)@done(?:\s+(.*))?\s*$/.exec(line);
  if (!m) return null;
  return `${m[1]}- [x] ${m[2]?.trim() || "done"}`;
}

/**
 * @param {string} line
 */
function lineToTable(line) {
  const m = /^(\s*)@table\s+(\d+)\s*[xX]\s*(\d+)\s*$/.exec(line);
  if (!m) return null;
  const lead = m[1];
  const cols = Math.max(1, Math.min(10, Number(m[2]) || 1));
  const rows = Math.max(1, Math.min(30, Number(m[3]) || 1));
  const header = `${lead}| ${Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(" | ")} |`;
  const split = `${lead}| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
  const bodyLine = `${lead}| ${Array.from({ length: cols }, () => " ").join(" | ")} |`;
  return [header, split, ...Array.from({ length: rows }, () => bodyLine)];
}

export const builtinTextCommandHandlers = [replaceTimeTokens, replaceDateTokens];

export const builtinLineCommandHandlers = [lineToTable, lineToHr, lineToTodo, lineToDone];
