import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  BREAK_OVERLAY_EVENT_ACTION,
  BREAK_OVERLAY_EVENT_READY,
} from "$lib/workspace/break-control/focus-break-overlay-windows.js";

export const BREAK_DUE_EVENT = "focus_break_due";

/**
 * @param {unknown} event
 */
function getPayload(event) {
  const payload = /** @type {{ payload?: unknown }} */ (event)?.payload;
  return payload && typeof payload === "object" ? /** @type {Record<string, any>} */ (payload) : {};
}

/**
 * @param {null | (() => void)} unlisten
 * @param {string} label
 */
function safeUnlisten(unlisten, label) {
  try {
    unlisten?.();
  } catch (error) {
    console.error(label, error);
  }
}

export function disableBreakReminderWatchdog() {
  return invoke("sync_break_reminder_watchdog", {
    snapshot: {
      enabled: false,
      activeBreakKind: "",
      miniDueAtMs: 0,
      longDueAtMs: 0,
    },
  });
}

/**
 * @param {{
 *   onOverlayAction: (action: string) => void;
 *   onOverlayReady: (label: string) => void;
 *   onBreakDue: (kind: string) => void;
 *   onDestroy: () => void | Promise<void>;
 * }} handlers
 */
export function mountBreakControlEventListeners(handlers) {
  /** @type {null | (() => void)} */
  let unlistenAction = null;
  /** @type {null | (() => void)} */
  let unlistenReady = null;
  /** @type {null | (() => void)} */
  let unlistenDue = null;

  const bootstrap = async () => {
    try {
      unlistenAction = await listen(BREAK_OVERLAY_EVENT_ACTION, (event) => {
        handlers.onOverlayAction(String(getPayload(event)?.action || ""));
      });
    } catch (error) {
      console.error("focus listen break overlay action", error);
    }

    try {
      unlistenReady = await listen(BREAK_OVERLAY_EVENT_READY, (event) => {
        handlers.onOverlayReady(String(getPayload(event)?.label || ""));
      });
    } catch (error) {
      console.error("focus listen break overlay ready", error);
    }

    try {
      unlistenDue = await listen(BREAK_DUE_EVENT, (event) => {
        handlers.onBreakDue(String(getPayload(event)?.kind || ""));
      });
    } catch (error) {
      console.error("focus listen native break due", error);
    }
  };

  bootstrap();

  return () => {
    safeUnlisten(unlistenAction, "focus unlisten break overlay action");
    safeUnlisten(unlistenReady, "focus unlisten break overlay ready");
    safeUnlisten(unlistenDue, "focus unlisten native break due");
    Promise.resolve(handlers.onDestroy()).catch((error) =>
      console.error("focus break control destroy handler", error),
    );
    disableBreakReminderWatchdog().catch((error) =>
      console.error("focus disable break reminder watchdog on destroy", error),
    );
  };
}
