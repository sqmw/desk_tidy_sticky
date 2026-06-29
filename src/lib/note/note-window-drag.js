/**
 * @param {{
 *   getCurrentWindow: () => {
 *     outerPosition: () => Promise<{ x: number; y: number }>;
 *     scaleFactor: () => Promise<number>;
 *   };
 *   moveWindow: (position: { x: number; y: number }) => Promise<void>;
 *   getCanInteract: () => boolean;
 *   getIsEditing: () => boolean;
 *   getIsAlwaysOnTop?: () => boolean;
 *   dismissFloatingPanels: (target: HTMLElement | null) => void;
 *   onDraggingChange?: (dragging: boolean) => void;
 *   onPositionPersist?: (position: { x: number; y: number }) => Promise<void> | void;
 * }} input
 */
export function createNoteWindowDragController(input) {
  const NON_DRAGGABLE_SELECTOR = [
    "button",
    "input",
    "select",
    "textarea",
    "a",
    "label",
    "summary",
    "[contenteditable=\"true\"]",
    ".command-popover",
    ".note-tag-editor",
    ".color-popover",
    ".text-color-popover",
    ".opacity-popover",
    ".frost-popover",
  ].join(",");

  let dragWindowX = 0;
  let dragWindowY = 0;
  let lastDragScreenX = 0;
  let lastDragScreenY = 0;
  let dragPointerId = -1;
  let dragging = false;
  let pendingPointerId = -1;
  let pendingStartScreenX = 0;
  let pendingStartScreenY = 0;
  /** @type {HTMLDivElement | null} */
  let pendingSurface = null;

  const DRAG_START_THRESHOLD_PX = 4;

  /** @param {boolean} next */
  function setDragging(next) {
    dragging = next;
    input.onDraggingChange?.(next);
  }

  function endManualWindowDrag() {
    setDragging(false);
    dragPointerId = -1;
    clearPendingDragIntent();
  }

  function clearPendingDragIntent() {
    pendingPointerId = -1;
    pendingStartScreenX = 0;
    pendingStartScreenY = 0;
    pendingSurface = null;
  }

  function persistCurrentPosition() {
    if (!dragging) return;
    void Promise.resolve(
      input.onPositionPersist?.({
        x: dragWindowX,
        y: dragWindowY,
      }),
    ).catch((err) => {
      console.error("persistCurrentPosition failed", err);
    });
  }

  /**
   * @param {PointerEvent} event
   * @param {HTMLDivElement} dragSurface
   */
  async function startManualWindowDrag(event, dragSurface) {
    const win = input.getCurrentWindow();
    const [position, scaleFactor] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
    dragWindowX = position.x / scaleFactor;
    dragWindowY = position.y / scaleFactor;
    lastDragScreenX = event.screenX;
    lastDragScreenY = event.screenY;
    dragPointerId = event.pointerId;
    setDragging(true);
    dragSurface.setPointerCapture(event.pointerId);
    clearPendingDragIntent();
  }

  /** @param {PointerEvent} event */
  function applyManualWindowDragPosition(event) {
    if (!dragging) return;
    if (event.pointerId !== dragPointerId) return;
    if (event.buttons !== 1) {
      persistCurrentPosition();
      endManualWindowDrag();
      return;
    }
    const deltaX = event.screenX - lastDragScreenX;
    const deltaY = event.screenY - lastDragScreenY;
    lastDragScreenX = event.screenX;
    lastDragScreenY = event.screenY;
    dragWindowX += deltaX;
    dragWindowY += deltaY;
    input
      .moveWindow({
        x: dragWindowX,
        y: dragWindowY,
      })
      .catch((err) => {
        console.error("moveWindow failed", err);
        endManualWindowDrag();
      });
  }

  /** @param {PointerEvent} event */
  function onDragPointerMove(event) {
    if (!dragging && event.pointerId === pendingPointerId) {
      const deltaX = Math.abs(event.screenX - pendingStartScreenX);
      const deltaY = Math.abs(event.screenY - pendingStartScreenY);
      if (deltaX < DRAG_START_THRESHOLD_PX && deltaY < DRAG_START_THRESHOLD_PX) {
        return;
      }
      event.preventDefault();
      const surface = pendingSurface;
      if (!surface) {
        clearPendingDragIntent();
        return;
      }
      void startManualWindowDrag(event, surface).catch((err) => {
        console.error("startManualWindowDrag failed", err);
        clearPendingDragIntent();
      });
      return;
    }
    applyManualWindowDragPosition(event);
  }

  /** @param {PointerEvent} event */
  function onDragPointerUp(event) {
    if (!dragging && event.pointerId === pendingPointerId) {
      clearPendingDragIntent();
      return;
    }
    if (event.pointerId !== dragPointerId) return;
    const surface = /** @type {HTMLDivElement | null} */ (event.currentTarget);
    if (surface?.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId);
    }
    persistCurrentPosition();
    endManualWindowDrag();
    clearPendingDragIntent();
  }

  /** @param {PointerEvent} event */
  async function handleDragPointerDown(event) {
    if (event.button !== 0) return;
    if (!input.getCanInteract()) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    input.dismissFloatingPanels(target);
    if (target?.closest(NON_DRAGGABLE_SELECTOR)) {
      return;
    }
    const isAlwaysOnTop = input.getIsAlwaysOnTop?.() ?? false;
    const inShell = !!target?.closest(".note-shell");
    const inWindow = !!target?.closest(".note-window");
    const inToolbar = !!target?.closest(".toolbar");
    const inPreview = !!target?.closest(".preview-text, .note-block-surface");
    if (input.getIsEditing()) {
      if (!isAlwaysOnTop && !inToolbar) return;
      if (isAlwaysOnTop && !inWindow && !inToolbar && !inShell) return;
    } else if (isAlwaysOnTop) {
      if (!inWindow && !inToolbar && !inShell) return;
    } else if (!isAlwaysOnTop && !inPreview && !inToolbar) {
      return;
    }
    const surface = /** @type {HTMLDivElement} */ (event.currentTarget);
    pendingPointerId = event.pointerId;
    pendingStartScreenX = event.screenX;
    pendingStartScreenY = event.screenY;
    pendingSurface = surface;
  }

  return {
    endManualWindowDrag,
    handleDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
  };
}
