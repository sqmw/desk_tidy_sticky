<script>
  import Dismissible from "$lib/Dismissible.svelte";
  import { nextPriority, priorityBadge } from "$lib/panel/note-priority.js";

  let {
    strings,
    viewMode,
    note,
    canReorder,
    formatDate,
    restoreNote,
    toggleArchive,
    deleteNote,
    openEdit,
    togglePin,
    toggleZOrder,
    toggleWallpaperLayer,
    toggleDone,
    updatePriority,
    createVerticalDragStartHandler,
    createVerticalDragMoveHandler,
    createVerticalDragEndHandler,
  } = $props();

  /** @param {number | undefined | null} priority */
  function priorityActionLabel(priority) {
    const badge = priorityBadge(priority);
    return badge || strings.priorityUnassigned;
  }

  /** @param {PointerEvent} event */
  function stopActionPointerIfNotReorder(event) {
    const target = /** @type {Element | null} */ (event.target instanceof Element ? event.target : null);
    if (target?.closest('[data-reorder-handle="true"]')) return;
    event.stopPropagation();
  }
</script>

<Dismissible
  leftBg={viewMode === "trash" ? "#43a047" : "#607d8b"}
  leftIcon={viewMode === "trash" ? iconRestore : iconArchive}
  rightBg="#e53935"
  rightIcon={iconDelete}
  enableVerticalDrag={canReorder}
  verticalDragHandleSelector='[data-reorder-handle="true"]'
  onSwipeRight={() => (viewMode === "trash" ? restoreNote(note) : toggleArchive(note))}
  onSwipeLeft={() => deleteNote(note)}
  onVerticalDragStart={createVerticalDragStartHandler(note.id)}
  onVerticalDragMove={createVerticalDragMoveHandler(note.id)}
  onVerticalDragEnd={createVerticalDragEndHandler(note.id)}
>
  {#snippet content()}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="note-item" class:pinned={note.isPinned} class:muted={note.isArchived || note.isDeleted} role="listitem">
      <div class="note-content">
        <div class="note-text rendered" class:done={note.isDone}>{@html note.renderedHtml}</div>
        <span class="note-date">{formatDate(note.updatedAt)}</span>
      </div>
      <div
        class="note-actions"
        onpointerdown={stopActionPointerIfNotReorder}
        onpointerup={stopActionPointerIfNotReorder}
      >
        {#if viewMode === "trash"}
          <button type="button" class="action-btn" title={strings.restore} onclick={() => restoreNote(note)}
            >{@render iconRestore()}</button
          >
          <button
            type="button"
            class="action-btn danger"
            title={strings.permanentlyDelete}
            onclick={() => deleteNote(note)}
            >{@render iconDelete()}</button
          >
        {:else}
          <button
            type="button"
            class="action-btn"
            title={strings.edit}
            onclick={(event) => {
              event.stopPropagation();
              openEdit(note);
            }}>{@render iconEdit()}</button
          >
          {#if viewMode === "active"}
            <button
              type="button"
              class="action-btn"
              title={note.isPinned ? strings.unpinNote : strings.pinNote}
              onclick={(event) => {
                event.stopPropagation();
                togglePin(note);
              }}
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
                class:zorder-toggle={true}
                class:active={note.isAlwaysOnTop}
                title={note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
                onclick={() => toggleZOrder(note)}
              >
                {#if note.isAlwaysOnTop}
                  {@render iconLayerTop()}
                {:else}
                  {@render iconLayerBottom()}
                {/if}
              </button>
              {#if !note.isAlwaysOnTop}
                <button
                  type="button"
                  class="action-btn wallpaper-toggle"
                  class:active={note.isWallpaper}
                  title={note.isWallpaper ? strings.pinToDesktopLayer : strings.pinToWallpaper}
                  onclick={() => toggleWallpaperLayer(note)}
                >
                  {@render iconWallpaperLayer()}
                </button>
              {/if}
            {/if}
          {/if}
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
          {#if viewMode !== "trash"}
            <button
              type="button"
              class="action-btn priority-btn"
              title={`${strings.priority}: ${priorityActionLabel(note.priority)}`}
              onclick={() => updatePriority(note, nextPriority(note.priority))}
            >
              {priorityActionLabel(note.priority)}
            </button>
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
        {#if canReorder}
          <button
            type="button"
            class="action-btn reorder-handle"
            data-reorder-handle="true"
            title={strings.dragToReorder}
          >
            {@render iconDragHandle()}
          </button>
        {/if}
      </div>
    </div>
  {/snippet}
</Dismissible>

{#snippet iconRestore()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
    />
  </svg>
{/snippet}

{#snippet iconDelete()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    />
  </svg>
{/snippet}

{#snippet iconArchive()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconUnarchive()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconEdit()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
{/snippet}

{#snippet iconPinOutline()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z" />
  </svg>
{/snippet}

{#snippet iconPinFilled()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
{/snippet}

{#snippet iconCheckBoxOutline()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBox()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
{/snippet}

{#snippet iconDragHandle()}
  <svg viewBox="0 0 24 32" width="18" height="24" fill="currentColor">
    <rect x="7.5" y="1.5" width="3" height="5" rx="1.5" />
    <rect x="13.5" y="1.5" width="3" height="5" rx="1.5" />
    <rect x="7.5" y="9.5" width="3" height="5" rx="1.5" />
    <rect x="13.5" y="9.5" width="3" height="5" rx="1.5" />
    <rect x="7.5" y="17.5" width="3" height="5" rx="1.5" />
    <rect x="13.5" y="17.5" width="3" height="5" rx="1.5" />
    <rect x="7.5" y="25.5" width="3" height="5" rx="1.5" />
    <rect x="13.5" y="25.5" width="3" height="5" rx="1.5" />
  </svg>
{/snippet}

{#snippet iconLayerTop()}
  <svg class="zorder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <rect x="5" y="15" width="14" height="4" rx="1.3"></rect>
    <path d="M12 5v7"></path>
    <path d="M9 9.8 12 12.8l3-3"></path>
  </svg>
{/snippet}

{#snippet iconLayerBottom()}
  <svg class="zorder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <rect x="5" y="5" width="14" height="4" rx="1.3"></rect>
    <path d="M12 19v-7"></path>
    <path d="M9 14.2 12 11.2l3 3"></path>
  </svg>
{/snippet}

{#snippet iconWallpaperLayer()}
  <svg class="zorder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
    <rect x="4.5" y="5" width="15" height="10" rx="2"></rect>
    <path d="M7 13l2.8-2.8 2.8 2.8 2.6-2.6 2.1 2.1"></path>
    <path d="M6 19h12"></path>
  </svg>
{/snippet}

<style>
  .note-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 16px;
    position: relative;
    padding: 18px 16px 16px;
    background: transparent;
    border: 0;
    cursor: default;
    transition:
      background-color 0.16s ease,
      color 0.16s ease;
    user-select: none;
  }

  .note-item::after {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 0;
    height: 1px;
    background: rgba(223, 228, 236, 0.92);
  }

  .note-item:hover {
    background: rgba(84, 110, 122, 0.04);
  }

  .note-item.muted {
    opacity: 0.72;
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text.rendered {
    display: block;
    max-height: 70px;
    overflow: hidden;
  }

  .note-text.rendered :global(*) {
    margin: 0;
    font-size: 15px;
    line-height: 1.42;
    color: #1f2937;
  }

  .note-text.rendered :global(h1),
  .note-text.rendered :global(h2),
  .note-text.rendered :global(h3),
  .note-text.rendered :global(h4),
  .note-text.rendered :global(h5),
  .note-text.rendered :global(h6) {
    font-weight: 800;
    line-height: 1.22;
    margin: 0 0 3px;
  }

  .note-text.rendered :global(h1) {
    font-size: 17px;
  }

  .note-text.rendered :global(h2) {
    font-size: 16px;
  }

  .note-text.rendered :global(h3),
  .note-text.rendered :global(h4),
  .note-text.rendered :global(h5),
  .note-text.rendered :global(h6) {
    font-size: 15px;
  }

  .note-text.rendered :global(ul),
  .note-text.rendered :global(ol) {
    padding-left: 16px;
  }

  .note-text.rendered :global(p + p),
  .note-text.rendered :global(li + li) {
    margin-top: 2px;
  }

  .note-date {
    font-size: 11px;
    color: #98a2b3;
    margin-top: 8px;
    display: block;
  }

  .note-text.done {
    text-decoration: line-through;
    text-decoration-thickness: 2.5px;
    text-decoration-color: #4b5563;
    color: #8a92a0;
  }

  .note-text.done :global(*) {
    color: #8a92a0;
  }

  .note-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 6px;
    opacity: 0.74;
    transition:
      opacity 0.2s ease,
      color 0.2s ease;
  }

  .action-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    padding: 4px;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    transition: all 0.2s;
  }

  .action-btn.reorder-handle {
    cursor: grab;
    color: #475569;
    height: 40px;
    opacity: 0.9;
  }

  .action-btn.reorder-handle :global(svg) {
    width: 18px;
    height: 24px;
  }

  .action-btn.reorder-handle:active {
    cursor: grabbing;
  }

  .action-btn:hover {
    background: rgba(84, 110, 122, 0.08);
    color: #333;
    border-color: transparent;
  }

  .action-btn.danger:hover {
    color: #e53935;
    background: #fef0f0;
    border-color: #fab6b6;
  }

  .action-btn.danger {
    color: #e53935;
  }

  .action-btn.zorder-toggle {
    color: #6e7785;
  }

  .action-btn.zorder-toggle.active {
    color: #0f4c81;
  }

  .action-btn.wallpaper-toggle.active {
    color: #0f4c81;
    background: #eef6ff;
    border-color: #c8dbf3;
  }

  .action-btn.priority-btn {
    width: auto;
    min-width: 36px;
    font-size: 10px;
    font-weight: 700;
    color: #334155;
    border-color: #dbe3ee;
    background: rgba(255, 255, 255, 0.75);
  }

  .zorder-icon {
    width: 15px;
    height: 15px;
    display: block;
  }

  @media (max-width: 540px) {
    .note-item {
      padding-left: 14px;
      padding-right: 14px;
      column-gap: 12px;
    }

    .note-item::after {
      left: 14px;
      right: 14px;
    }

    .note-text.rendered :global(*) {
      font-size: 14px;
    }

    .note-actions {
      gap: 4px;
      margin-left: 2px;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      padding: 3px;
    }

    .action-btn.priority-btn {
      min-width: 32px;
    }
  }
</style>
