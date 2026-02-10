const INTERACTIVE_DRAG_BLOCK_SELECTOR =
  'button, input, select, textarea, a, [contenteditable="true"], .card, .actions, .note-text, .notes-list, .quadrant-list, [data-no-drag="true"]';
const WORKSPACE_DRAG_HANDLE_SELECTOR = '[data-drag-handle="workspace"]';

/** @param {Element | null} el */
export function isWorkspaceDragBlockedTarget(el) {
  if (!el) return false;
  return !!el.closest(INTERACTIVE_DRAG_BLOCK_SELECTOR);
}

/** @param {Element | null} el */
export function isWorkspaceDragHandleTarget(el) {
  if (!el) return false;
  return !!el.closest(WORKSPACE_DRAG_HANDLE_SELECTOR);
}

/**
 * @param {PointerEvent} event
 * @param {() => { startDragging: () => Promise<void> }} getWindow
 */
export async function tryStartWorkspaceWindowDrag(event, getWindow) {
  if (event.button !== 0) return;
  const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
  if (!isWorkspaceDragHandleTarget(target)) return;
  if (isWorkspaceDragBlockedTarget(target)) return;
  await getWindow().startDragging();
}
