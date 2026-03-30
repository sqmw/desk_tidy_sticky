import { emit, listen } from "@tauri-apps/api/event";

export const PREFERENCES_CHANGED_EVENT = "preferences_changed";

/**
 * @param {Record<string, any>} updates
 */
export async function broadcastPreferencesChanged(updates) {
  await emit(PREFERENCES_CHANGED_EVENT, updates);
}

/**
 * @param {(updates: Record<string, any>) => void | Promise<void>} handler
 */
export async function listenPreferencesChanged(handler) {
  return listen(PREFERENCES_CHANGED_EVENT, async (event) => {
    const payload = event.payload;
    if (!payload || typeof payload !== "object") return;
    await handler(/** @type {Record<string, any>} */ (payload));
  });
}
