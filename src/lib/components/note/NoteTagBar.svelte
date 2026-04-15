<script>
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";

  let {
    strings,
    priority = null,
    tags = /** @type {string[]} */ ([]),
    tagSuggestions = /** @type {string[]} */ ([]),
    isEditing = false,
    onChangePriority = () => {},
    onChangeTags = () => {},
  } = $props();

</script>

{#if isEditing || priority != null || tags.length > 0}
  <div class="note-tag-bar" data-no-drag="true">
    <div class="note-tag-editor">
      <NoteTagsEditor
        {strings}
        {tags}
        {priority}
        showPriority={true}
        showInput={isEditing}
        suggestions={tagSuggestions}
        onChange={onChangeTags}
        onPriorityChange={onChangePriority}
      />
    </div>
  </div>
{/if}

<style>
  .note-tag-bar {
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 90%, transparent);
    padding: 8px 12px;
    background: color-mix(in srgb, var(--ws-btn-bg, rgba(255, 255, 255, 0.7)) 78%, transparent);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .note-tag-editor {
    flex: 1 1 auto;
    min-width: 0;
  }

  @media (max-width: 560px) {
    .note-tag-bar {
      gap: 6px;
      align-items: flex-start;
    }
  }
</style>
