const DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO = 0.42;
const SIDEBAR_MANUAL_SPLIT_MIN_RATIO = 0.08;
const SIDEBAR_MANUAL_SPLIT_MAX_RATIO = 0.92;
const DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT = 8;
const DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT = 96;

/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeSidebarManualSplitRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO;
  if (numeric <= 0) return DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO;
  return clamp(
    Number(numeric.toFixed(4)),
    SIDEBAR_MANUAL_SPLIT_MIN_RATIO,
    SIDEBAR_MANUAL_SPLIT_MAX_RATIO,
  );
}

/**
 * @param {number} trackHeight
 * @param {unknown} minSectionHeight
 */
function resolveMinSectionHeight(trackHeight, minSectionHeight) {
  const safeTrackHeight = Math.max(0, Number(trackHeight || 0));
  if (safeTrackHeight <= 0) return 0;
  const requested = Number(minSectionHeight);
  const safeRequested = Number.isFinite(requested)
    ? Math.max(56, Math.round(requested))
    : DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT;
  return Math.min(Math.round(safeTrackHeight / 2), safeRequested);
}

/**
 * @param {{
 *   bodyHeight: number;
 *   ratio: unknown;
 *   splitterHeight?: number;
 *   minSectionHeight?: number;
 * }} input
 */
export function resolveSidebarManualSplitHeights(input) {
  const safeBodyHeight = Math.max(0, Number(input.bodyHeight || 0));
  const safeSplitterHeight = Math.max(
    0,
    Math.round(Number(input.splitterHeight ?? DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT)),
  );
  const trackHeight = Math.max(0, safeBodyHeight - safeSplitterHeight);
  if (trackHeight <= 0) {
    return {
      ratio: normalizeSidebarManualSplitRatio(input.ratio),
      trackHeight: 0,
      topHeight: 0,
      bottomHeight: 0,
    };
  }
  const minSectionHeight = resolveMinSectionHeight(trackHeight, input.minSectionHeight);
  const minRatio = minSectionHeight / trackHeight;
  const maxRatio = 1 - minRatio;
  const preferredRatio = normalizeSidebarManualSplitRatio(input.ratio);
  const safeRatio = clamp(preferredRatio, minRatio, maxRatio);
  const topHeight = clamp(
    Math.round(trackHeight * safeRatio),
    minSectionHeight,
    trackHeight - minSectionHeight,
  );
  return {
    ratio: Number((topHeight / trackHeight).toFixed(4)),
    trackHeight,
    topHeight,
    bottomHeight: trackHeight - topHeight,
  };
}

/**
 * @param {{
 *   clientY: number;
 *   bodyTop: number;
 *   bodyHeight: number;
 *   splitterHeight?: number;
 *   minSectionHeight?: number;
 * }} input
 */
export function calcSidebarManualSplitRatioFromPointer(input) {
  const safeBodyHeight = Math.max(0, Number(input.bodyHeight || 0));
  const safeSplitterHeight = Math.max(
    0,
    Math.round(Number(input.splitterHeight ?? DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT)),
  );
  const trackHeight = Math.max(0, safeBodyHeight - safeSplitterHeight);
  if (trackHeight <= 0) return DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO;
  const minSectionHeight = resolveMinSectionHeight(trackHeight, input.minSectionHeight);
  const minTop = minSectionHeight;
  const maxTop = trackHeight - minSectionHeight;
  const rawTop = Number(input.clientY) - Number(input.bodyTop || 0) - safeSplitterHeight / 2;
  const nextTop = clamp(Math.round(rawTop), minTop, maxTop);
  return Number((nextTop / trackHeight).toFixed(4));
}

export {
  DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT,
  DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO,
  DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT,
};
