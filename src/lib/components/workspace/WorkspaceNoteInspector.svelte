<script>
  import BlockEditor from "$lib/components/note/BlockEditor.svelte";
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";

  let {
    strings,
    note = null,
    mode = "view",
    draftText = $bindable(""),
    tagSuggestions = /** @type {string[]} */ ([]),
    formatDate,
    onClose = () => {},
    onStartEdit = () => {},
    onCancelEdit = () => {},
    onSave = () => {},
    onChangePriority = () => {},
    onChangeTags = () => {},
  } = $props();

  /** @param {KeyboardEvent} e */
  function onInspectorKeydown(e) {
    if (mode !== "edit") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
      e.preventDefault();
      onSave();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit();
    }
  }

  /** @param {string} nextText */
  function onBlockTextChange(nextText) {
    draftText = nextText;
  }
</script>

{#if note}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <aside class="inspector" data-no-drag="true" onkeydown={onInspectorKeydown}>
    <header class="inspector-header">
      <div class="header-left">
        <div class="title">{strings.details}</div>
        <div class="meta">{formatDate(note.updatedAt)}</div>
      </div>
      <div class="header-actions">
        {#if mode === "view"}
          <button type="button" class="btn primary" onclick={() => onStartEdit()}>{strings.edit}</button>
        {:else}
          <button type="button" class="btn primary" onclick={() => onSave()}>{strings.saveNote}</button>
          <button type="button" class="btn" onclick={() => onCancelEdit()}>{strings.cancel}</button>
        {/if}
        <button type="button" class="btn danger" onclick={() => onClose()}>{strings.close}</button>
      </div>
    </header>
    <NoteTagBar
      {strings}
      priority={note.priority ?? null}
      tags={Array.isArray(note.tags) ? note.tags : []}
      {tagSuggestions}
      onChangePriority={onChangePriority}
      onChangeTags={onChangeTags}
    />

    {#if mode === "view"}
      <div class="content markdown">{@html note.renderedHtml}</div>
    {:else}
      <div class="content editor-content">
        <BlockEditor bind:text={draftText} noteId={String(note.id)} onTextChange={onBlockTextChange} />
        <div class="hint">Ctrl/Cmd + Enter · Esc</div>
      </div>
    {/if}
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

  .btn.primary {
    border-color: var(--ws-badge-border, #bfd4ff);
    background: var(--ws-badge-bg, #e8f0ff);
    color: var(--ws-accent, #1d4ed8);
    font-weight: 700;
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

  .markdown :global(*) {
    max-width: 100%;
  }

  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3),
  .markdown :global(h4),
  .markdown :global(h5),
  .markdown :global(h6) {
    margin: 0 0 8px;
    line-height: 1.28;
  }

  .markdown :global(h1) {
    font-size: 1.6rem;
  }

  .markdown :global(h2) {
    font-size: 1.35rem;
  }

  .markdown :global(h3) {
    font-size: 1.18rem;
  }

  .markdown :global(h4) {
    font-size: 1.06rem;
  }

  .markdown :global(h5) {
    font-size: 0.96rem;
  }

  .markdown :global(h6) {
    font-size: 0.9rem;
  }

  .markdown :global(pre) {
    overflow: auto;
    border-radius: 8px;
    padding: 8px;
    background: color-mix(in srgb, var(--ws-btn-bg, #f8fafc) 84%, transparent);
  }

  .markdown :global(img) {
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid var(--ws-border-soft, #e5eaf2);
  }

  .editor-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }

  .hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    margin: 0;
    padding: 6px 12px 8px;
    border-top: 1px solid var(--ws-border-soft, #dbe4ef);
  }
</style>
