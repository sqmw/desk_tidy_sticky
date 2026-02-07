/**
 * @param {{
 *   drag: {
 *     draggedNoteId: string | null;
 *     dragTargetIndex: number | null;
 *     dragPreviewNotes: any[] | null;
 *     dragGhostTop: number;
 *     dragGhostLeft: number;
 *     dragGhostWidth: number;
 *     dragPointerOffsetY: number;
 *     verticalDragStartY: number | null;
 *   };
 *   getCanReorder: () => boolean;
 *   getVisibleNotes: () => any[];
 *   getNotesListEl: () => HTMLDivElement | null;
 *   persistReorderedVisible: (reorderedVisible: any[]) => Promise<void>;
 * }} deps
 */
export function createDragReorder(deps) {
  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function getEventClientY(e) {
    // @ts-ignore
    return e.touches ? e.touches[0].clientY : e.clientY;
  }

  /** @param {number} pointerY */
  function findDropIndexByPointer(pointerY) {
    const notesListEl = deps.getNotesListEl();
    const drag = deps.drag;
    if (!notesListEl || !drag.draggedNoteId) return 0;

    const wrappers = notesListEl.querySelectorAll(".note-wrapper");
    const len = wrappers.length;
    if (len <= 1) return 0;

    const activeList = drag.dragPreviewNotes ?? deps.getVisibleNotes();
    const currentIndex = activeList.findIndex((n) => n.id === drag.draggedNoteId);
    if (currentIndex < 0) return 0;

    let insertionIndex = 0;
    for (let i = 0; i < len; i += 1) {
      const rect = wrappers[i].getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      if (pointerY > centerY) insertionIndex = i + 1;
    }

    let targetIndex = insertionIndex;
    if (insertionIndex > currentIndex) {
      targetIndex = insertionIndex - 1;
    }

    return Math.max(0, Math.min(len - 1, targetIndex));
  }

  /** @param {number} pointerY */
  function autoScrollNotesList(pointerY) {
    const notesListEl = deps.getNotesListEl();
    if (!notesListEl) return;

    const rect = notesListEl.getBoundingClientRect();
    const edge = 36;
    const maxSpeed = 14;

    if (pointerY < rect.top + edge) {
      const ratio = (rect.top + edge - pointerY) / edge;
      notesListEl.scrollTop -= Math.max(2, Math.round(maxSpeed * ratio));
    } else if (pointerY > rect.bottom - edge) {
      const ratio = (pointerY - (rect.bottom - edge)) / edge;
      notesListEl.scrollTop += Math.max(2, Math.round(maxSpeed * ratio));
    }
  }

  /**
   * @param {PointerEvent | TouchEvent | MouseEvent} e
   * @param {number} index
   */
  function handleVerticalDragStart(e, index) {
    if (!deps.getCanReorder()) return;

    const startList = [...deps.getVisibleNotes()];
    const current = startList[index];
    if (!current) return;

    const drag = deps.drag;
    const clientY = getEventClientY(e);
    const target = /** @type {HTMLElement | null} */ (e.target);
    const wrapper = target?.closest(".note-wrapper");

    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      drag.dragGhostTop = rect.top;
      drag.dragGhostLeft = rect.left;
      drag.dragGhostWidth = rect.width;
      drag.dragPointerOffsetY = Math.max(0, clientY - rect.top);
    } else {
      drag.dragPointerOffsetY = 18;
    }

    drag.draggedNoteId = current.id;
    drag.dragTargetIndex = index;
    drag.verticalDragStartY = clientY;
    drag.dragPreviewNotes = startList;
  }

  /**
   * @param {PointerEvent | TouchEvent | MouseEvent} e
   * @param {number} deltaY
   */
  function handleVerticalDragMove(e, deltaY) {
    const drag = deps.drag;
    if (!deps.getCanReorder() || !drag.draggedNoteId) return;

    const clientY =
      drag.verticalDragStartY === null
        ? getEventClientY(e)
        : drag.verticalDragStartY + deltaY;

    drag.dragGhostTop = clientY - drag.dragPointerOffsetY;
    autoScrollNotesList(clientY);

    const nextTarget = findDropIndexByPointer(clientY);
    drag.dragTargetIndex = nextTarget;

    if (!drag.dragPreviewNotes) return;
    const from = drag.dragPreviewNotes.findIndex((n) => n.id === drag.draggedNoteId);
    if (from < 0 || from === nextTarget) return;

    const next = [...drag.dragPreviewNotes];
    const [item] = next.splice(from, 1);
    next.splice(nextTarget, 0, item);
    drag.dragPreviewNotes = next;
  }

  async function finalizeVerticalDrag() {
    const drag = deps.drag;
    if (!deps.getCanReorder() || !drag.draggedNoteId) return;

    const originIndex = deps
      .getVisibleNotes()
      .findIndex((n) => n.id === drag.draggedNoteId);
    const finalVisible = drag.dragPreviewNotes ?? deps.getVisibleNotes();
    const finalIndex = finalVisible.findIndex((n) => n.id === drag.draggedNoteId);
    const shouldPersist = originIndex >= 0 && finalIndex >= 0 && originIndex !== finalIndex;

    drag.draggedNoteId = null;
    drag.dragTargetIndex = null;
    drag.verticalDragStartY = null;
    drag.dragPreviewNotes = null;
    drag.dragGhostWidth = 0;
    drag.dragPointerOffsetY = 0;

    if (!shouldPersist) return;
    await deps.persistReorderedVisible(finalVisible);
  }

  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function handleVerticalDragEnd(e) {
    void e;
    void finalizeVerticalDrag();
  }

  /** @param {string} noteId */
  function createVerticalDragStartHandler(noteId) {
    /** @param {PointerEvent | TouchEvent | MouseEvent} e */
    return function onVerticalDragStart(e) {
      const index = deps.getVisibleNotes().findIndex((n) => n.id === noteId);
      if (index < 0) return;
      handleVerticalDragStart(e, index);
    };
  }

  /** @param {string} noteId */
  function createVerticalDragMoveHandler(noteId) {
    /**
     * @param {PointerEvent | TouchEvent | MouseEvent} e
     * @param {number} deltaY
     */
    return function onVerticalDragMove(e, deltaY) {
      if (deps.drag.draggedNoteId !== noteId) return;
      handleVerticalDragMove(e, deltaY);
    };
  }

  /** @param {string} noteId */
  function createVerticalDragEndHandler(noteId) {
    /** @param {PointerEvent | TouchEvent | MouseEvent} e */
    return function onVerticalDragEnd(e) {
      if (deps.drag.draggedNoteId !== noteId) return;
      handleVerticalDragEnd(e);
    };
  }

  /** @param {PointerEvent} e */
  function handleWindowPointerUp(e) {
    if (e.button !== 0) return;
    if (!deps.drag.draggedNoteId) return;
    void finalizeVerticalDrag();
  }

  function handleWindowPointerCancel() {
    if (!deps.drag.draggedNoteId) return;
    void finalizeVerticalDrag();
  }

  return {
    createVerticalDragStartHandler,
    createVerticalDragMoveHandler,
    createVerticalDragEndHandler,
    handleWindowPointerUp,
    handleWindowPointerCancel,
  };
}
