import { calcInspectorLayout, calcSidebarWidth } from "$lib/workspace/layout-resize.js";

/**
 * @param {{
 *   getWorkbenchShellRect: () => DOMRect | null;
 *   getInspectorOpen: () => boolean;
 *   getInspectorListCollapsed: () => boolean;
 *   setInspectorLayout: (next: { width: number; collapsed: boolean }) => void;
 *   getSidebarWidth: () => number;
 *   getSidebarMaxWidth?: () => number;
 *   setSidebarWidth: (nextWidth: number) => void;
 *   mapSidebarPointerClientX?: (clientX: number) => number;
 * }} params
 */
export function createWorkspaceResizeController(params) {
  const SIDEBAR_DRAG_START_THRESHOLD = 8;

  let inspectorPointerId = -1;
  let sidebarPointerId = -1;
  let resizingInspector = false;
  let resizingSidebar = false;
  let sidebarDragStartX = 0;
  let sidebarDragStartWidth = 0;
  let sidebarDraggingStarted = false;

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
    const mappedX = typeof params.mapSidebarPointerClientX === "function"
      ? params.mapSidebarPointerClientX(clientX)
      : clientX;
    const max = Math.max(96, Math.round(Number(params.getSidebarMaxWidth?.() || 260)));
    params.setSidebarWidth(calcSidebarWidth(mappedX, { max }));
  }

  function endInspectorResize() {
    resizingInspector = false;
    inspectorPointerId = -1;
  }

  function endSidebarResize() {
    resizingSidebar = false;
    sidebarPointerId = -1;
    sidebarDragStartX = 0;
    sidebarDragStartWidth = 0;
    sidebarDraggingStarted = false;
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
    sidebarDragStartX = event.clientX;
    sidebarDragStartWidth = Number(params.getSidebarWidth() || 0);
    sidebarDraggingStarted = false;
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  /** @param {PointerEvent} event */
  function onWindowPointerMove(event) {
    if (resizingSidebar) {
      if (sidebarPointerId !== -1 && event.pointerId !== sidebarPointerId) return;
      // Ignore synthetic move events after button release.
      if ((event.buttons & 1) !== 1) return;
      if (!sidebarDraggingStarted) {
        if (Math.abs(event.clientX - sidebarDragStartX) < SIDEBAR_DRAG_START_THRESHOLD) return;
        sidebarDraggingStarted = true;
      }
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
      if (sidebarDraggingStarted) {
        applySidebarResize(event.clientX);
        if (params.getSidebarWidth() <= 120) params.setSidebarWidth(86);
      } else {
        params.setSidebarWidth(sidebarDragStartWidth);
      }
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
