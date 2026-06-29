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
    dragGhostHeight,
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
  <div
    class="drag-ghost"
    style={`top:${dragGhostTop}px;left:${dragGhostLeft}px;width:${Math.max(240, dragGhostWidth)}px;height:${Math.max(68, dragGhostHeight)}px;`}
  >
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
    align-items: center;
    position: relative;
    min-height: 100%;
    padding: 16px 18px;
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.96) 100%);
    border: 1px solid rgba(176, 190, 208, 0.42);
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
    padding: 0 10px;
    box-sizing: border-box;
  }

  .note-item.ghost {
    height: 100%;
    box-shadow:
      0 18px 34px rgba(15, 23, 42, 0.16),
      0 4px 10px rgba(15, 23, 42, 0.08);
    border-color: color-mix(in srgb, var(--primary) 18%, rgba(176, 190, 208, 0.42));
    backdrop-filter: blur(14px);
    transform: translateY(-1px);
    opacity: 0.985;
    overflow: hidden;
  }

  .note-item.ghost::before {
    content: "";
    position: absolute;
    left: 10px;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary) 58%, #dbe4ef);
  }

  .note-content {
    flex: 1;
    min-width: 0;
    padding-left: 10px;
  }

  .note-text.rendered {
    display: block;
    max-height: 3.05em;
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
    text-decoration-thickness: 1.5px;
    text-decoration-color: #9aa3af;
    color: #8a92a0;
  }

</style>
