<script>
  let {
    strings,
    shortcutSettings,
    saving = false,
    onSave = async () => {},
    variant = "panel",
  } = $props();

  let panelDraft = $state("");
  let overlayDraft = $state("");

  $effect(() => {
    panelDraft = shortcutSettings?.panelBinding?.value ?? "";
  });

  $effect(() => {
    overlayDraft = shortcutSettings?.overlayBinding?.value ?? "";
  });

  const panelDirty = $derived(panelDraft !== (shortcutSettings?.panelBinding?.value ?? ""));
  const overlayDirty = $derived(overlayDraft !== (shortcutSettings?.overlayBinding?.value ?? ""));
  const canSubmit = $derived((panelDirty || overlayDirty) && !saving);

  /**
   * @param {SubmitEvent} event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    await onSave({
      panelShortcut: panelDraft.trim(),
      overlayShortcut: overlayDraft.trim(),
    });
  }
</script>

<form class:workspace-form={variant === "workspace"} class="shortcut-form" onsubmit={handleSubmit}>
  <div class="shortcut-grid">
    <div class="shortcut-row">
      <label class="shortcut-label shortcut-row-label" for="shortcut-panel-input">
        {strings.shortcutToggleLabel}
      </label>
      <div class="shortcut-field-main">
        <input
          id="shortcut-panel-input"
          type="text"
          bind:value={panelDraft}
          data-status={shortcutSettings?.panelBinding?.status || "registered"}
          placeholder="Ctrl+Shift+N"
          spellcheck="false"
          autocomplete="off"
        />
      </div>
    </div>

    <div class="shortcut-row">
      <label class="shortcut-label shortcut-row-label" for="shortcut-overlay-input">
        {strings.shortcutOverlayLabel}
      </label>
      <div class="shortcut-field-main">
        <input
          id="shortcut-overlay-input"
          type="text"
          bind:value={overlayDraft}
          data-status={shortcutSettings?.overlayBinding?.status || "registered"}
          placeholder="Ctrl+Shift+O"
          spellcheck="false"
          autocomplete="off"
        />
      </div>
    </div>
  </div>

  <p class="shortcut-hint">{strings.shortcutFormatHint}</p>

  <div class="shortcut-static-grid">
    <div class="shortcut-static-row">
      <span class="shortcut-label">{strings.shortcutPinSave.split(":")[0]}</span>
      <span class="shortcut-static-value"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
    </div>
    <div class="shortcut-static-row">
      <span class="shortcut-label">{strings.shortcutEsc.split(":")[0]}</span>
      <span class="shortcut-static-value"><kbd>Esc</kbd></span>
    </div>
  </div>

  <div class="shortcut-actions">
    <button type="submit" class="shortcut-apply" disabled={!canSubmit}>
      {saving ? strings.shortcutSaving : strings.shortcutApply}
    </button>
  </div>
</form>

<style>
  .shortcut-form {
    display: grid;
    gap: 12px;
  }

  .shortcut-grid {
    display: grid;
    gap: 12px;
  }

  .shortcut-row {
    display: grid;
    grid-template-columns: minmax(96px, 132px) minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }

  .shortcut-row-label {
    display: flex;
    align-items: center;
    min-height: 38px;
    padding-top: 0;
  }

  .shortcut-field-main {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .shortcut-label {
    font-size: 13px;
    font-weight: 700;
    color: inherit;
  }

  .shortcut-field-main input {
    width: 100%;
    min-height: 38px;
    border-radius: 10px;
    border: 1px solid var(--ws-input-border, #d9e2ef);
    background: var(--ws-input-bg, #fff);
    color: var(--ws-input-text, var(--neutral, #303133));
    padding: 0 12px;
    font-size: 13px;
    outline: none;
  }

  .shortcut-field-main input[data-status="registered"] {
    color: #2f855a;
  }

  .shortcut-field-main input[data-status="conflict"],
  .shortcut-field-main input[data-status="invalid"],
  .shortcut-field-main input[data-status="error"] {
    color: #dc2626;
  }

  .shortcut-field-main input[data-status="disabled"] {
    color: var(--ws-muted, #64748b);
  }

  .shortcut-field-main input:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #3b82f6) 42%, #7c8aa5);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ws-accent, #3b82f6) 16%, transparent);
  }

  .shortcut-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ws-muted, #6b7280);
  }

  .shortcut-static-grid {
    display: grid;
    gap: 8px;
    padding-top: 2px;
  }

  .shortcut-static-row {
    display: grid;
    grid-template-columns: minmax(96px, 132px) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--ws-text, #475569);
  }

  .shortcut-static-value {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 2px;
  }

  .shortcut-actions {
    display: flex;
    justify-content: flex-end;
  }

  .shortcut-apply {
    min-width: 104px;
    min-height: 34px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--ws-accent, #3b82f6) 24%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #3b82f6) 88%, #fff);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .shortcut-apply:disabled {
    cursor: default;
    opacity: 0.5;
  }

  kbd {
    background: color-mix(in srgb, var(--ws-btn-bg, #f8fafc) 86%, #fff);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 82%, transparent);
    border-radius: 6px;
    box-shadow: 0 1px 0 color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 80%, transparent);
    color: var(--ws-text, #475569);
    display: inline-block;
    font-family: monospace;
    font-size: 11px;
    padding: 2px 6px;
    margin-left: 2px;
    min-width: 20px;
    text-align: center;
  }

  /* Keep label + shortcut on the same row even in mini mode.
     (Mini window is often narrow; stacking wastes vertical space.) */
</style>
