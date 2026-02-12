/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {{ viewportWidth: number; viewportHeight: number; sidebarWidth: number; uiScale: number }} input
 */
export function resolveSidebarLayout(input) {
  const safeViewportWidth = Math.max(320, Number(input.viewportWidth || 0));
  const safeViewportHeight = Math.max(420, Number(input.viewportHeight || 0));
  const safeSidebarWidth = clamp(Number(input.sidebarWidth || 0), 86, 360);
  const safeUiScale = clamp(Number(input.uiScale || 1), 0.75, 1.5);
  const effectiveSidebarWidth = safeSidebarWidth * safeUiScale;
  const compact =
    safeViewportWidth <= 1380 ||
    effectiveSidebarWidth <= 252 ||
    safeViewportHeight <= 780;

  const viewSectionMaxHeight = compact
    ? clamp(Math.round(safeViewportHeight * 0.19), 128, 220)
    : clamp(Math.round(safeViewportHeight * 0.24), 170, 320);
  const deadlineSectionMaxHeight = compact
    ? clamp(Math.round(safeViewportHeight * 0.34), 170, 320)
    : clamp(Math.round(safeViewportHeight * 0.42), 220, 420);

  return {
    compact,
    viewSectionMaxHeight,
    deadlineSectionMaxHeight,
  };
}
