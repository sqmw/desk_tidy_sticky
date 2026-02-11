<script>
  let {
    strings,
    newNoteText = $bindable(""),
    onSave = () => {},
    onCreateLongDoc = () => {},
  } = $props();

  let createMode = $state("quick");

  const isLongMode = $derived(createMode === "long");

  /** @param {string} mode */
  function switchMode(mode) {
    createMode = mode === "long" ? "long" : "quick";
  }

  function handlePrimaryAction() {
    if (isLongMode) {
      onCreateLongDoc();
      return;
    }
    onSave();
  }

  function handleCancelLongMode() {
    if (!isLongMode) return;
    newNoteText = "";
    createMode = "quick";
  }

  /** @param {KeyboardEvent} e */
  function onEditorKeyDown(e) {
    if (isLongMode) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handlePrimaryAction();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handlePrimaryAction();
    }
  }
</script>

<div class="create-bar">
  <div class="entry-mode-switch" role="tablist" aria-label={strings.workspaceCreateModeLabel || "Create mode"}>
    <button
      type="button"
      class="mode-btn"
      class:active={createMode === "quick"}
      role="tab"
      aria-selected={createMode === "quick"}
      onclick={() => switchMode("quick")}
    >
      {strings.workspaceCreateModeQuick || strings.workspaceCreateNote || strings.saveNote}
    </button>
    <button
      type="button"
      class="mode-btn"
      class:active={createMode === "long"}
      role="tab"
      aria-selected={createMode === "long"}
      onclick={() => switchMode("long")}
    >
      {strings.workspaceCreateModeLong || strings.workspaceCreateLongDoc || strings.edit}
    </button>
  </div>

  {#if isLongMode}
    <textarea
      class="add-input long-input"
      placeholder={strings.workspaceLongDocHint || strings.workspaceQuickNoteHint || strings.inputHint}
      bind:value={newNoteText}
      rows="4"
      onkeydown={onEditorKeyDown}
    ></textarea>
  {:else}
    <input
      type="text"
      class="add-input"
      placeholder={strings.workspaceQuickNoteHint || strings.inputHint}
      bind:value={newNoteText}
      onkeydown={onEditorKeyDown}
    />
  {/if}

  <div class="create-actions">
    <button type="button" class="primary-btn" onclick={handlePrimaryAction}>
      {#if isLongMode}
        {strings.workspaceCreateLongDoc || strings.edit}
      {:else}
        {strings.workspaceCreateNote || strings.saveNote}
      {/if}
    </button>
    {#if isLongMode}
      <button type="button" class="ghost-btn" onclick={handleCancelLongMode}>
        {strings.cancel}
      </button>
    {/if}
  </div>
</div>

<style>
  .create-bar {
    display: grid;
    grid-template-columns: auto minmax(240px, 1fr) auto;
    gap: 8px;
    min-width: 0;
    align-items: start;
  }

  .entry-mode-switch {
    display: inline-flex;
    align-self: stretch;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    padding: 3px;
    gap: 3px;
  }

  .mode-btn {
    border: none;
    border-radius: 9px;
    background: transparent;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    font-weight: 700;
    padding: 8px 10px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .mode-btn:hover {
    color: var(--ws-text, #334155);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .mode-btn.active {
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
    color: var(--ws-text-strong, #0f172a);
  }

  .create-actions {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    align-self: stretch;
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

  .add-input.long-input {
    resize: vertical;
    min-height: 88px;
    line-height: 1.45;
    font-family: inherit;
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

    .entry-mode-switch {
      width: fit-content;
    }

    .create-actions {
      justify-content: flex-start;
    }
  }
</style>
