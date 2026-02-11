<script>
  let {
    strings,
    newNoteText = $bindable(""),
    onSave = () => {},
    onCreateLongDoc = () => {},
  } = $props();
</script>

<div class="create-bar">
  <input
    type="text"
    class="add-input"
    placeholder={strings.workspaceQuickNoteHint || strings.inputHint}
    bind:value={newNoteText}
    onkeydown={(e) => e.key === "Enter" && onSave()}
  />

  <div class="create-actions">
    <button type="button" class="primary-btn" onclick={() => onSave()}>
      {strings.workspaceCreateNote || strings.saveNote}
    </button>
    <button type="button" class="ghost-btn" onclick={() => onCreateLongDoc()}>
      {strings.workspaceCreateLongDoc || strings.edit}
    </button>
  </div>
</div>

<style>
  .create-bar {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    gap: 8px;
    min-width: 0;
    align-items: stretch;
  }

  .create-actions {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }

  .add-input {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
    min-width: 0;
  }

  .primary-btn {
    border: 1px solid var(--ws-border-active, #2f4368);
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    transition: transform 0.15s ease;
    min-width: 94px;
    white-space: nowrap;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
  }

  .ghost-btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    min-width: 96px;
    white-space: nowrap;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      transform 0.15s ease;
  }

  .ghost-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  @media (max-width: 920px) {
    .create-bar {
      grid-template-columns: 1fr;
    }

    .create-actions {
      justify-content: flex-start;
    }
  }
</style>
