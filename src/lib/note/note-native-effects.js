import { invoke } from "@tauri-apps/api/core";

/**
 * @param {string} label
 * @param {number} frost
 */
export async function applyNoteWindowNativeEffects(label, frost) {
  if (!label) return false;
  try {
    return !!(await invoke("apply_note_window_frost", {
      label: String(label),
      frost: Number(frost) || 0,
    }));
  } catch (error) {
    console.warn("apply note native effects", error);
    return false;
  }
}
