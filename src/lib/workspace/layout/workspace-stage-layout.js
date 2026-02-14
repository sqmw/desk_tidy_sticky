/** @param {number} value @param {number} min @param {number} max */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {{
 *   viewportWidth: number;
 *   viewportHeight: number;
 *   uiScale: number;
 *   sidebarWidth: number;
 }} input
 */
export function resolveWorkspaceStageLayout(input) {
  const safeViewportWidth = Math.max(360, Number(input.viewportWidth || 0));
  const safeViewportHeight = Math.max(420, Number(input.viewportHeight || 0));
  const safeScale = clamp(Number(input.uiScale || 1), 0.75, 1.5);

  // Layout is calculated in the scaled design coordinate system.
  const designWidth = safeViewportWidth / safeScale;
  const designHeight = safeViewportHeight / safeScale;

  const narrow = designWidth <= 1260;
  const ultraNarrow = designWidth <= 1080;
  const shortHeight = designHeight <= 780;

  const minMainWidth = ultraNarrow ? 580 : narrow ? 700 : 780;
  const sidebarMaxWidth = clamp(Math.floor(designWidth - minMainWidth - 8), 96, 360);
  const sidebarMinWidth = 86;

  const recommendedSidebarWidth = clamp(
    Number(input.sidebarWidth || 260),
    sidebarMinWidth,
    sidebarMaxWidth,
  );

  return {
    narrow,
    ultraNarrow,
    shortHeight,
    sidebarMinWidth,
    sidebarMaxWidth,
    recommendedSidebarWidth,
    toolbarCompact: designWidth <= 1380 || shortHeight,
    windowBarCompact: designWidth <= 1240,
    focusCompact: designWidth <= 1360 || shortHeight,
  };
}

