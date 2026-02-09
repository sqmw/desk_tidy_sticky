const RETRYABLE_PATTERNS = [
  "underlying handle is not available",
  "invalid window handle",
  "operation completed successfully",
];

/**
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 * @param {string} label
 * @param {{ attempts?: number; delayMs?: number }} [options]
 */
export async function applyNoSnapWhenReady(invoke, label, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 8));
  const delayMs = Math.max(10, Number(options.delayMs || 75));

  for (let i = 0; i < attempts; i += 1) {
    try {
      await invoke("apply_window_no_snap_by_label", { label });
      return true;
    } catch (error) {
      const msg = String(error || "").toLowerCase();
      const retryable = RETRYABLE_PATTERNS.some((p) => msg.includes(p));
      if (!retryable || i === attempts - 1) {
        console.warn(`apply_window_no_snap_by_label(${label})`, error);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}
