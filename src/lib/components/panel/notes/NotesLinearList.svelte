<script>
  import NotesLinearListItem from "$lib/components/panel/notes/NotesLinearListItem.svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  let {
    strings,
    viewMode,
    searchActive = false,
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

  const emptyTitle = $derived.by(() => {
    if (searchActive) return strings.emptySearchTitle;
    if (viewMode === "archived") return strings.emptyArchivedTitle;
    if (viewMode === "trash") return strings.emptyTrashTitle;
    return strings.emptyActiveTitle;
  });

  const emptyHint = $derived.by(() => {
    if (searchActive) return strings.emptySearchHint;
    if (viewMode === "archived" || viewMode === "trash") return "";
    return strings.emptyActiveHint;
  });
</script>

<div class="notes-list" bind:this={notesListEl}>
  {#if renderedNotes.length === 0}
    <div class="notes-empty" role="status">
      <svg
        class="notes-empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M15.5 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"></path>
        <path d="M15 4v3.5a1 1 0 0 0 1 1H19"></path>
        <path d="M8.5 12h7"></path>
        <path d="M8.5 15.5h4.5"></path>
      </svg>
      <span class="notes-empty-title">{emptyTitle}</span>
      {#if emptyHint}
        <span class="notes-empty-hint">{emptyHint}</span>
      {/if}
    </div>
  {/if}
  {#each renderedNotes as note, index (note.id)}
    <div
      transition:slide={{ duration: draggedNoteId ? 0 : 200, axis: "y" }}
      animate:flip={{ duration: draggedNoteId ? 0 : 200 }}
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
    padding: 0 0 10px;
    scrollbar-width: thin;
    scrollbar-color: #aeb7c4 transparent;
    display: flex;
    flex-direction: column;
    gap: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 251, 253, 0.96) 100%);
    border-top: 1px solid rgba(220, 226, 235, 0.9);
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

  .notes-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 32px 24px;
    text-align: center;
    color: #8a94a6;
    user-select: none;
  }

  .notes-empty-icon {
    width: 34px;
    height: 34px;
    color: #b6bfcd;
    margin-bottom: 4px;
  }

  .notes-empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #6b7280;
  }

  .notes-empty-hint {
    font-size: 12px;
    color: #98a2b3;
  }

  .note-wrapper {
    position: relative;
    z-index: 1;
  }

  .note-wrapper.drag-placeholder::before {
    content: "";
    position: absolute;
    inset: 6px 10px;
    border-radius: 8px;
    border: 1px solid rgba(163, 178, 197, 0.45);
    background:
      linear-gradient(180deg, rgba(233, 239, 246, 0.9) 0%, rgba(241, 245, 250, 0.76) 100%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.58),
      inset 0 10px 18px rgba(255, 255, 255, 0.22);
    pointer-events: none;
    z-index: 2;
  }

  .note-wrapper.drag-placeholder :global(.note-item) {
    visibility: hidden;
  }

  .note-wrapper.drop-target::after {
    content: "";
    position: absolute;
    left: 16px;
    right: 16px;
    top: 0;
    height: 1px;
    background: rgba(84, 110, 122, 0.16);
    opacity: 1;
  }

</style>
