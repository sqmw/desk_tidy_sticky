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
  let stickyHideDraft = $state("");

  $effect(() => {
    panelDraft = shortcutSettings?.panelBinding?.value ?? "";
  });

  $effect(() => {
    overlayDraft = shortcutSettings?.overlayBinding?.value ?? "";
  });

  $effect(() => {
    stickyHideDraft = shortcutSettings?.stickyHideBinding?.value ?? "";
  });

  const panelDirty = $derived(panelDraft !== (shortcutSettings?.panelBinding?.value ?? ""));
  const overlayDirty = $derived(overlayDraft !== (shortcutSettings?.overlayBinding?.value ?? ""));
  const stickyHideDirty = $derived(
    stickyHideDraft !== (shortcutSettings?.stickyHideBinding?.value ?? ""),
  );
  const canSubmit = $derived((panelDirty || overlayDirty || stickyHideDirty) && !saving);

  /**
   * @param {{ status?: string, message?: string } | null | undefined} binding
   * @param {boolean} dirty
   */
  function buildBindingUi(binding, dirty) {
    const baseStatus = binding?.status || "registered";
    const effectiveStatus = dirty ? "pending" : baseStatus;
    return {
      status: effectiveStatus,
      symbol: getStatusSymbol(effectiveStatus),
      tooltip: getStatusTooltip(effectiveStatus, binding?.message ?? ""),
    };
  }

  /**
   * @param {string} status
   */
  function getStatusSymbol(status) {
    switch (status) {
      case "registered":
        return "i";
      case "conflict":
      case "invalid":
      case "error":
        return "!";
      case "disabled":
        return "-";
      case "pending":
        return "…";
      default:
        return "i";
    }
  }

  /**
   * @param {string} status
   * @param {string} message
   */
  function getStatusTooltip(status, message) {
    const detail = message ? ` ${message}` : "";
    switch (status) {
      case "registered":
        return `${strings.shortcutStatusRegistered}: ${strings.shortcutStatusRegisteredHint}${detail}`;
      case "conflict":
        return `${strings.shortcutStatusConflict}: ${strings.shortcutStatusConflictHint}${detail}`;
      case "invalid":
        return `${strings.shortcutStatusInvalid}: ${strings.shortcutStatusInvalidHint}${detail}`;
      case "disabled":
        return `${strings.shortcutStatusDisabled}: ${strings.shortcutStatusDisabledHint}`;
      case "error":
        return `${strings.shortcutStatusError}: ${strings.shortcutStatusErrorHint}${detail}`;
      case "pending":
        return `${strings.shortcutStatusPending}: ${strings.shortcutStatusPendingHint}`;
      default:
        return strings.shortcutFormatHint;
    }
  }

  const panelUi = $derived(buildBindingUi(shortcutSettings?.panelBinding, panelDirty));
  const overlayUi = $derived(buildBindingUi(shortcutSettings?.overlayBinding, overlayDirty));
  const stickyHideUi = $derived(
    buildBindingUi(shortcutSettings?.stickyHideBinding, stickyHideDirty),
  );

  /**
   * @param {SubmitEvent} event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    await onSave({
      panelShortcut: panelDraft.trim(),
      overlayShortcut: overlayDraft.trim(),
      stickyHideShortcut: stickyHideDraft.trim(),
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
        <div class="shortcut-input-wrap" data-status={panelUi.status} data-tooltip={panelUi.tooltip}>
          <input
            id="shortcut-panel-input"
            type="text"
            bind:value={panelDraft}
            data-status={panelUi.status}
            title={panelUi.tooltip}
            placeholder="Ctrl+Shift+N"
            spellcheck="false"
            autocomplete="off"
          />
          <span class="shortcut-status-indicator" aria-hidden="true" title={panelUi.tooltip}>
            {panelUi.symbol}
          </span>
        </div>
      </div>
    </div>

    <div class="shortcut-row">
      <label class="shortcut-label shortcut-row-label" for="shortcut-overlay-input">
        {strings.shortcutOverlayLabel}
      </label>
      <div class="shortcut-field-main">
        <div
          class="shortcut-input-wrap"
          data-status={overlayUi.status}
          data-tooltip={overlayUi.tooltip}
        >
          <input
            id="shortcut-overlay-input"
            type="text"
            bind:value={overlayDraft}
            data-status={overlayUi.status}
            title={overlayUi.tooltip}
            placeholder="Ctrl+Shift+O"
            spellcheck="false"
            autocomplete="off"
          />
          <span class="shortcut-status-indicator" aria-hidden="true" title={overlayUi.tooltip}>
            {overlayUi.symbol}
          </span>
        </div>
      </div>
    </div>

    <div class="shortcut-row">
      <label class="shortcut-label shortcut-row-label" for="shortcut-sticky-hide-input">
        {strings.shortcutStickyHideLabel}
      </label>
      <div class="shortcut-field-main">
        <div
          class="shortcut-input-wrap"
          data-status={stickyHideUi.status}
          data-tooltip={stickyHideUi.tooltip}
        >
          <input
            id="shortcut-sticky-hide-input"
            type="text"
            bind:value={stickyHideDraft}
            data-status={stickyHideUi.status}
            title={stickyHideUi.tooltip}
            placeholder="Ctrl+Shift+H"
            spellcheck="false"
            autocomplete="off"
          />
          <span class="shortcut-status-indicator" aria-hidden="true" title={stickyHideUi.tooltip}>
            {stickyHideUi.symbol}
          </span>
        </div>
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

  .shortcut-input-wrap {
    position: relative;
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
    padding: 0 42px 0 12px;
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

  .shortcut-field-main input[data-status="pending"] {
    color: #b7791f;
  }

  .shortcut-field-main input:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #3b82f6) 42%, #7c8aa5);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ws-accent, #3b82f6) 16%, transparent);
  }

  .shortcut-status-indicator {
    position: absolute;
    right: 11px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    pointer-events: none;
    background: color-mix(in srgb, var(--ws-input-bg, #fff) 92%, #f8fafc);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 84%, transparent);
    color: var(--ws-muted, #64748b);
  }

  .shortcut-input-wrap[data-status="registered"] .shortcut-status-indicator {
    color: #2f855a;
    border-color: color-mix(in srgb, #2f855a 38%, transparent);
  }

  .shortcut-input-wrap[data-status="conflict"] .shortcut-status-indicator,
  .shortcut-input-wrap[data-status="invalid"] .shortcut-status-indicator,
  .shortcut-input-wrap[data-status="error"] .shortcut-status-indicator {
    color: #dc2626;
    border-color: color-mix(in srgb, #dc2626 40%, transparent);
  }

  .shortcut-input-wrap[data-status="disabled"] .shortcut-status-indicator {
    color: var(--ws-muted, #64748b);
  }

  .shortcut-input-wrap[data-status="pending"] .shortcut-status-indicator {
    color: #b7791f;
    border-color: color-mix(in srgb, #b7791f 40%, transparent);
  }

  .shortcut-input-wrap::after {
    content: attr(data-tooltip);
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    max-width: min(320px, 72vw);
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, #ffffff) 94%, #f8fbff);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 88%, transparent);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    color: var(--ws-text, #334155);
    font-size: 12px;
    line-height: 1.45;
    white-space: normal;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition:
      opacity 140ms ease,
      transform 140ms ease;
    z-index: 20;
  }

  .shortcut-input-wrap:hover::after,
  .shortcut-input-wrap:focus-within::after {
    opacity: 1;
    transform: translateY(0);
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
