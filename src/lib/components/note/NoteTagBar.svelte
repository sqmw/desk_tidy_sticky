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
  <div class="note-tag-editor">
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
</div>

<style>
  .note-tag-bar {
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 90%, transparent);
    padding: 10px 14px;
    background: color-mix(in srgb, var(--ws-btn-bg, rgba(255, 255, 255, 0.7)) 82%, transparent);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  .note-tag-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    line-height: 30px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .note-tag-editor {
    min-width: 0;
  }

  @media (max-width: 560px) {
    .note-tag-bar {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .note-tag-title {
      line-height: 1.2;
    }
  }
</style>
