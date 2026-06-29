<script>
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";
  import BlockNoteContent from "$lib/components/note/BlockNoteContent.svelte";

  let {
    strings,
    note = null,
    draftText = $bindable(""),
    tagSuggestions = /** @type {string[]} */ ([]),
    formatDate,
    onClose = () => {},
    onChangePriority = () => {},
    onChangeTags = () => {},
    onToggleTask = () => {},
    onAppendTask = () => {},
    onBlockTextChange = () => {},
  } = $props();
</script>

{#if note}
  <aside class="inspector" data-no-drag="true">
    <header class="inspector-header">
      <div class="header-left">
        <div class="title">{strings.details}</div>
        <div class="meta">{formatDate(note.updatedAt)}</div>
      </div>
      <div class="header-actions">
        <button type="button" class="btn danger" onclick={() => onClose()}>{strings.close}</button>
      </div>
    </header>
    <NoteTagBar
      {strings}
      isEditing={false}
      priority={note.priority ?? null}
      tags={Array.isArray(note.tags) ? note.tags : []}
      {tagSuggestions}
      onChangePriority={onChangePriority}
      onChangeTags={onChangeTags}
    />

    <div class="content editor-content">
      <BlockNoteContent
        text={draftText}
        compact
        interactiveTasks
        placeholder={strings.noteEditorPlaceholder}
        onTextChange={onBlockTextChange}
        onToggleTask={onToggleTask}
        onAppendTask={onAppendTask}
      />
    </div>
  </aside>
{/if}

<style>
  .inspector {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .inspector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--ws-border-soft, #dbe4f0);
    padding: 10px 12px;
  }

  .header-left {
    min-width: 0;
  }

  .title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-text-strong, #1f2937);
  }

  .meta {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    margin-top: 2px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .btn {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 8px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    padding: 6px 9px;
    cursor: pointer;
  }

  .btn.danger {
    border-color: var(--ws-border-soft, #dbe4ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
  }

  :global(.workspace.theme-dark) .btn.danger {
    border-color: var(--ws-border-soft, #31445f);
    background: var(--ws-btn-bg, #1a2740);
    color: var(--ws-text, #c6d0dd);
  }

  :global(.workspace.theme-dark) .btn.danger:hover {
    border-color: color-mix(in srgb, #f97316 48%, var(--ws-border-hover, #415981));
    background: color-mix(in srgb, #7c2d12 26%, var(--ws-btn-hover, #233454));
    color: #ffe7d6;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .content::-webkit-scrollbar-track {
    background: var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
    border-radius: 999px;
  }

  .content::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 10px 12px 0;
    overflow: auto;
  }
</style>
