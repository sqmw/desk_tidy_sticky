<script>
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";

  let {
    strings,
    priority = null,
    tags = /** @type {string[]} */ ([]),
    tagSuggestions = /** @type {string[]} */ ([]),
    onChangePriority = () => {},
    onChangeTags = () => {},
  } = $props();

</script>

<div class="note-tag-bar" data-no-drag="true">
  <div class="note-tag-title">{strings.tags}</div>
  <NoteTagsEditor
    {strings}
    {tags}
    {priority}
    showPriority={true}
    suggestions={tagSuggestions}
    onChange={onChangeTags}
    onPriorityChange={onChangePriority}
  />
</div>

<style>
  .note-tag-bar {
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 90%, transparent);
    padding: 8px 12px;
    background: color-mix(in srgb, var(--ws-btn-bg, rgba(255, 255, 255, 0.7)) 86%, transparent);
    display: grid;
    gap: 6px;
  }

  .note-tag-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
  }
</style>
