import { LogicalPosition } from "@tauri-apps/api/dpi";

/**
 * @param {{
 *   getCurrentWindow: () => {
 *     outerPosition: () => Promise<{ x: number; y: number }>;
 *     scaleFactor: () => Promise<number>;
 *     setPosition: (position: LogicalPosition) => Promise<void>;
 *   };
 *   getCanInteract: () => boolean;
 *   getIsEditing: () => boolean;
 *   dismissFloatingPanels: (target: HTMLElement | null) => void;
 *   onDraggingChange?: (dragging: boolean) => void;
 *   onPositionPersist?: (position: { x: number; y: number }) => Promise<void> | void;
 * }} input
 */
export function createNoteWindowDragController(input) {
  let dragWindowX = 0;
  let dragWindowY = 0;
  let lastDragScreenX = 0;
  let lastDragScreenY = 0;
  let dragPointerId = -1;
  let dragging = false;

  /** @param {boolean} next */
  function setDragging(next) {
    dragging = next;
    input.onDraggingChange?.(next);
  }

  function endManualWindowDrag() {
    setDragging(false);
    dragPointerId = -1;
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
      .getCurrentWindow()
      .setPosition(new LogicalPosition(dragWindowX, dragWindowY))
      .catch((err) => {
        console.error("setPosition failed", err);
        endManualWindowDrag();
      });
  }

  /** @param {PointerEvent} event */
  function onDragPointerMove(event) {
    applyManualWindowDragPosition(event);
  }

  /** @param {PointerEvent} event */
  function onDragPointerUp(event) {
    if (event.pointerId !== dragPointerId) return;
    const surface = /** @type {HTMLDivElement | null} */ (event.currentTarget);
    if (surface?.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId);
    }
    persistCurrentPosition();
    endManualWindowDrag();
  }

  /** @param {PointerEvent} event */
  async function handleDragPointerDown(event) {
    if (event.button !== 0) return;
    if (!input.getCanInteract()) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    input.dismissFloatingPanels(target);
    if (
      target?.closest("button,input,select,textarea,.note-tag-bar,.color-popover,.text-color-popover,.opacity-popover,.frost-popover")
    ) {
      return;
    }
    const inToolbar = !!target?.closest(".toolbar");
    const inPreview = !!target?.closest(".preview-text");
    if (input.getIsEditing()) {
      if (!inToolbar) return;
    } else if (!inPreview && !inToolbar) {
      return;
    }
    event.preventDefault();
    try {
      const surface = /** @type {HTMLDivElement} */ (event.currentTarget);
      await startManualWindowDrag(event, surface);
    } catch (err) {
      console.error("startManualWindowDrag failed", err);
    }
  }

  return {
    endManualWindowDrag,
    handleDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
  };
}
