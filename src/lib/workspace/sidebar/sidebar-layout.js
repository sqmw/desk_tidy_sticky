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
  const designWidth = safeViewportWidth / safeUiScale;
  const designHeight = safeViewportHeight / safeUiScale;
  const effectiveSidebarWidth = safeSidebarWidth;
  const compact =
    designWidth <= 1320 ||
    effectiveSidebarWidth <= 252 ||
    designHeight <= 760;

  const viewSectionMaxHeight = compact
    ? clamp(Math.round(designHeight * 0.18), 124, 214)
    : clamp(Math.round(designHeight * 0.22), 162, 308);
  const deadlineSectionMaxHeight = compact
    ? clamp(Math.round(designHeight * 0.32), 162, 306)
    : clamp(Math.round(designHeight * 0.4), 214, 414);

  return {
    compact,
    viewSectionMaxHeight,
    deadlineSectionMaxHeight,
  };
}
