<script>
  import NotesLinearList from "$lib/components/panel/notes/NotesLinearList.svelte";
  import NotesQuadrantBoard from "$lib/components/panel/notes/NotesQuadrantBoard.svelte";

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
    toggleWallpaperLayer,
    toggleDone,
    updatePriority,
    createVerticalDragStartHandler,
    createVerticalDragMoveHandler,
    createVerticalDragEndHandler,
  } = $props();
</script>

{#if viewMode === "quadrant"}
  <NotesQuadrantBoard {strings} {renderedNotes} {formatDate} {openEdit} {toggleDone} {updatePriority} />
{:else}
  <NotesLinearList
    {strings}
    {viewMode}
    {renderedNotes}
    {draggedNoteId}
    {dragTargetIndex}
    {canReorder}
    {formatDate}
    bind:notesListEl
    {restoreNote}
    {toggleArchive}
    {deleteNote}
    {openEdit}
    {togglePin}
    {toggleZOrder}
    {toggleWallpaperLayer}
    {toggleDone}
    {updatePriority}
    {createVerticalDragStartHandler}
    {createVerticalDragMoveHandler}
    {createVerticalDragEndHandler}
  />
{/if}

{#if draggedNote}
  <div class="drag-ghost" style="top: {dragGhostTop}px; left: {dragGhostLeft}px; width: {dragGhostWidth}px;">
    <div class="note-item ghost">
      <div class="note-content">
        <div class="note-text rendered" class:done={draggedNote.isDone}>{@html draggedNote.renderedHtml}</div>
        <span class="note-date">{formatDate(draggedNote.updatedAt)}</span>
      </div>
    </div>
  </div>
{/if}

<style>
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

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text.rendered {
    display: block;
    max-height: 62px;
    overflow: hidden;
  }

  .note-text.rendered :global(*) {
    margin: 0;
    font-size: 13px;
    line-height: 1.35;
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

</style>
