const DEFAULT_THRESHOLD = 28;
const DEFAULT_RESET_MS = 260;

/** @param {WheelEvent | { deltaX?: number; deltaY?: number; deltaMode?: number }} event */
export function normalizeStickyEdgeWheel(event) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 320 : 1;
  return {
    x: Math.abs(Number(event.deltaX || 0) * unit),
    y: Math.abs(Number(event.deltaY || 0) * unit),
  };
}

/**
 * Physical two-finger direction changes with the operating system's natural
 * scrolling setting. At an otherwise inert edge handle, axis and intent are
 * reliable while delta sign is not.
 *
 * @param {"left" | "right" | "top" | "bottom" | string} edge
 * @param {{ x: number; y: number }} delta
 */
export function getStickyEdgeRevealDistance(edge, delta) {
  if (edge === "top" || edge === "bottom") return delta.y;
  if (edge === "left" || edge === "right") return Math.max(delta.x, delta.y * 0.65);
  return 0;
}

/**
 * @param {{
 *   getEdge: () => string;
 *   isHidden: () => boolean;
 *   onReveal: () => Promise<unknown> | unknown;
 *   now?: () => number;
 *   threshold?: number;
 *   resetMs?: number;
 * }} options
 */
export function createStickyEdgeRevealController(options) {
  let accumulated = 0;
  let lastWheelAt = 0;
  let revealing = false;
  const now = options.now ?? (() => Date.now());
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const resetMs = options.resetMs ?? DEFAULT_RESET_MS;

  return {
    /** @param {WheelEvent | any} event */
    async handleWheel(event) {
      if (!options.isHidden() || revealing) return false;
      const currentTime = now();
      if (currentTime - lastWheelAt > resetMs) accumulated = 0;
      lastWheelAt = currentTime;
      accumulated += getStickyEdgeRevealDistance(
        options.getEdge(),
        normalizeStickyEdgeWheel(event),
      );
      event.preventDefault?.();
      event.stopPropagation?.();
      if (accumulated < threshold) return false;

      accumulated = 0;
      revealing = true;
      try {
        await options.onReveal();
      } finally {
        revealing = false;
      }
      return true;
    },

    reset() {
      accumulated = 0;
      lastWheelAt = 0;
    },
  };
}
