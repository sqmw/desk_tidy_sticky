<script>
  import WorkspaceCreateBar from "$lib/components/workspace/toolbar/WorkspaceCreateBar.svelte";
  import WorkspaceQueryBar from "$lib/components/workspace/toolbar/WorkspaceQueryBar.svelte";

  let {
    strings,
    viewMode = "active",
    compact = false,
    newNoteText = $bindable(),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    noteTagOptions = /** @type {string[]} */ ([]),
    selectedTag = "",
    tagFilterOpen = false,
    searchQuery = $bindable(),
    onCreateNote = () => {},
    onToggleTagFilter = () => {},
  } = $props();
</script>

<div class="toolbar" class:compact>
  <WorkspaceCreateBar
    {strings}
    {viewMode}
    {compact}
    bind:newNoteText
    bind:newNotePriority
    bind:newNoteTags
    {noteTagOptions}
    {onCreateNote}
  />
  <WorkspaceQueryBar {strings} {compact} {selectedTag} {tagFilterOpen} {onToggleTagFilter} bind:searchQuery />
</div>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: minmax(420px, 1fr) minmax(220px, 320px);
    gap: 10px;
    border: none;
    border-radius: 0;
    padding: 0;
    background: transparent;
    align-items: start;
  }

  .toolbar.compact {
    grid-template-columns: minmax(0, 1fr) minmax(190px, 280px);
    padding: 0;
    gap: 7px;
  }

  @media (max-width: 1100px) {
    .toolbar {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
