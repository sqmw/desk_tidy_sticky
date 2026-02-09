export const EDITOR_DISPLAY_MODE = {
  BLOCKS: "blocks",
  SOURCE: "source",
  SPLIT: "split",
};

const STORAGE_KEY = "note_editor_display_mode";

/**
 * @param {string | null | undefined} value
 */
function normalizeMode(value) {
  if (value === EDITOR_DISPLAY_MODE.BLOCKS) return EDITOR_DISPLAY_MODE.BLOCKS;
  return value === EDITOR_DISPLAY_MODE.SOURCE
    ? EDITOR_DISPLAY_MODE.SOURCE
    : EDITOR_DISPLAY_MODE.SPLIT;
}

export function loadEditorDisplayMode() {
  if (typeof window === "undefined") return EDITOR_DISPLAY_MODE.BLOCKS;
  try {
    return normalizeMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EDITOR_DISPLAY_MODE.BLOCKS;
  }
}

/**
 * @param {string} mode
 */
export function saveEditorDisplayMode(mode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, normalizeMode(mode));
  } catch {
    // ignore storage failures
  }
}

/**
 * @param {string} current
 */
export function nextEditorDisplayMode(current) {
  const mode = normalizeMode(current);
  if (mode === EDITOR_DISPLAY_MODE.BLOCKS) return EDITOR_DISPLAY_MODE.SOURCE;
  if (mode === EDITOR_DISPLAY_MODE.SOURCE) return EDITOR_DISPLAY_MODE.SPLIT;
  return EDITOR_DISPLAY_MODE.BLOCKS;
}
