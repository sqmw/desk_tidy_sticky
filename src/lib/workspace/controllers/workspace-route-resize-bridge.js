/**
 * @param {{
 *   getWorkbenchShellRect: () => DOMRect | null;
 *   getWorkspaceViewportRect: () => DOMRect | null;
 *   getWorkspaceLayoutScale: () => number;
 *   getInspectorOpen: () => boolean;
 *   getInspectorListCollapsed: () => boolean;
 *   setInspectorLayoutState: (next: { width: number; collapsed: boolean }) => void;
 *   getInspectorWidth: () => number;
 *   getSidebarWidth: () => number;
 *   getSidebarMaxWidth: () => number;
 *   setSidebarWidthState: (nextWidth: number) => void;
 * }} input
 */
export function createWorkspaceRouteResizeBridge(input) {
  function getSafeScale() {
    const scale = Number(input.getWorkspaceLayoutScale() || 1);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  function getViewportLeft() {
    return input.getWorkspaceViewportRect()?.left ?? 0;
  }

  /** @param {number} clientX */
  function mapPointerClientX(clientX) {
    return (clientX - getViewportLeft()) / getSafeScale();
  }

  /** @param {DOMRect} rect */
  function mapRect(rect) {
    const viewportLeft = getViewportLeft();
    const safeScale = getSafeScale();
    const left = (rect.left - viewportLeft) / safeScale;
    const right = (rect.right - viewportLeft) / safeScale;
    return {
      left,
      right,
      width: Math.max(0, right - left),
    };
  }

  return {
    getWorkbenchShellRect: input.getWorkbenchShellRect,
    getInspectorOpen: input.getInspectorOpen,
    getInspectorListCollapsed: input.getInspectorListCollapsed,
    setInspectorLayout: input.setInspectorLayoutState,
    getInspectorWidth: input.getInspectorWidth,
    mapInspectorPointerClientX: mapPointerClientX,
    mapInspectorRect: mapRect,
    getSidebarWidth: input.getSidebarWidth,
    getSidebarMaxWidth: input.getSidebarMaxWidth,
    setSidebarWidth: input.setSidebarWidthState,
    mapSidebarPointerClientX: mapPointerClientX,
  };
}
