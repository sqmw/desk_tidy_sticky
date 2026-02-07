<script>
  import Dismissible from "$lib/Dismissible.svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  let {
    strings,
    viewMode,
    renderedNotes,
    draggedNoteId,
    dragTargetIndex,
    canReorder,
    draggedNote,
    dragGhostTop,
    dragGhostLeft,
    dragGhostWidth,
    formatDate,
    notesListEl = $bindable(),
    restoreNote,
    toggleArchive,
    deleteNote,
    openEdit,
    togglePin,
    toggleZOrder,
    toggleDone,
    createVerticalDragStartHandler,
    createVerticalDragMoveHandler,
    createVerticalDragEndHandler,
  } = $props();
</script>

<div class="notes-list" bind:this={notesListEl}>
  {#each renderedNotes as note, index (note.id)}
    <div
      transition:slide={{ duration: 200, axis: "y" }}
      animate:flip={{ duration: 200 }}
      class="note-wrapper"
      class:drag-placeholder={draggedNoteId === note.id}
      class:drop-target={dragTargetIndex === index && draggedNoteId !== note.id}
    >
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
          <div
            class="note-item"
            class:pinned={note.isPinned}
            class:muted={note.isArchived || note.isDeleted}
            class:dragging={draggedNoteId === note.id}
            role="listitem"
          >
            <div class="note-content">
              <span class="note-text" class:done={note.isDone}>{note.text}</span>
              <span class="note-date">{formatDate(note.updatedAt)}</span>
            </div>
            <div class="note-actions">
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
                  onclick={(e) => {
                    e.stopPropagation();
                    openEdit(note);
                  }}>{@render iconEdit()}</button
                >
                {#if viewMode === "active"}
                  <button
                    type="button"
                    class="action-btn"
                    title={note.isPinned ? strings.unpinNote : strings.pinNote}
                    onclick={(e) => {
                      e.stopPropagation();
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
                      title={note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
                      onclick={() => toggleZOrder(note)}
                    >
                      {note.isAlwaysOnTop ? "▴" : "▾"}
                    </button>
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
    </div>
  {/each}
</div>

{#if draggedNote}
  <div class="drag-ghost" style="top: {dragGhostTop}px; left: {dragGhostLeft}px; width: {dragGhostWidth}px;">
    <div class="note-item ghost">
      <div class="note-content">
        <span class="note-text" class:done={draggedNote.isDone}>{draggedNote.text}</span>
        <span class="note-date">{formatDate(draggedNote.updatedAt)}</span>
      </div>
    </div>
  </div>
{/if}

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
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2S7 7.1 7 6s.9-2 2-2 2 .9 2 2zm6 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
    />
  </svg>
{/snippet}

<style>
  .notes-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 6px 10px;
    scrollbar-width: thin;
    scrollbar-color: #ddd transparent;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notes-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .note-wrapper {
    position: relative;
    border-radius: 10px;
    z-index: 1;
  }

  .note-wrapper.drag-placeholder::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 10px;
    border: 1px dashed #b9c7dc;
    background: rgba(84, 110, 122, 0.05);
    pointer-events: none;
    z-index: 2;
  }

  .note-wrapper.drag-placeholder .note-item {
    visibility: hidden;
  }

  .note-wrapper.drop-target::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -4px;
    height: 3px;
    border-radius: 999px;
    background: var(--primary);
    opacity: 0.45;
  }

  .note-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
    padding: 11px 12px;
    border-radius: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
    border: 1px solid #e7ebf1;
    cursor: default;
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      border-color 0.16s ease;
    user-select: none;
  }

  .note-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
    border-color: #dbe3ee;
  }

  .note-item.dragging {
    visibility: hidden;
  }

  .drag-ghost {
    position: fixed;
    pointer-events: none;
    z-index: 2000;
  }

  .note-item.ghost {
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
    border-color: color-mix(in srgb, var(--primary) 45%, #d9dee7);
    transform: scale(1.015);
    background: linear-gradient(180deg, #ffffff 0%, #fdfdff 100%);
    opacity: 0.98;
  }

  .note-item.muted {
    background: #fafbfc;
    border-color: #e8ebef;
    opacity: 0.9;
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text {
    display: block;
    font-size: 14px;
    line-height: 1.4;
    color: var(--neutral);
    max-lines: 3;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
  }

  .note-date {
    font-size: 11px;
    color: #9aa3af;
    margin-top: 6px;
    display: block;
  }

  .note-text.done {
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
    text-decoration-color: #9aa3af;
    color: #8a92a0;
  }

  .note-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 8px;
    opacity: 0.45;
    transition: opacity 0.2s;
  }

  .note-item:hover .note-actions,
  .note-item.dragging .note-actions {
    opacity: 1;
  }

  .action-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 4px;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    transition: all 0.2s;
  }

  .action-btn.reorder-handle {
    cursor: grab;
    color: #8a94a3;
  }

  .action-btn.reorder-handle:active {
    cursor: grabbing;
  }

  .action-btn:hover {
    background: #f0f2f5;
    color: #333;
    border-color: #e4e7ed;
  }

  .action-btn.danger:hover {
    color: #e53935;
    background: #fef0f0;
    border-color: #fab6b6;
  }

  .action-btn.danger {
    color: #e53935;
  }
</style>
