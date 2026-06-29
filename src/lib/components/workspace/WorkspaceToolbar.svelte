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
    searchQuery = $bindable(),
    onCreateNote = () => {},
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
  <WorkspaceQueryBar {strings} {compact} bind:searchQuery />
</div>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
    gap: 8px;
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 8px;
    padding: 8px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.75)) 90%, transparent);
    backdrop-filter: blur(8px);
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
