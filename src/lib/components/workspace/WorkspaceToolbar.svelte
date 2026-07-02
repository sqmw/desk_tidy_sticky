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
    grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
    gap: 8px;
    border: none;
    border-radius: 0;
    padding: 0;
    background: transparent;
    align-items: center;
  }

  .toolbar.compact {
    grid-template-columns: 1fr;
    padding: 8px;
    gap: 7px;
  }

  @media (max-width: 1100px) {
    .toolbar {
      grid-template-columns: 1fr;
    }
  }
</style>
