<script>
  import { tick } from "svelte";
  import { normalizeTagKey, normalizeTagText } from "$lib/note/tags.js";
  import { buildQuadrants, filterNotesByQuadrant, normalizePriority, priorityBadge } from "$lib/panel/note-priority.js";
  import WorkbenchDragGhost from "$lib/components/panel/workbench/WorkbenchDragGhost.svelte";
  import WorkbenchNoteGrid from "$lib/components/panel/workbench/WorkbenchNoteGrid.svelte";
  import WorkbenchPriorityMenu from "$lib/components/panel/workbench/WorkbenchPriorityMenu.svelte";
  import WorkbenchQuadrantBoard from "$lib/components/panel/workbench/WorkbenchQuadrantBoard.svelte";

  let {
    strings,
    viewMode,
    renderedNotes,
    canQuadrantReorder = false,
    persistReorderedVisible = async () => {},
    formatDate,
    restoreNote,
    toggleArchive,
    deleteNote,
    openEdit,
    openView,
    togglePin,
    toggleZOrder,
    toggleWallpaperLayer,
    toggleDone,
    updatePriority,
    updateTags = async () => {},
  } = $props();

  const QUADRANTS = $derived.by(() => buildQuadrants(strings));

  /** @param {number | undefined | null} p */
  function priorityActionLabel(p) {
    const normalized = normalizePriority(p);
    return normalized == null ? strings.priorityUnassigned : `Q${normalized}`;
  }

  /**
   * @param {string[]} current
   * @param {string} target
   */
  function hasTagText(current, target) {
    const needle = normalizeTagKey(target);
    if (!needle) return false;
    return current.some((t) => normalizeTagKey(t) === needle);
  }

  /**
   * @param {any} note
   * @returns {string[]}
   */
  function noteTags(note) {
    if (!Array.isArray(note?.tags)) return [];
    /** @type {Map<string, string>} */
    const unique = new Map();
    for (const raw of /** @type {any[]} */ (note.tags)) {
      const text = normalizeTagText(raw);
      const key = normalizeTagKey(text);
      if (!key || unique.has(key)) continue;
      unique.set(key, text);
    }
    return [...unique.values()];
  }

  /** @param {number} q */
  function quadrantNotes(q) {
    const scoped = filterNotesByQuadrant(renderedNotes, q);
    const seen = new Set();
    return scoped.filter((/** @type {{ id?: string | number }} */ n) => {
      const id = String(n.id ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  const usedTags = $derived.by(() => {
    /** @type {Map<string, { text: string; count: number }>} */
    const buckets = new Map();
    for (const note of renderedNotes) {
      for (const rawTag of noteTags(note)) {
        const text = normalizeTagText(rawTag);
        const key = normalizeTagKey(text);
        if (!key) continue;
        const prev = buckets.get(key);
        if (prev) {
          prev.count += 1;
        } else {
          buckets.set(key, { text, count: 1 });
        }
      }
    }
    return [...buckets.values()]
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.text.localeCompare(b.text)))
      .map((x) => x.text)
      .slice(0, 10);
  });

  let draggingNoteId = $state(/** @type {string | null} */ (null));
  let hoverQuadrant = $state(/** @type {number | null} */ (null));
  let hoverInsertIndex = $state(/** @type {number | null} */ (null));
  let priorityMenuNoteId = $state(/** @type {string | null} */ (null));
  let priorityMenuTagDraft = $state("");
  /** @type {HTMLDivElement | null} */
  let priorityMenuOverlayEl = $state(null);
  /** @type {HTMLInputElement | null} */
  let priorityMenuInputEl = $state(null);
  /** @type {HTMLElement | null} */
  let priorityMenuAnchorEl = $state(null);
  let priorityMenuStyle = $state("");
  let priorityMenuInputVersion = 0;
  let pointerDragActive = $state(false);
  /** @type {number | null} */
  let pointerDragId = $state(null);
  let dropInFlight = $state(false);
  let dragGhostTop = $state(0);
  let dragGhostLeft = $state(0);
  let dragGhostWidth = $state(0);
  let dragGhostHeight = $state(0);
  let dragPointerOffsetX = $state(0);
  let dragPointerOffsetY = $state(0);
  let lastGhostCenterY = $state(/** @type {number | null} */ (null));

  const draggingNote = $derived(
    draggingNoteId
      ? renderedNotes.find((/** @type {{ id: string | number }} */ n) => String(n.id) === draggingNoteId) ?? null
      : null,
  );

  const priorityMenuNote = $derived(
    priorityMenuNoteId
      ? renderedNotes.find((/** @type {{ id: string | number }} */ n) => String(n.id) === priorityMenuNoteId) ?? null
      : null,
  );

  function endQuadrantDrag() {
    draggingNoteId = null;
    hoverQuadrant = null;
    hoverInsertIndex = null;
    pointerDragActive = false;
    pointerDragId = null;
    dropInFlight = false;
    if (typeof document !== "undefined") {
      document.body.classList.remove("ws-note-dragging");
    }
    dragGhostWidth = 0;
    dragGhostHeight = 0;
    dragPointerOffsetX = 0;
    dragPointerOffsetY = 0;
    lastGhostCenterY = null;
  }

  /**
   * @param {PointerEvent} event
   * @param {{ id: string; priority?: number }} note
   */
  function startPointerDrag(event, note) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    pointerDragActive = true;
    pointerDragId = event.pointerId;
    draggingNoteId = String(note.id);
    hoverQuadrant = normalizePriority(note.priority) ?? 4;
    hoverInsertIndex = null;
    const handle = /** @type {HTMLElement | null} */ (event.currentTarget instanceof HTMLElement ? event.currentTarget : null);
    const card = /** @type {HTMLElement | null} */ (
      handle?.closest(".quadrant-note-card") instanceof HTMLElement ? handle.closest(".quadrant-note-card") : null
    );
    if (card) {
      const rect = card.getBoundingClientRect();
      dragGhostTop = rect.top;
      dragGhostLeft = rect.left;
      dragGhostWidth = rect.width;
      dragGhostHeight = rect.height;
      dragPointerOffsetX = Math.max(0, event.clientX - rect.left);
      dragPointerOffsetY = Math.max(0, event.clientY - rect.top);
      lastGhostCenterY = rect.top + rect.height / 2;
    }
    handle?.setPointerCapture?.(event.pointerId);
    if (typeof document !== "undefined") {
      document.body.classList.add("ws-note-dragging");
    }
  }

  /** @param {PointerEvent} event */
  function onPointerMove(event) {
    if (pointerDragId != null && event.pointerId !== pointerDragId) return;
    if (!pointerDragActive || !draggingNoteId) return;
    dragGhostTop = event.clientY - dragPointerOffsetY;
    dragGhostLeft = event.clientX - dragPointerOffsetX;
    const probeX = dragGhostLeft + Math.min(Math.max(24, dragGhostWidth * 0.28), dragGhostWidth - 24);
    const probeY = dragGhostTop + Math.max(20, Math.min(42, dragGhostHeight * 0.28));
    const ghostCenterY = dragGhostTop + dragGhostHeight / 2;
    const dragDirectionDown = lastGhostCenterY == null ? true : ghostCenterY >= lastGhostCenterY;
    lastGhostCenterY = ghostCenterY;
    const cellCandidates = /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll("[data-quadrant-key]")));
    /** @type {HTMLElement | null} */
    let quadrantCell = null;
    for (const cell of cellCandidates) {
      const rect = cell.getBoundingClientRect();
      if (probeX >= rect.left && probeX <= rect.right && probeY >= rect.top && probeY <= rect.bottom) {
        quadrantCell = cell;
        break;
      }
    }
    if (!quadrantCell && hoverQuadrant != null) {
      quadrantCell = /** @type {HTMLElement | null} */ (document.querySelector(`[data-quadrant-key="${hoverQuadrant}"]`));
    }
    if (!quadrantCell) return;

    const q = Number(quadrantCell.dataset.quadrantKey || "0");
    if (q >= 1 && q <= 4) {
      hoverQuadrant = q;
    }

    const listEl = /** @type {HTMLElement | null} */ (quadrantCell.querySelector(".quadrant-list"));
    if (!listEl) return;
    const cards = /** @type {HTMLElement[]} */ (Array.from(listEl.querySelectorAll(".quadrant-note-card"))).filter((card) => {
      const id = String(card.getAttribute("data-note-id") || "");
      return !!id && id !== draggingNoteId;
    });

    if (cards.length === 0) {
      hoverInsertIndex = 0;
      return;
    }

    let insertIndex = 0;
    const ghostTop = dragGhostTop;
    const ghostBottom = dragGhostTop + dragGhostHeight;
    let dominantIndex = -1;
    let dominantRatio = 0;
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect();
      const overlap = Math.max(0, Math.min(ghostBottom, rect.bottom) - Math.max(ghostTop, rect.top));
      const ratio = rect.height > 0 ? overlap / rect.height : 0;
      if (ratio > dominantRatio) {
        dominantRatio = ratio;
        dominantIndex = i;
      }
    }

    if (dominantIndex >= 0 && dominantRatio >= 0.5) {
      insertIndex = dominantIndex + (dragDirectionDown ? 1 : 0);
    } else {
      for (let i = 0; i < cards.length; i += 1) {
        const rect = cards[i].getBoundingClientRect();
        const splitY = rect.top + rect.height / 2;
        if (probeY > splitY) insertIndex = i + 1;
      }
    }
    hoverInsertIndex = insertIndex;

  }

  /**
   * @param {number} quadrantKey
   * @returns {Array<{ kind: "note"; note: any; key: string } | { kind: "placeholder"; key: string }>}
   */
  function quadrantRenderItems(quadrantKey) {
    const notes = quadrantNotes(quadrantKey);
    /** @type {Array<{ kind: "note"; note: any; key: string } | { kind: "placeholder"; key: string }>} */
    const base = notes
      .filter((/** @type {any} */ n) => String(n.id) !== draggingNoteId)
      .map((/** @type {any} */ note) => ({ kind: /** @type {"note"} */ ("note"), note, key: `note-${note.id}` }));
    if (!pointerDragActive || !draggingNoteId || hoverQuadrant !== quadrantKey) return base;

    const insertAt = hoverInsertIndex ?? base.length;
    const next = [...base];
    next.splice(Math.max(0, Math.min(next.length, insertAt)), 0, {
      kind: /** @type {"placeholder"} */ ("placeholder"),
      key: `placeholder-${quadrantKey}`,
    });
    return next;
  }

  /** @param {PointerEvent} event */
  async function onPointerUp(event) {
    if (pointerDragId != null && event.pointerId !== pointerDragId) return;
    if (!pointerDragActive || !draggingNoteId) return;
    if (dropInFlight) return;
    dropInFlight = true;
    const q = hoverQuadrant;
    if (q != null) {
      await dropToQuadrant(q);
      return;
    }
    endQuadrantDrag();
  }

  function closePriorityMenu() {
    priorityMenuNoteId = null;
    priorityMenuTagDraft = "";
    priorityMenuAnchorEl = null;
    priorityMenuStyle = "";
  }

  function updatePriorityMenuPosition() {
    if (!priorityMenuAnchorEl || typeof window === "undefined") return;
    const viewportPadding = 16;
    const menuWidth = Math.min(240, Math.max(176, window.innerWidth - viewportPadding * 2));
    const anchorRect = priorityMenuAnchorEl.getBoundingClientRect();
    const menuHeight = priorityMenuOverlayEl?.offsetHeight ?? 0;
    const gap = 6;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    const rightAlignedLeft = anchorRect.right - menuWidth;
    const leftAlignedLeft = anchorRect.left;
    const left =
      rightAlignedLeft < viewportPadding && leftAlignedLeft <= maxLeft
        ? Math.min(leftAlignedLeft, maxLeft)
        : Math.max(viewportPadding, Math.min(rightAlignedLeft, maxLeft));
    const topAbove = anchorRect.top - menuHeight - gap;
    const topBelow = anchorRect.bottom + gap;
    const maxTop = Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding);
    const top =
      menuHeight > 0 && topAbove >= viewportPadding
        ? topAbove
        : Math.max(viewportPadding, Math.min(topBelow, maxTop));
    priorityMenuStyle = `left:${Math.round(left)}px;top:${Math.round(top)}px;width:${Math.round(menuWidth)}px;`;
  }

  /**
   * @param {string} noteId
   * @param {HTMLElement | null} [anchor]
   */
  async function togglePriorityMenu(noteId, anchor = null) {
    if (priorityMenuNoteId === noteId) {
      closePriorityMenu();
      return;
    }
    priorityMenuNoteId = noteId;
    priorityMenuAnchorEl = anchor;
    priorityMenuTagDraft = "";
    priorityMenuStyle = "";
    await tick();
    updatePriorityMenuPosition();
    priorityMenuInputEl?.focus();
  }

  /** @param {Event} event */
  async function onPriorityTagInput(event) {
    const input = /** @type {HTMLInputElement | null} */ (event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null);
    if (!input) return;
    const nextValue = input.value;
    const start = input.selectionStart ?? nextValue.length;
    const end = input.selectionEnd ?? start;
    const version = ++priorityMenuInputVersion;
    priorityMenuTagDraft = nextValue;
    await tick();
    if (version !== priorityMenuInputVersion) return;
    if (!priorityMenuInputEl) return;
    priorityMenuInputEl.focus({ preventScroll: true });
    priorityMenuInputEl.setSelectionRange(start, end);
  }

  /**
   * @param {any} note
   * @param {number | null} next
   */
  async function selectPriority(note, next) {
    await updatePriority(note, next);
  }

  /**
   * @param {any} note
   * @param {string} tag
   */
  async function toggleCustomTag(note, tag) {
    const current = noteTags(note);
    const normalized = normalizeTagText(tag);
    if (!normalized) return;
    const exists = hasTagText(current, normalized);
    const normalizedKey = normalizeTagKey(normalized);
    const next = exists
      ? current.filter((t) => normalizeTagKey(t) !== normalizedKey)
      : [...current, normalized];
    await updateTags(note, next);
    await tick();
    updatePriorityMenuPosition();
  }

  /** @param {any} note */
  async function createCustomTag(note) {
    const current = noteTags(note);
    const normalized = normalizeTagText(priorityMenuTagDraft);
    if (!normalized || hasTagText(current, normalized)) {
      priorityMenuTagDraft = "";
      return;
    }
    await updateTags(note, [...current, normalized]);
    priorityMenuTagDraft = "";
    await tick();
    updatePriorityMenuPosition();
  }

  /** @param {PointerEvent} e */
  function onWindowPointerDown(e) {
    const target = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
    if (!target) return;
    if (target.closest(".priority-wrap")) return;
    if (target.closest(".priority-menu-overlay")) return;
    closePriorityMenu();
  }

  function onWorkbenchScroll() {
    if (!priorityMenuNoteId) return;
    updatePriorityMenuPosition();
  }

  /**
   * @param {any[]} notesList
   * @param {string} draggedId
   * @param {number} insertIndex
   */
  function reorderByIndex(notesList, draggedId, insertIndex) {
    const from = notesList.findIndex((n) => String(n.id) === draggedId);
    if (from < 0) return notesList;
    const next = [...notesList];
    const [dragged] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, dragged);
    return next;
  }

  /** @param {number} targetQuadrant */
  async function dropToQuadrant(targetQuadrant) {
    if (!draggingNoteId) {
      endQuadrantDrag();
      return;
    }
    const dragged = renderedNotes.find((/** @type {{ id: string }} */ n) => String(n.id) === draggingNoteId);
    if (!dragged) {
      endQuadrantDrag();
      return;
    }
    const nextPriority = Math.max(1, Math.min(4, Number(targetQuadrant) || 4));
    const sameQuadrant = normalizePriority(dragged.priority) === nextPriority;
    if (!sameQuadrant) {
      await updatePriority(dragged, nextPriority);
      endQuadrantDrag();
      return;
    }

    if (canQuadrantReorder && viewMode === "quadrant") {
      const quadrant = normalizePriority(dragged.priority);
      if (quadrant != null) {
        const scoped = renderedNotes.filter((/** @type {{ priority?: number }} */ n) => normalizePriority(n.priority) === quadrant);
        const reorderedScoped = reorderByIndex(scoped, draggingNoteId, hoverInsertIndex ?? scoped.length);
        let scopedIndex = 0;
        const merged = renderedNotes.map((/** @type {any} */ n) =>
          normalizePriority(n.priority) === quadrant ? reorderedScoped[scopedIndex++] : n,
        );
        const seen = new Set();
        const deduped = merged.filter((/** @type {any} */ n) => {
          const id = String(n.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        await persistReorderedVisible(deduped);
      }
    }
    endQuadrantDrag();
  }
</script>

<section class="workbench" onscroll={onWorkbenchScroll}>
  {#if viewMode === "quadrant"}
    <WorkbenchQuadrantBoard
      {strings}
      quadrants={QUADRANTS}
      {draggingNoteId}
      {hoverQuadrant}
      {dragGhostHeight}
      {quadrantNotes}
      {quadrantRenderItems}
      {noteTags}
      {formatDate}
      {priorityBadge}
      {priorityActionLabel}
      {openView}
      {openEdit}
      {toggleArchive}
      {togglePin}
      {toggleZOrder}
      {toggleWallpaperLayer}
      {toggleDone}
      {togglePriorityMenu}
      {deleteNote}
      {startPointerDrag}
    />
  {:else}
    <WorkbenchNoteGrid
      {strings}
      {viewMode}
      {renderedNotes}
      {noteTags}
      {formatDate}
      {priorityBadge}
      {priorityActionLabel}
      {restoreNote}
      {toggleArchive}
      {deleteNote}
      {openEdit}
      {openView}
      {togglePin}
      {toggleZOrder}
      {toggleWallpaperLayer}
      {toggleDone}
      {togglePriorityMenu}
    />
  {/if}
</section>

<WorkbenchPriorityMenu
  {priorityMenuNote}
  {strings}
  {usedTags}
  {noteTags}
  {hasTagText}
  {priorityMenuStyle}
  {priorityMenuTagDraft}
  {selectPriority}
  {toggleCustomTag}
  {onPriorityTagInput}
  {createCustomTag}
  bind:priorityMenuOverlayEl
  bind:priorityMenuInputEl
/>

<WorkbenchDragGhost
  {pointerDragActive}
  {draggingNote}
  {dragGhostTop}
  {dragGhostLeft}
  {dragGhostWidth}
  {dragGhostHeight}
  {priorityBadge}
  {formatDate}
/>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onresize={updatePriorityMenuPosition}
/>

<style>
  .workbench {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .workbench::-webkit-scrollbar {
    width: 9px;
    height: 9px;
  }

  .workbench::-webkit-scrollbar-track {
    background: var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
    border-radius: 999px;
  }

  .workbench::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  .workbench::-webkit-scrollbar-thumb:hover {
    background: var(--ws-scrollbar-thumb-hover, rgba(51, 65, 85, 0.62));
  }

</style>
