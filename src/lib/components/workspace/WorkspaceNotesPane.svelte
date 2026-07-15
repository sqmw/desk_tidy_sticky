<script>
  import WorkbenchSection from "$lib/components/panel/WorkbenchSection.svelte";
  import WorkspaceNoteInspector from "$lib/components/workspace/WorkspaceNoteInspector.svelte";
  import WorkspaceTagFilterRail from "$lib/components/workspace/WorkspaceTagFilterRail.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";

  let {
    strings,
    viewMode,
    renderedNotes = [],
    openViewOnClick = false,
    canQuadrantReorder = false,
    compactToolbar = false,
    newNoteText = $bindable(""),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    noteTagOptions = [],
    selectedTag = "",
    searchQuery = $bindable(""),
    tagFilterOpen = false,
    inspectorOpen = false,
    inspectorNote = null,
    inspectorDraftText = $bindable(""),
    inspectorListCollapsed = false,
    inspectorWidth = 430,
    workbenchShellEl = $bindable(/** @type {HTMLDivElement | null} */ (null)),
    noteTags = [],
    taggedNoteCount = 0,
    formatDate = () => "",
    onToggleTagFilter = () => {},
    onCreateNote = () => {},
    onSetSelectedTag = () => {},
    onStartInspectorResize = /** @type {(event: PointerEvent) => void} */ (() => {}),
    onResetInspectorWidth = /** @type {(event: MouseEvent) => void} */ (() => {}),
    restoreNote = () => {},
    toggleArchive = () => {},
    deleteNote = () => {},
    openEdit = () => {},
    openView = () => {},
    togglePin = () => {},
    toggleZOrder = () => {},
    toggleWallpaperLayer = () => {},
    toggleDone = () => {},
    updatePriority = () => {},
    updateTags = () => {},
    persistReorderedVisible = () => {},
    onCloseInspector = () => {},
    onChangeInspectorPriority = () => {},
    onChangeInspectorTags = () => {},
    onToggleInspectorTask = () => {},
    onAppendInspectorTask = () => {},
    onInspectorTextChange = () => {},
  } = $props();
</script>

<WorkspaceToolbar
  {strings}
  {viewMode}
  compact={compactToolbar}
  bind:newNoteText
  bind:newNotePriority
  bind:newNoteTags
  {noteTagOptions}
  {selectedTag}
  tagFilterOpen={tagFilterOpen}
  bind:searchQuery
  onToggleTagFilter={onToggleTagFilter}
  onCreateNote={onCreateNote}
/>

<div
  class="workbench-shell"
  class:inspector-open={inspectorOpen}
  class:list-collapsed={inspectorListCollapsed}
  class:tag-filter-open={tagFilterOpen}
  bind:this={workbenchShellEl}
  style={`--inspector-width: ${inspectorWidth}px;`}
>
  <div class="workbench-pane">
    <WorkbenchSection
      {strings}
      {viewMode}
      {renderedNotes}
      {openViewOnClick}
      {canQuadrantReorder}
      {formatDate}
      {restoreNote}
      {toggleArchive}
      {deleteNote}
      {openEdit}
      {openView}
      {togglePin}
      {toggleZOrder}
      {toggleWallpaperLayer}
      {toggleDone}
      {updatePriority}
      {updateTags}
      {persistReorderedVisible}
    />
  </div>
  {#if tagFilterOpen}
    <WorkspaceTagFilterRail
      {strings}
      noteTags={noteTags}
      {selectedTag}
      {taggedNoteCount}
      onSetSelectedTag={onSetSelectedTag}
    />
  {/if}
  {#if inspectorOpen && inspectorNote}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="inspector-splitter" onpointerdown={onStartInspectorResize} ondblclick={onResetInspectorWidth}></div>
    <WorkspaceNoteInspector
      {strings}
      note={inspectorNote}
      bind:draftText={inspectorDraftText}
      tagSuggestions={noteTagOptions}
      {formatDate}
      onClose={onCloseInspector}
      onChangePriority={onChangeInspectorPriority}
      onChangeTags={onChangeInspectorTags}
      onToggleTask={onToggleInspectorTask}
      onAppendTask={onAppendInspectorTask}
      onBlockTextChange={onInspectorTextChange}
    />
  {/if}
</div>

<style>
  .workbench-shell {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    position: relative;
  }

  .workbench-shell.tag-filter-open {
    grid-template-columns: minmax(0, 1fr) minmax(132px, 176px);
  }

  .workbench-shell.inspector-open {
    grid-template-columns: minmax(0, 1fr) 8px minmax(340px, var(--inspector-width, 430px));
  }

  .workbench-shell.inspector-open.tag-filter-open {
    grid-template-columns: minmax(0, 1fr) minmax(128px, 164px) 8px minmax(340px, var(--inspector-width, 430px));
  }

  .workbench-shell.inspector-open.list-collapsed {
    grid-template-columns: 0 8px minmax(340px, 1fr);
  }

  .workbench-shell.list-collapsed :global(.tag-filter-rail) {
    display: none;
  }

  .inspector-splitter {
    --inspector-splitter-hit-width: 30px;
    --inspector-splitter-visual-width: 8px;
    width: var(--inspector-splitter-hit-width);
    justify-self: center;
    border-radius: 999px;
    background: transparent;
    cursor: col-resize;
    min-height: 0;
    position: relative;
    touch-action: none;
    z-index: 3;
  }

  .inspector-splitter::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(15, 23, 42, 0.001);
  }

  .inspector-splitter::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--inspector-splitter-visual-width);
    transform: translate(-50%, -50%);
    height: 60px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 70%, transparent);
    opacity: 0.92;
    transition: background 0.15s ease, opacity 0.15s ease;
    pointer-events: none;
  }

  .inspector-splitter:hover::after {
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 46%, transparent);
    opacity: 1;
  }

  .workbench-pane {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 920px) {
    .workbench-shell.inspector-open {
      grid-template-columns: minmax(0, 1fr);
    }

    .workbench-shell.list-collapsed :global(.tag-filter-rail) {
      display: grid;
    }

    .inspector-splitter {
      display: none;
    }
  }
</style>
