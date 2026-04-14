<script>
  import NotesLinearListItem from "$lib/components/panel/notes/NotesLinearListItem.svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  let {
    strings,
    viewMode,
    renderedNotes,
    draggedNoteId,
    dragTargetIndex,
    canReorder,
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

<div class="notes-list" bind:this={notesListEl}>
  {#each renderedNotes as note, index (note.id)}
    <div
      transition:slide={{ duration: 200, axis: "y" }}
      animate:flip={{ duration: 200 }}
      class="note-wrapper"
      data-note-id={note.id}
      class:drag-placeholder={draggedNoteId === note.id}
      class:drop-target={dragTargetIndex === index && draggedNoteId !== note.id}
    >
      <NotesLinearListItem
        {strings}
        {viewMode}
        {note}
        {canReorder}
        {formatDate}
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
    </div>
  {/each}
</div>

<style>
  .notes-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 6px 10px;
    scrollbar-width: thin;
    scrollbar-color: #aeb7c4 transparent;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notes-list::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  .notes-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .notes-list::-webkit-scrollbar-thumb {
    background: rgba(120, 130, 145, 0.72);
    border-radius: 999px;
  }

  .notes-list::-webkit-scrollbar-thumb:hover {
    background: rgba(95, 105, 120, 0.82);
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

  .note-wrapper.drag-placeholder :global(.note-item) {
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

</style>
