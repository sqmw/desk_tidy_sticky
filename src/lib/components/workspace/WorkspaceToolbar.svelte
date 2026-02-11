<script>
  import WorkspaceCreateBar from "$lib/components/workspace/toolbar/WorkspaceCreateBar.svelte";
  import WorkspaceQueryBar from "$lib/components/workspace/toolbar/WorkspaceQueryBar.svelte";

  let {
    strings,
    viewMode = "active",
    newNoteText = $bindable(),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    searchQuery = $bindable(),
    sortMode,
    sortModes,
    onSave,
    onCreateLongDoc = () => {},
    onSetSortMode,
  } = $props();
</script>

<div class="toolbar">
  <WorkspaceCreateBar
    {strings}
    {viewMode}
    bind:newNoteText
    bind:newNotePriority
    bind:newNoteTags
    onSave={onSave}
    onCreateLongDoc={onCreateLongDoc}
  />
  <WorkspaceQueryBar {strings} bind:searchQuery {sortMode} {sortModes} onSetSortMode={onSetSortMode} />
</div>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
    gap: 8px;
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    padding: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.75)) 90%, transparent);
    backdrop-filter: blur(8px);
    align-items: stretch;
  }

  @media (max-width: 1700px) {
    .toolbar {
      grid-template-columns: 1fr;
    }
  }
</style>
