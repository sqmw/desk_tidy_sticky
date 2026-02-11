<script>
  import CreateTagSelect from "$lib/components/note/CreateTagSelect.svelte";
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";

  let {
    strings,
    priority = null,
    tags = /** @type {string[]} */ ([]),
    onChangePriority = () => {},
    onChangeTags = () => {},
  } = $props();

  /** @param {number | null} next */
  function handlePriorityChange(next) {
    onChangePriority(next);
  }

  /** @param {string[]} next */
  function handleTagsChange(next) {
    onChangeTags(next);
  }
</script>

<div class="note-tag-bar" data-no-drag="true">
  <div class="meta-row">
    <div class="meta-title">{strings.tags}</div>
    <NoteTagsEditor {strings} {tags} onChange={handleTagsChange} />
  </div>
  <div class="meta-row quadrant-row">
    <div class="meta-title">{strings.quadrantTag || strings.priority}</div>
    <CreateTagSelect {strings} label={strings.quadrantTag || strings.priority} value={priority} onChange={handlePriorityChange} />
  </div>
</div>

<style>
  .note-tag-bar {
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 90%, transparent);
    display: grid;
    gap: 10px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--ws-btn-bg, rgba(255, 255, 255, 0.7)) 86%, transparent);
  }

  .meta-row {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .quadrant-row :global(.tag-select) {
    max-width: 180px;
  }

  .meta-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    .meta-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
