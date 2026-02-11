<script>
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
    toggleDone,
    updatePriority,
  } = $props();

  const QUADRANTS = [
    { key: 1, title: () => strings.quadrantQ1, subtitle: () => strings.quadrantQ1Desc },
    { key: 2, title: () => strings.quadrantQ2, subtitle: () => strings.quadrantQ2Desc },
    { key: 3, title: () => strings.quadrantQ3, subtitle: () => strings.quadrantQ3Desc },
    { key: 4, title: () => strings.quadrantQ4, subtitle: () => strings.quadrantQ4Desc },
  ];

  /** @param {number | undefined | null} p */
  function normalizePriority(p) {
    if (p == null) return null;
    const v = Number(p);
    if (!Number.isFinite(v)) return null;
    return Math.max(1, Math.min(4, v));
  }

  /** @param {number | undefined | null} p */
  function priorityBadge(p) {
    const normalized = normalizePriority(p);
    return normalized == null ? "" : `Q${normalized}`;
  }

  /** @param {number | undefined | null} p */
  function priorityActionLabel(p) {
    const normalized = normalizePriority(p);
    return normalized == null ? strings.priorityUnassigned : `Q${normalized}`;
  }

  /**
   * @param {any} note
   * @returns {string[]}
   */
  function noteTags(note) {
    if (!Array.isArray(note?.tags)) return [];
    const raw = /** @type {any[]} */ (note.tags);
    return raw
      .map((/** @type {any} */ t) => String(t || "").trim())
      .filter(
        (/** @type {string} */ t, /** @type {number} */ idx, /** @type {string[]} */ arr) =>
          !!t && arr.indexOf(t) === idx,
      );
  }

  /** @param {number} q */
  function quadrantNotes(q) {
    const safe = Math.max(1, Math.min(4, Number(q) || 4));
    const scoped = renderedNotes.filter(
      (/** @type {{ id?: string | number; priority?: number }} */ n) => normalizePriority(n.priority) === safe,
    );
    const seen = new Set();
    return scoped.filter((/** @type {{ id?: string | number }} */ n) => {
      const id = String(n.id ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  const totalCount = $derived(renderedNotes.length);
  const doneCount = $derived(renderedNotes.filter((/** @type {{ isDone?: boolean }} */ n) => !!n.isDone).length);
  let draggingNoteId = $state(/** @type {string | null} */ (null));
  let hoverQuadrant = $state(/** @type {number | null} */ (null));
  let hoverAnchorId = $state(/** @type {string | null} */ (null));
  let hoverBeforeAnchor = $state(true);
  let hoverInsertIndex = $state(/** @type {number | null} */ (null));
  let priorityMenuNoteId = $state(/** @type {string | null} */ (null));
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

  function endQuadrantDrag() {
    draggingNoteId = null;
    hoverQuadrant = null;
    hoverAnchorId = null;
    hoverBeforeAnchor = true;
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
   * Pointer-based drag (single source of truth for workstation quadrant).
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
    hoverAnchorId = null;
    hoverBeforeAnchor = true;
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
    // Use a stable probe inside dragged ghost.
    const probeX = dragGhostLeft + Math.min(Math.max(24, dragGhostWidth * 0.28), dragGhostWidth - 24);
    const probeY = dragGhostTop + Math.max(20, Math.min(42, dragGhostHeight * 0.28));
    const ghostCenterY = dragGhostTop + dragGhostHeight / 2;
    const dragDirectionDown = lastGhostCenterY == null ? true : ghostCenterY >= lastGhostCenterY;
    lastGhostCenterY = ghostCenterY;
    const cellCandidates = /** @type {HTMLElement[]} */ (
      Array.from(document.querySelectorAll("[data-quadrant-key]"))
    );
    /** @type {HTMLElement | null} */
    let quadrantCell = null;
    for (const cell of cellCandidates) {
      const rect = cell.getBoundingClientRect();
      if (
        probeX >= rect.left &&
        probeX <= rect.right &&
        probeY >= rect.top &&
        probeY <= rect.bottom
      ) {
        quadrantCell = cell;
        break;
      }
    }
    if (!quadrantCell && hoverQuadrant != null) {
      quadrantCell =
        /** @type {HTMLElement | null} */ (document.querySelector(`[data-quadrant-key="${hoverQuadrant}"]`));
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
      hoverAnchorId = null;
      hoverBeforeAnchor = true;
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
      // 50% coverage trigger + movement direction decides before/after.
      insertIndex = dominantIndex + (dragDirectionDown ? 1 : 0);
    } else {
      for (let i = 0; i < cards.length; i += 1) {
        const rect = cards[i].getBoundingClientRect();
        const splitY = rect.top + rect.height / 2;
        if (probeY > splitY) insertIndex = i + 1;
      }
    }
    hoverInsertIndex = insertIndex;

    if (insertIndex <= 0) {
      hoverAnchorId = String(cards[0].getAttribute("data-note-id") || "");
      hoverBeforeAnchor = true;
    } else if (insertIndex >= cards.length) {
      hoverAnchorId = String(cards[cards.length - 1].getAttribute("data-note-id") || "");
      hoverBeforeAnchor = false;
    } else {
      hoverAnchorId = String(cards[insertIndex].getAttribute("data-note-id") || "");
      hoverBeforeAnchor = true;
    }
  }

  /**
   * @param {number} quadrantKey
   * @returns {Array<{ kind: "note"; note: any; key: string } | { kind: "placeholder"; key: string }>}
   */
  function quadrantRenderItems(quadrantKey) {
    const notes = quadrantNotes(quadrantKey);
    const base = notes
      .filter((/** @type {any} */ n) => String(n.id) !== draggingNoteId)
      .map((/** @type {any} */ note) => ({ kind: /** @type {"note"} */ ("note"), note, key: `note-${note.id}` }));
    if (!pointerDragActive || !draggingNoteId || hoverQuadrant !== quadrantKey) return base;

    let insertAt = hoverInsertIndex ?? base.length;

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

  /** @param {string} noteId */
  function togglePriorityMenu(noteId) {
    priorityMenuNoteId = priorityMenuNoteId === noteId ? null : noteId;
  }

  /**
   * @param {any} note
   * @param {number | null} next
   */
  async function selectPriority(note, next) {
    await updatePriority(note, next);
    priorityMenuNoteId = null;
  }

  /** @param {PointerEvent} e */
  function onWindowPointerDown(e) {
    const target = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
    if (!target) return;
    if (target.closest(".priority-wrap")) return;
    priorityMenuNoteId = null;
  }

  /**
   * @param {any[]} notesList
   * @param {string} draggedId
   * @param {string | null} anchorId
   * @param {boolean} before
   */
  function reorderByAnchor(notesList, draggedId, anchorId, before) {
    const from = notesList.findIndex((n) => String(n.id) === draggedId);
    if (from < 0) return notesList;
    const next = [...notesList];
    const [dragged] = next.splice(from, 1);
    let insertAt = next.length;
    if (anchorId) {
      const targetIndex = next.findIndex((n) => String(n.id) === anchorId);
      if (targetIndex >= 0) {
        insertAt = before ? targetIndex : targetIndex + 1;
      }
    }
    next.splice(Math.max(0, insertAt), 0, dragged);
    return next;
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

  /**
   * @param {DragEvent} event
   * @param {number} quadrant
   */
  function overQuadrant(event, quadrant) {
    event.preventDefault();
    hoverQuadrant = Math.max(1, Math.min(4, Number(quadrant) || 4));
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  /**
   * @param {DragEvent} event
   * @param {{ id: string; priority?: number }} note
   */
  function overQuadrantCard(event, note) {
    event.preventDefault();
    const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    hoverAnchorId = String(note.id);
    hoverBeforeAnchor = event.clientY <= midY;
    hoverQuadrant = normalizePriority(note.priority) ?? 4;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
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

    if (
      canQuadrantReorder &&
      viewMode === "quadrant"
    ) {
      const quadrant = normalizePriority(dragged.priority);
      if (quadrant != null) {
        const scoped = renderedNotes.filter(
          (/** @type {{ priority?: number }} */ n) => normalizePriority(n.priority) === quadrant,
        );
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

<section class="workbench">
  <div class="summary">
    <div class="summary-chip">{strings.workspaceTitle}</div>
    <div class="summary-chip">{totalCount} {strings.active.toLowerCase()}</div>
    <div class="summary-chip">{doneCount} {strings.markDone.toLowerCase()}</div>
  </div>

  {#if viewMode === "quadrant"}
    <div class="quadrant-board" class:drag-active={!!draggingNoteId}>
      {#each QUADRANTS as q (q.key)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <section
          class="quadrant-cell"
          data-quadrant-key={q.key}
          class:drop-target={hoverQuadrant === q.key}
        >
          <header class="quadrant-head">
            <div class="quadrant-head-top">
              <h4>{q.title()}</h4>
              <span class="quadrant-count">{quadrantNotes(q.key).length}</span>
            </div>
            <p>{q.subtitle()}</p>
          </header>
          <div class="quadrant-list">
            {#if quadrantRenderItems(q.key).length === 0}
              <div class="empty" class:drop-empty={hoverQuadrant === q.key}>{strings.emptyInQuadrant}</div>
            {:else}
              {#each quadrantRenderItems(q.key) as item (item.key)}
                {#if item.kind === "placeholder"}
                  <div class="quadrant-placeholder" style={dragGhostHeight > 0 ? `height:${dragGhostHeight}px;` : undefined}>
                    <div class="placeholder-inner"></div>
                  </div>
                {:else}
                  {@const note = item.note}
                  <article
                    class="card quadrant-note-card"
                    data-note-id={note.id}
                    class:dragging={draggingNoteId === String(note.id)}
                    ondblclick={() => openView(note)}
                  >
                    <div class="card-top">
                      <button
                        type="button"
                        class="drag-handle"
                        title={strings.dragToReorder}
                        onpointerdown={(e) => startPointerDrag(e, note)}
                      >
                        {@render iconDragHandle()}
                      </button>
                      {#if priorityBadge(note.priority)}
                        <span class="priority-tag">{priorityBadge(note.priority)}</span>
                      {/if}
                      <span class="date">{formatDate(note.updatedAt)}</span>
                    </div>
                    <div class="card-body">
                      <div class="text" class:done={note.isDone}>{@html note.renderedHtml}</div>
                      {#if noteTags(note).length > 0}
                        <div class="tag-row">
                          {#each noteTags(note).slice(0, 4) as tag (tag)}
                            <span class="tag-chip">#{tag}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <div class="actions quadrant-actions">
                      <button type="button" class="action-btn" title={strings.edit} onclick={() => openEdit(note)}
                        >{@render iconEdit()}</button
                      >
                      <button
                        type="button"
                        class="action-btn"
                        title={note.isDone ? strings.markUndone : strings.markDone}
                        onclick={() => toggleDone(note)}
                      >
                        {#if note.isDone}
                          {@render iconCheckBox()}
                        {:else}
                          {@render iconCheckBoxOutline()}
                        {/if}
                      </button>
                      <div class="priority-wrap">
                        <button
                          type="button"
                          class="action-btn priority"
                          title={`${strings.priority}: ${priorityActionLabel(note.priority)}`}
                          onclick={() => togglePriorityMenu(String(note.id))}
                        >
                          {priorityActionLabel(note.priority)}
                        </button>
                        {#if priorityMenuNoteId === String(note.id)}
                          <div class="priority-menu">
                            <button type="button" class="priority-item" onclick={() => selectPriority(note, null)}>
                              {strings.priorityUnassigned}
                            </button>
                            <button type="button" class="priority-item" onclick={() => selectPriority(note, 1)}>Q1</button>
                            <button type="button" class="priority-item" onclick={() => selectPriority(note, 2)}>Q2</button>
                            <button type="button" class="priority-item" onclick={() => selectPriority(note, 3)}>Q3</button>
                            <button type="button" class="priority-item" onclick={() => selectPriority(note, 4)}>Q4</button>
                          </div>
                        {/if}
                      </div>
                    </div>
                  </article>
                {/if}
              {/each}
            {/if}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <div class="grid">
      {#each renderedNotes as note (note.id)}
        <article class="card" ondblclick={() => openView(note)}>
          <div class="card-top">
            {#if priorityBadge(note.priority)}
              <span class="priority-tag">{priorityBadge(note.priority)}</span>
            {/if}
            <span class="date">{formatDate(note.updatedAt)}</span>
          </div>
          <div class="card-body">
            <div class="text" class:done={note.isDone}>{@html note.renderedHtml}</div>
            {#if noteTags(note).length > 0}
              <div class="tag-row">
                {#each noteTags(note).slice(0, 4) as tag (tag)}
                  <span class="tag-chip">#{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
          <div class="actions">
            {#if viewMode === "trash"}
              <button type="button" class="action-btn" title={strings.restore} onclick={() => restoreNote(note)}
                >{@render iconRestore()}</button
              >
              <button
                type="button"
                class="action-btn danger"
                title={strings.permanentlyDelete}
                onclick={() => deleteNote(note)}
              >
                {@render iconDelete()}
              </button>
            {:else}
              <button type="button" class="action-btn" title={strings.edit} onclick={() => openEdit(note)}
                >{@render iconEdit()}</button
              >
              <button
                type="button"
                class="action-btn"
                title={note.isDone ? strings.markUndone : strings.markDone}
                onclick={() => toggleDone(note)}
              >
                {#if note.isDone}
                  {@render iconCheckBox()}
                {:else}
                  {@render iconCheckBoxOutline()}
                {/if}
              </button>
              <div class="priority-wrap">
                <button
                  type="button"
                  class="action-btn priority"
                  title={`${strings.priority}: ${priorityActionLabel(note.priority)}`}
                  onclick={() => togglePriorityMenu(String(note.id))}
                >
                  {priorityActionLabel(note.priority)}
                </button>
                {#if priorityMenuNoteId === String(note.id)}
                  <div class="priority-menu">
                    <button type="button" class="priority-item" onclick={() => selectPriority(note, null)}>
                      {strings.priorityUnassigned}
                    </button>
                    <button type="button" class="priority-item" onclick={() => selectPriority(note, 1)}>Q1</button>
                    <button type="button" class="priority-item" onclick={() => selectPriority(note, 2)}>Q2</button>
                    <button type="button" class="priority-item" onclick={() => selectPriority(note, 3)}>Q3</button>
                    <button type="button" class="priority-item" onclick={() => selectPriority(note, 4)}>Q4</button>
                  </div>
                {/if}
              </div>
              {#if viewMode === "active"}
                <button
                  type="button"
                  class="action-btn"
                  title={note.isPinned ? strings.unpinNote : strings.pinNote}
                  onclick={() => togglePin(note)}
                >
                  {#if note.isPinned}
                    {@render iconPinFilled()}
                  {:else}
                    {@render iconPinOutline()}
                  {/if}
                </button>
                {#if note.isPinned}
                  <button
                    type="button"
                    class="action-btn"
                    title={note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
                    onclick={() => toggleZOrder(note)}
                  >
                    {#if note.isAlwaysOnTop}
                      {@render iconLayerTop()}
                    {:else}
                      {@render iconLayerBottom()}
                    {/if}
                  </button>
                {/if}
              {/if}
              <button
                type="button"
                class="action-btn"
                title={note.isArchived ? strings.unarchive : strings.archive}
                onclick={() => toggleArchive(note)}
              >
                {#if note.isArchived}
                  {@render iconUnarchive()}
                {:else}
                  {@render iconArchive()}
                {/if}
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

{#if pointerDragActive && draggingNote}
  <div
    class="quadrant-drag-ghost"
    style={`top:${dragGhostTop}px;left:${dragGhostLeft}px;width:${Math.max(220, dragGhostWidth)}px;height:${Math.max(120, dragGhostHeight)}px;`}
  >
    <div class="ghost-inner">
      <div class="ghost-top">
        {#if priorityBadge(draggingNote.priority)}
          <span class="priority-tag">{priorityBadge(draggingNote.priority)}</span>
        {/if}
        <span class="date">{formatDate(draggingNote.updatedAt)}</span>
      </div>
      <div class="ghost-text" class:done={draggingNote.isDone}>{@html draggingNote.renderedHtml}</div>
    </div>
  </div>
{/if}

<svelte:window
  onpointerdown={onWindowPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
/>

{#snippet iconDragHandle()}
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.9">
    <path d="M7 6h10M7 12h10M7 18h10"></path>
  </svg>
{/snippet}

{#snippet iconRestore()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
    />
  </svg>
{/snippet}

{#snippet iconDelete()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    />
  </svg>
{/snippet}

{#snippet iconArchive()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconUnarchive()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconEdit()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
{/snippet}

{#snippet iconPinOutline()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z" />
  </svg>
{/snippet}

{#snippet iconPinFilled()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
{/snippet}

{#snippet iconCheckBoxOutline()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBox()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
{/snippet}

{#snippet iconLayerTop()}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
    <rect x="5" y="15" width="14" height="4" rx="1.3"></rect>
    <path d="M12 5v7"></path>
    <path d="M9 9.8 12 12.8l3-3"></path>
  </svg>
{/snippet}

{#snippet iconLayerBottom()}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
    <rect x="5" y="5" width="14" height="4" rx="1.3"></rect>
    <path d="M12 19v-7"></path>
    <path d="M9 14.2 12 11.2l3 3"></path>
  </svg>
{/snippet}

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

  .summary {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .summary-chip {
    font-size: 11px;
    line-height: 1;
    color: var(--ws-text, #334155);
    border: 1px solid var(--ws-border-soft, #d7e1f0);
    background: var(--ws-btn-bg, linear-gradient(180deg, #fbfdff 0%, #f2f7ff 100%));
    border-radius: 999px;
    padding: 7px 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }

  .card {
    position: relative;
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 12px;
    background: var(--ws-card-bg, linear-gradient(180deg, #ffffff 0%, #fbfdff 100%));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 176px;
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      border-color 0.16s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    border-color: #ccd9ea;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
  }

  .card-top .date {
    margin-left: auto;
  }

  .card-body {
    min-height: 0;
    flex: 1;
  }

  .priority-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-text, #334155);
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    padding: 3px 7px;
  }

  .text {
    color: var(--ws-text-strong, #1f2937);
    font-size: 14px;
    line-height: 1.45;
    max-height: 132px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent);
    mask-image: linear-gradient(180deg, #000 78%, transparent);
  }

  .text :global(*) {
    margin: 0 0 4px;
    font-size: 13px;
    line-height: 1.4;
  }

  .text :global(ul),
  .text :global(ol) {
    padding-left: 16px;
  }

  .text :global(img) {
    display: block;
    max-width: 100%;
    max-height: 86px;
    width: auto;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--ws-border-soft, #e5eaf2);
    background: var(--ws-btn-bg, #f8fafc);
  }

  .text :global(pre) {
    overflow: hidden;
    border-radius: 6px;
    font-size: 12px;
  }

  .text :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .text.done {
    text-decoration: line-through;
    color: var(--ws-muted, #94a3b8);
  }

  .tag-row {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .tag-chip {
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-muted, #64748b);
    font-size: 10px;
    line-height: 1;
    padding: 4px 7px;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
    white-space: nowrap;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .action-btn {
    border: 1px solid var(--ws-border-soft, #dbe3ef);
    border-radius: 6px;
    background: var(--ws-btn-bg, #f9fbff);
    color: var(--ws-text, #4b5563);
    font-size: 11px;
    padding: 4px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.16s ease;
  }

  .action-btn:hover {
    background: var(--ws-btn-hover, #eef3fb);
    border-color: var(--ws-border-hover, #c9d5e8);
    color: var(--ws-text-strong, #1f2937);
  }

  .action-btn.priority {
    font-weight: 700;
    width: auto;
    min-width: 30px;
    padding: 4px 7px;
    color: var(--ws-text, #334155);
  }

  .action-btn.danger {
    color: #b91c1c;
    border-color: #fecaca;
    background: #fef2f2;
  }

  .quadrant-board {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .quadrant-board.drag-active {
    cursor: move;
  }

  .quadrant-cell {
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 12px;
    background: var(--ws-card-bg, linear-gradient(180deg, #ffffff 0%, #fbfdff 100%));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 240px;
    transition:
      border-color 0.16s ease,
      box-shadow 0.16s ease,
      background 0.16s ease;
  }

  .quadrant-board.drag-active .quadrant-cell {
    border-color: color-mix(in srgb, var(--ws-border-active, #94a3b8) 50%, var(--ws-border, #dbe5f1));
  }

  .quadrant-cell.drop-target {
    border-color: var(--ws-border-active, #94a3b8);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ws-border-active, #94a3b8) 45%, transparent);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-btn-hover, #f4f8ff) 46%, transparent) 0%,
        color-mix(in srgb, var(--ws-card-bg, #fbfdff) 95%, transparent) 100%
      );
    animation: quadrant-target-glow 0.55s ease;
  }

  .quadrant-head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .quadrant-head h4 {
    margin: 0;
    font-size: 12px;
    color: var(--ws-text-strong, #1f2937);
  }

  .quadrant-head p {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .quadrant-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-text, #334155);
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    padding: 2px 8px;
    min-width: 24px;
    text-align: center;
  }

  .quadrant-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
    min-height: 0;
    scrollbar-width: none;
  }

  .quadrant-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .empty {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
  }

  .empty.drop-empty {
    border: 1px dashed var(--ws-border-active, #94a3b8);
    border-radius: 10px;
    padding: 10px;
    color: var(--ws-text, #334155);
    background: color-mix(in srgb, var(--ws-btn-hover, #f4f8ff) 65%, transparent);
  }

  .quadrant-note-card {
    min-height: 132px;
    padding: 9px;
    gap: 6px;
    cursor: grab;
    transition:
      opacity 0.14s ease,
      transform 0.14s ease,
      box-shadow 0.14s ease,
      border-color 0.14s ease,
      background 0.14s ease;
  }

  .quadrant-note-card .text {
    user-select: none;
  }

  .drag-handle {
    width: 22px;
    height: 22px;
    border-radius: 8px;
    border: 1px solid var(--ws-border-soft, #d7dfec);
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-muted, #64748b);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    flex-shrink: 0;
  }

  .drag-handle:hover {
    border-color: var(--ws-border-hover, #c9d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    color: var(--ws-text, #334155);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .quadrant-note-card .text {
    font-size: 13px;
    max-height: 96px;
    -webkit-mask-image: linear-gradient(180deg, #000 74%, transparent);
    mask-image: linear-gradient(180deg, #000 74%, transparent);
  }

  .quadrant-actions {
    opacity: 0.1;
    transform: translateY(2px);
    transition:
      opacity 0.16s ease,
      transform 0.16s ease;
  }

  .priority-wrap {
    position: relative;
  }

  .priority-menu {
    position: absolute;
    z-index: 12;
    right: 0;
    bottom: calc(100% + 6px);
    min-width: 108px;
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, #ffffff) 92%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
    display: flex;
    flex-direction: column;
    padding: 4px;
    gap: 2px;
  }

  .priority-item {
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 12px;
    text-align: left;
    padding: 6px 8px;
    cursor: pointer;
  }

  .priority-item:hover {
    border-color: var(--ws-border-soft, #d7dfec);
    background: var(--ws-btn-hover, #f4f8ff);
    color: var(--ws-text-strong, #1f2937);
  }

  .quadrant-note-card:hover .quadrant-actions,
  .quadrant-note-card:focus-within .quadrant-actions {
    opacity: 1;
    transform: translateY(0);
  }

  .quadrant-note-card.dragging {
    opacity: 0.18;
    transform: scale(0.98);
    border-style: dashed;
    border-color: var(--ws-border-active, #94a3b8);
    background: color-mix(in srgb, var(--ws-btn-hover, #f4f8ff) 58%, transparent);
    cursor: grabbing;
  }

  .quadrant-note-card.dragging::after {
    content: "拖动中";
    position: absolute;
    right: 10px;
    bottom: 10px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-border-active, #94a3b8);
    letter-spacing: 0.02em;
  }

  .quadrant-placeholder {
    width: 100%;
    min-height: 132px;
    border-radius: 12px;
    border: 1px dashed var(--ws-border-active, #94a3b8);
    background: color-mix(in srgb, var(--ws-btn-hover, #f4f8ff) 58%, transparent);
    padding: 6px;
  }

  .placeholder-inner {
    width: 100%;
    height: 100%;
    min-height: 110px;
    border-radius: 10px;
    border: 1px dashed color-mix(in srgb, var(--ws-border-active, #94a3b8) 64%, transparent);
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 12%, transparent);
  }

  .quadrant-drag-ghost {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    border-radius: 12px;
    border: 1px dashed var(--ws-border-active, #94a3b8);
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 82%, transparent);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
    backdrop-filter: blur(2px);
  }

  .ghost-inner {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    border: 1px dashed color-mix(in srgb, var(--ws-border-active, #94a3b8) 68%, transparent);
    padding: 9px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background:
      linear-gradient(
        100deg,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 8%, transparent) 20%,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 24%, transparent) 50%,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 8%, transparent) 80%
      );
    animation: ghost-sweep 1s linear infinite;
  }

  .ghost-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ghost-top .date {
    margin-left: auto;
  }

  .ghost-text {
    color: var(--ws-text-strong, #1f2937);
    font-size: 13px;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    line-clamp: 4;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .ghost-text.done {
    text-decoration: line-through;
    color: var(--ws-muted, #94a3b8);
  }

  @keyframes ghost-sweep {
    0% {
      filter: brightness(0.96);
    }
    50% {
      filter: brightness(1.06);
    }
    100% {
      filter: brightness(0.96);
    }
  }

  @keyframes quadrant-target-glow {
    0% {
      box-shadow: inset 0 0 0 0 color-mix(in srgb, var(--ws-border-active, #94a3b8) 0%, transparent);
    }
    100% {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ws-border-active, #94a3b8) 45%, transparent);
    }
  }

  @media (max-width: 760px) {
    .quadrant-board {
      grid-template-columns: 1fr;
    }
  }
</style>
