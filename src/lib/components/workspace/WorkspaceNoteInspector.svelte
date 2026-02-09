<script>
  let {
    strings,
    note = null,
    mode = "view",
    draftText = $bindable(""),
    formatDate,
    onClose = () => {},
    expanded = false,
    onToggleExpand = () => {},
    onStartEdit = () => {},
    onCancelEdit = () => {},
    onSave = () => {},
  } = $props();
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = $state(null);

  /** @param {KeyboardEvent} e */
  function onEditKeydown(e) {
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

  $effect(() => {
    if (mode !== "edit") return;
    setTimeout(() => {
      editorEl?.focus();
      const end = editorEl?.value.length ?? 0;
      editorEl?.setSelectionRange(end, end);
    }, 0);
  });
</script>

{#if note}
  <aside class="inspector" data-no-drag="true">
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
        <button type="button" class="btn" onclick={() => onToggleExpand()}>
          {expanded ? strings.inspectorRestore : strings.inspectorExpand}
        </button>
        <button type="button" class="btn danger" onclick={() => onClose()}>{strings.close}</button>
      </div>
    </header>

    {#if mode === "view"}
      <div class="content markdown">{@html note.renderedHtml}</div>
    {:else}
      <div class="content">
        <textarea
          bind:this={editorEl}
          class="editor"
          bind:value={draftText}
          onkeydown={onEditKeydown}
          placeholder={strings.inputHint}
        ></textarea>
        <div class="hint">Ctrl/Cmd + Enter</div>
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
    border-color: #fecaca;
    background: #fff5f5;
    color: #b91c1c;
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

  .editor {
    width: 100%;
    min-height: 100%;
    resize: none;
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text-strong, #1f2937);
    font-size: 14px;
    line-height: 1.5;
    padding: 10px;
    outline: none;
  }

  .editor:focus {
    border-color: var(--ws-border-active, #94a3b8);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, transparent);
  }

  .hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    margin-top: 6px;
  }
</style>
