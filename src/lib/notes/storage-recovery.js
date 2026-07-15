export const NOTES_STORAGE_RECOVERY_REQUIRED = "recovery_required";

/**
 * @param {unknown} value
 * @returns {{ state: "ready" | "recoveryRequired"; message: string }}
 */
export function normalizeNotesStorageStatus(value) {
  const raw = /** @type {{ state?: unknown; message?: unknown } | null | undefined} */ (value);
  return /** @type {{ state: "ready" | "recoveryRequired"; message: string }} */ ({
    state: raw?.state === "recoveryRequired" ? "recoveryRequired" : "ready",
    message: typeof raw?.message === "string" ? raw.message : "",
  });
}

/** @param {unknown} status */
export function isNotesStorageRecoveryRequired(status) {
  return normalizeNotesStorageStatus(status).state === "recoveryRequired";
}

/** @param {unknown} error */
export function isNotesStorageRecoveryError(error) {
  return String(error || "").includes(NOTES_STORAGE_RECOVERY_REQUIRED);
}

/**
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 * @param {(status: { state: "ready" | "recoveryRequired"; message: string }) => void} setStatus
 */
export async function refreshNotesStorageStatus(invoke, setStatus) {
  const status = normalizeNotesStorageStatus(await invoke("get_notes_storage_status"));
  setStatus(status);
  return status;
}

/**
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 * @param {unknown} error
 * @param {((status: { state: "ready" | "recoveryRequired"; message: string }) => void) | undefined} setStatus
 */
export async function reportNotesStorageError(invoke, error, setStatus) {
  if (!setStatus || !isNotesStorageRecoveryError(error)) return;
  try {
    await refreshNotesStorageStatus(invoke, setStatus);
  } catch (statusError) {
    console.error("getNotesStorageStatus", statusError);
  }
}
