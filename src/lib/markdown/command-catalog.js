/**
 * Command palette metadata used by sticky note editor autocomplete.
 */
export const NOTE_COMMAND_CATALOG = [
  { name: "@time", format: "@time", insert: "@time", summary: "Insert local time" },
  { name: "@now", format: "@now", insert: "@now", summary: "Insert local time alias" },
  { name: "@date", format: "@date", insert: "@date", summary: "Insert local date" },
  { name: "@table", format: "@table CxR", insert: "@table 3x3", summary: "Insert markdown table" },
  { name: "@hr", format: "@hr", insert: "@hr", summary: "Insert divider" },
  { name: "@todo", format: "@todo task", insert: "@todo ", summary: "Insert todo checkbox" },
  { name: "@done", format: "@done task", insert: "@done ", summary: "Insert done checkbox" },
];

/**
 * @param {string} command
 */
function previewFromCommand(command) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ts = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  const date = `${yyyy}-${mm}-${dd}`;
  switch (command) {
    case "@time":
    case "@now":
      return ts;
    case "@date":
      return date;
    case "@table":
      return "| Col 1 | Col 2 | Col 3 |";
    case "@hr":
      return "---";
    case "@todo":
      return "- [ ] todo";
    case "@done":
      return "- [x] done";
    default:
      return "";
  }
}

/**
 * @param {string} query
 */
export function filterNoteCommands(query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return NOTE_COMMAND_CATALOG;
  return NOTE_COMMAND_CATALOG.filter((c) => c.name.slice(1).startsWith(q));
}

/**
 * @param {{ name: string; summary?: string }} command
 */
export function getNoteCommandPreview(command) {
  return previewFromCommand(command.name) || command.summary || "";
}
