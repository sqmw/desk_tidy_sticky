import { listen } from "@tauri-apps/api/event";

export const SHORTCUT_SETTINGS_CHANGED_EVENT = "shortcut_settings_changed";

export function createDefaultShortcutSettings() {
  return {
    panelBinding: { value: "Ctrl+Shift+N", status: "registered", message: "" },
    overlayBinding: { value: "Ctrl+Shift+O", status: "registered", message: "" },
  };
}

/**
 * @param {any} raw
 */
export function normalizeShortcutSettings(raw) {
  const fallback = createDefaultShortcutSettings();
  if (!raw || typeof raw !== "object") return fallback;
  return {
    panelBinding: normalizeBinding(raw.panelBinding, fallback.panelBinding),
    overlayBinding: normalizeBinding(raw.overlayBinding, fallback.overlayBinding),
  };
}

/**
 * @param {any} raw
 * @param {{ value: string, status: string, message: string }} fallback
 */
function normalizeBinding(raw, fallback) {
  if (!raw || typeof raw !== "object") return { ...fallback };
  return {
    value: typeof raw.value === "string" ? raw.value : fallback.value,
    status: typeof raw.status === "string" && raw.status ? raw.status : fallback.status,
    message: typeof raw.message === "string" ? raw.message : "",
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function getShortcutSettings(invoke) {
  return normalizeShortcutSettings(await invoke("get_shortcut_settings"));
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {{ panelShortcut: string, overlayShortcut: string }} payload
 */
export async function updateShortcutSettings(invoke, payload) {
  return normalizeShortcutSettings(
    await invoke("update_shortcut_settings", {
      panelShortcut: payload.panelShortcut,
      overlayShortcut: payload.overlayShortcut,
    }),
  );
}

/**
 * @param {(settings: ReturnType<typeof normalizeShortcutSettings>) => void | Promise<void>} handler
 */
export async function listenShortcutSettingsChanged(handler) {
  return listen(SHORTCUT_SETTINGS_CHANGED_EVENT, async (event) => {
    await handler(normalizeShortcutSettings(event.payload));
  });
}
