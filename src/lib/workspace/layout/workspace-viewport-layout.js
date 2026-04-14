import { normalizeWorkspaceZoom } from "$lib/workspace/preferences-service.js";
import { resolveSidebarLayout } from "$lib/workspace/sidebar/sidebar-layout.js";
import { resolveWorkspaceStageLayout } from "$lib/workspace/layout/workspace-stage-layout.js";

/**
 * @param {{
 *   viewportWidth: number;
 *   viewportHeight: number;
 *   viewportDpr: number;
 *   sidebarWidth: number;
 *   sidebarCollapsed: boolean;
 *   workspaceZoom: number;
 *   workspaceZoomMode: string;
 *   workspaceFontSize: string;
 * }} input
 */
export function resolveWorkspaceViewportLayout(input) {
  const adaptiveScale = getWorkspaceAdaptiveScale(input);
  const layoutScale = input.workspaceZoomMode === "auto"
    ? adaptiveScale
    : normalizeWorkspaceZoom(input.workspaceZoom);
  const textScale = getWorkspaceTextScale(input.workspaceFontSize);
  const stageLayout = resolveWorkspaceStageLayout({
    viewportWidth: input.viewportWidth,
    viewportHeight: input.viewportHeight,
    uiScale: layoutScale,
    sidebarWidth: input.sidebarWidth,
  });
  const sidebarLayout = resolveSidebarLayout({
    viewportWidth: input.viewportWidth,
    viewportHeight: input.viewportHeight,
    sidebarWidth: input.sidebarWidth,
    uiScale: layoutScale,
  });

  return {
    adaptiveScale,
    layoutScale,
    textScale,
    stageLayout,
    sidebarLayout,
    sidebarCompact: sidebarLayout.compact,
  };
}

/**
 * @param {{
 *   viewportWidth: number;
 *   viewportHeight: number;
 *   viewportDpr: number;
 *   sidebarWidth: number;
 *   sidebarCollapsed: boolean;
 * }} input
 */
function getWorkspaceAdaptiveScale(input) {
  const safeWidth = Math.max(320, input.viewportWidth);
  const safeHeight = Math.max(320, input.viewportHeight);
  const sidebarReserved = Math.min(420, Math.max(180, input.sidebarWidth)) + 24;
  const windowChromeReserved = 42;
  const contentWidth = Math.max(640, safeWidth - sidebarReserved);
  const contentHeight = Math.max(540, safeHeight - windowChromeReserved);
  const widthRatio = contentWidth / 1180;
  const heightRatio = contentHeight / 860;
  const dprCompensation = input.viewportDpr >= 2
    ? 1.07
    : input.viewportDpr >= 1.5
      ? 1.04
      : input.viewportDpr >= 1.25
        ? 1.02
        : 1;
  const sidebarCompensation = input.sidebarCollapsed ? 1.02 : 1;
  const scale = Math.min(widthRatio, heightRatio) * dprCompensation * sidebarCompensation;
  return Math.max(0.88, Math.min(1.22, Number(scale.toFixed(2))));
}

/** @param {string} workspaceFontSize */
function getWorkspaceTextScale(workspaceFontSize) {
  if (workspaceFontSize === "small") return 0.94;
  if (workspaceFontSize === "large") return 1.08;
  return 1;
}
