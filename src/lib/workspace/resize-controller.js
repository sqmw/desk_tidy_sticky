import { calcInspectorLayout, calcSidebarWidth } from "$lib/workspace/layout-resize.js";

/**
 * @param {{
 *   getWorkbenchShellRect: () => DOMRect | null;
 *   getInspectorOpen: () => boolean;
 *   getInspectorListCollapsed: () => boolean;
 *   setInspectorLayout: (next: { width: number; collapsed: boolean }) => void;
 *   getSidebarWidth: () => number;
 *   setSidebarWidth: (nextWidth: number) => void;
 * }} params
 */
export function createWorkspaceResizeController(params) {
  let inspectorPointerId = -1;
  let sidebarPointerId = -1;
  let resizingInspector = false;
  let resizingSidebar = false;

  /** @param {number} clientX */
  function applyInspectorResize(clientX) {
    const rect = params.getWorkbenchShellRect();
    if (!rect) return;
    const next = calcInspectorLayout({
      clientX,
      rect,
      isCollapsed: params.getInspectorListCollapsed(),
    });
    params.setInspectorLayout(next);
  }

  /** @param {number} clientX */
  function applySidebarResize(clientX) {
    params.setSidebarWidth(calcSidebarWidth(clientX));
  }

  function endInspectorResize() {
    resizingInspector = false;
    inspectorPointerId = -1;
  }

  function endSidebarResize() {
    resizingSidebar = false;
    sidebarPointerId = -1;
  }

  /** @param {PointerEvent} event */
  function startInspectorResize(event) {
    if (event.button !== 0) return;
    if (!params.getInspectorOpen()) return;
    resizingInspector = true;
    inspectorPointerId = event.pointerId;
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  /** @param {PointerEvent} event */
  function startSidebarResize(event) {
    if (event.button !== 0) return;
    resizingSidebar = true;
    sidebarPointerId = event.pointerId;
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  /** @param {PointerEvent} event */
  function onWindowPointerMove(event) {
    if (resizingSidebar) {
      if (sidebarPointerId !== -1 && event.pointerId !== sidebarPointerId) return;
      applySidebarResize(event.clientX);
      return;
    }
    if (resizingInspector) {
      if (inspectorPointerId !== -1 && event.pointerId !== inspectorPointerId) return;
      applyInspectorResize(event.clientX);
    }
  }

  /** @param {PointerEvent} event */
  function onWindowPointerUp(event) {
    if (resizingSidebar) {
      if (sidebarPointerId !== -1 && event.pointerId !== sidebarPointerId) return;
      applySidebarResize(event.clientX);
      if (params.getSidebarWidth() <= 120) params.setSidebarWidth(86);
      endSidebarResize();
      return;
    }
    if (resizingInspector) {
      if (inspectorPointerId !== -1 && event.pointerId !== inspectorPointerId) return;
      applyInspectorResize(event.clientX);
      endInspectorResize();
    }
  }

  function cancelAllResizing() {
    endSidebarResize();
    endInspectorResize();
  }

  return {
    startInspectorResize,
    startSidebarResize,
    onWindowPointerMove,
    onWindowPointerUp,
    cancelAllResizing,
  };
}
