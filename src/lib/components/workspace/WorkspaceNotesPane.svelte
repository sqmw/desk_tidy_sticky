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
    <WorkspaceNoteInspector
      {strings}
      note={inspectorNote}
      bind:draftText={inspectorDraftText}
      tagSuggestions={noteTagOptions}
      {formatDate}
      listCollapsed={inspectorListCollapsed}
      onClose={onCloseInspector}
      onChangePriority={onChangeInspectorPriority}
      onChangeTags={onChangeInspectorTags}
      onToggleTask={onToggleInspectorTask}
      onAppendTask={onAppendInspectorTask}
      onBlockTextChange={onInspectorTextChange}
      onStartResize={onStartInspectorResize}
      onResetWidth={onResetInspectorWidth}
    />
  {/if}
</div>

<style>
  /* The inspector renders as an overlay drawer anchored to this shell
     (absolute, right edge), so opening it never reflows the note grid. */
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

  .workbench-pane {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
