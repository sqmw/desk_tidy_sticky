import { buildBreakOverlayPayloadKey } from "$lib/workspace/break-control/break-control-controller.js";
import {
  closeBreakOverlayWindows,
  emitBreakOverlayState,
  ensureBreakOverlayWindows,
} from "$lib/workspace/break-control/focus-break-overlay-windows.js";

/**
 * @param {{
 *   getBreakTimerActive: () => boolean;
 *   buildPayload: () => Record<string, any>;
 * }} input
 */
export function createBreakOverlayLifecycle(input) {
  /** @type {string[]} */
  let labels = [];
  let syncNonce = 0;
  let active = false;
  let closing = false;
  let syncInFlight = false;
  let syncQueued = false;
  let lastPayloadKey = "";
  /** @type {null | Promise<string[]>} */
  let ensurePromise = null;

  async function ensureLabels() {
    if (labels.length > 0) return labels;
    if (ensurePromise) return ensurePromise;
    ensurePromise = ensureBreakOverlayWindows()
      .then((nextLabels) => {
        labels = Array.isArray(nextLabels)
          ? Array.from(new Set(nextLabels.map((label) => String(label || "")).filter(Boolean)))
          : [];
        return labels;
      })
      .catch((error) => {
        console.error("focus ensure break overlay windows", error);
        labels = [];
        return [];
      })
      .finally(() => {
        ensurePromise = null;
      });
    return ensurePromise;
  }

  async function sync() {
    if (!input.getBreakTimerActive()) return;
    if (closing) return;
    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;
    try {
      const targetLabels = await ensureLabels();
      if (!Array.isArray(targetLabels) || targetLabels.length === 0) return;
      const payload = input.buildPayload();
      const payloadKey = buildBreakOverlayPayloadKey(targetLabels, payload);
      if (payloadKey === lastPayloadKey) return;
      lastPayloadKey = payloadKey;
      const healthyLabels = await emitBreakOverlayState(targetLabels, payload);
      if (healthyLabels.length !== targetLabels.length) {
        labels = healthyLabels;
        lastPayloadKey = "";
      }
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        sync().catch((error) => console.error("focus queued sync break overlay", error));
      }
    }
  }

  /**
   * @param {boolean} [force]
   */
  async function closeEverywhere(force = false) {
    if (closing) return;
    const targetLabels = [...labels];
    if (!force && targetLabels.length === 0) return;
    closing = true;
    try {
      if (targetLabels.length > 0) {
        try {
          await emitBreakOverlayState(targetLabels, { close: true });
        } catch (error) {
          console.error("focus emit break overlay close", error);
        }
      }
      await closeBreakOverlayWindows();
    } finally {
      labels = [];
      ensurePromise = null;
      syncNonce += 1;
      lastPayloadKey = "";
      closing = false;
    }
  }

  function syncActiveState() {
    const nextActive = input.getBreakTimerActive();
    if (nextActive === active) return;
    active = nextActive;
    if (!nextActive) {
      closeEverywhere(true).catch((error) =>
        console.error("focus close break overlay windows", error),
      );
      return;
    }
    const nonce = ++syncNonce;
    (async () => {
      const targetLabels = await ensureLabels();
      if (nonce !== syncNonce) return;
      if (!Array.isArray(targetLabels) || targetLabels.length === 0) return;
      await sync();
    })();
  }

  /** @param {string} label */
  function handleReady(label) {
    if (!label) return;
    if (!input.getBreakTimerActive()) return;
    if (!labels.includes(label)) {
      labels = [...labels, label];
      lastPayloadKey = "";
    }
    emitBreakOverlayState([label], input.buildPayload()).catch((error) =>
      console.error("focus emit break overlay ready sync", error),
    );
  }

  return {
    closeEverywhere,
    handleReady,
    sync,
    syncActiveState,
  };
}
