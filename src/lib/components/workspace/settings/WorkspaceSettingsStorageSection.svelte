<script>
  import {
    MARKDOWN_STORAGE_MODE_APP_DEFAULT,
    MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY,
    normalizeMarkdownStorageMode,
    normalizeMarkdownStorageRoot,
  } from "$lib/workspace/storage/markdown-storage-service.js";

  let {
    strings,
    storageMode = MARKDOWN_STORAGE_MODE_APP_DEFAULT,
    storageRoot = "",
    storageSnapshot = null,
    saving = false,
    exporting = false,
    importing = false,
    onApply = async () => ({ ok: false }),
    onExport = async () => ({ ok: false }),
    onImportPreview = async () => ({ ok: false }),
    onImport = async () => ({ ok: false }),
  } = $props();

  let modeDraft = $state(MARKDOWN_STORAGE_MODE_APP_DEFAULT);
  let rootDraft = $state("");
  let statusMessage = $state("");
  let statusFailed = $state(false);

  $effect(() => {
    modeDraft = normalizeMarkdownStorageMode(storageMode);
  });

  $effect(() => {
    rootDraft = normalizeMarkdownStorageRoot(storageRoot);
  });

  const usingCustomDirectory = $derived(modeDraft === MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY);
  const rootDirty = $derived(rootDraft !== normalizeMarkdownStorageRoot(storageRoot));
  const modeDirty = $derived(modeDraft !== normalizeMarkdownStorageMode(storageMode));
  const canApply = $derived(
    !saving && (modeDirty || rootDirty) && (!usingCustomDirectory || rootDraft.trim().length > 0),
  );

  async function handleApply() {
    if (!canApply) return;
    const result = await onApply({ mode: modeDraft, root: rootDraft });
    statusFailed = !(result && typeof result === "object" && result.ok);
    statusMessage = result?.message || (result?.ok ? strings.markdownStorageApplySuccess : "");
  }

  async function handleExport() {
    if (saving || exporting) return;
    const result = await onExport();
    statusFailed = !(result && typeof result === "object" && result.ok);
    statusMessage = result?.message || "";
    if (!statusMessage && result?.ok) {
      const fileCount = result?.summary?.filesWritten ?? 0;
      const attachmentsCopied = result?.summary?.attachmentsCopied ?? 0;
      statusMessage = strings.markdownStorageExportSuccess
        .replace("{count}", String(fileCount))
        .replace("{attachments}", String(attachmentsCopied));
    }
  }

  async function handleImport() {
    if (saving || exporting || importing) return;
    const preview = await onImportPreview();
    if (!(preview && typeof preview === "object" && preview.ok)) {
      statusFailed = true;
      statusMessage = preview?.message || strings.markdownStorageImportPreviewFailed;
      return;
    }
    const filesScanned = preview?.summary?.filesScanned ?? 0;
    const filesToImport = preview?.summary?.filesToImport ?? 0;
    const filesToUpdate = preview?.summary?.filesToUpdate ?? 0;
    const filesWithoutNoteId = preview?.summary?.filesWithoutNoteId ?? 0;
    const attachmentsToImport = preview?.summary?.attachmentsToImport ?? 0;
    if (filesScanned <= 0) {
      statusFailed = false;
      statusMessage = strings.markdownStorageImportPreviewEmpty;
      return;
    }
    const confirmMessage = strings.markdownStorageImportPreviewConfirm
      .replace("{scanned}", String(filesScanned))
      .replace("{import}", String(filesToImport))
      .replace("{update}", String(filesToUpdate))
      .replace("{attachments}", String(attachmentsToImport))
      .replace("{withoutId}", String(filesWithoutNoteId));
    if (!window.confirm(confirmMessage)) {
      statusFailed = false;
      statusMessage = strings.markdownStorageImportCancelled;
      return;
    }
    const result = await onImport();
    statusFailed = !(result && typeof result === "object" && result.ok);
    statusMessage = result?.message || "";
    if (!statusMessage && result?.ok) {
      const imported = result?.summary?.filesImported ?? 0;
      const updated = result?.summary?.filesUpdated ?? 0;
      const attachmentsImported = result?.summary?.attachmentsImported ?? 0;
      statusMessage = strings.markdownStorageImportSuccess
        .replace("{imported}", String(imported))
        .replace("{updated}", String(updated))
        .replace("{attachments}", String(attachmentsImported));
    }
  }
</script>

<section class="settings-section compact-section">
  <div class="setting-stack">
    <div class="setting-stack-head">
      <span>{strings.markdownStorageTitle}</span>
    </div>

    <label class="setting-row" for="workspace-markdown-storage-mode">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title">{strings.markdownStorageModeLabel}</span>
        <span class="setting-toggle-hint">{strings.markdownStorageModeHint}</span>
      </span>
      <select id="workspace-markdown-storage-mode" bind:value={modeDraft}>
        <option value={MARKDOWN_STORAGE_MODE_APP_DEFAULT}>{strings.markdownStorageModeAppDefault}</option>
        <option value={MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY}>{strings.markdownStorageModeCustomDirectory}</option>
      </select>
    </label>

    {#if usingCustomDirectory}
      <label class="setting-row" for="workspace-markdown-storage-root">
        <span class="setting-toggle-copy">
          <span class="setting-toggle-title">{strings.markdownStorageRootLabel}</span>
          <span class="setting-toggle-hint">{strings.markdownStorageRootHint}</span>
        </span>
        <input
          id="workspace-markdown-storage-root"
          type="text"
          bind:value={rootDraft}
          spellcheck="false"
          placeholder={strings.markdownStorageRootPlaceholder}
        />
      </label>
    {/if}

    <div class="setting-stack storage-summary">
      <div class="storage-summary-head">
        <span>{strings.markdownStorageResolvedRootLabel}</span>
        <span class:status-badge={true} class:status-ready={storageSnapshot?.status === 'ready'} class:status-missing={storageSnapshot?.status === 'missing'}>
          {storageSnapshot?.status === "ready"
            ? strings.markdownStorageStatusReady
            : strings.markdownStorageStatusMissing}
        </span>
      </div>
      <code>{storageSnapshot?.resolvedRoot || storageSnapshot?.defaultRoot || "-"}</code>
      <p class="storage-hint">{storageSnapshot?.message || strings.markdownStorageResolvedRootHint}</p>
      <div class="storage-directory-list">
        <code>{storageSnapshot?.directories?.notes || ""}</code>
        <code>{storageSnapshot?.directories?.review || ""}</code>
        <code>{storageSnapshot?.directories?.attachments || ""}</code>
      </div>
    </div>

    <div class="storage-actions">
      <button type="button" class="action-btn" disabled={!canApply} onclick={() => handleApply()}>
        {saving ? strings.markdownStorageApplying : strings.markdownStorageApply}
      </button>
      <button
        type="button"
        class="action-btn action-btn-secondary"
        disabled={saving || exporting || importing || !storageSnapshot?.resolvedRoot}
        onclick={() => handleExport()}
      >
        {exporting ? strings.markdownStorageExporting : strings.markdownStorageExport}
      </button>
      <button
        type="button"
        class="action-btn action-btn-secondary"
        disabled={saving || exporting || importing || !storageSnapshot?.resolvedRoot}
        onclick={() => handleImport()}
      >
        {importing ? strings.markdownStorageImporting : strings.markdownStorageImport}
      </button>
      {#if statusMessage}
        <span class:status-error={statusFailed} class="storage-status-copy">{statusMessage}</span>
      {/if}
    </div>
  </div>
</section>

<style>
  .settings-section {
    display: grid;
    gap: 10px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 80%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.96)) 88%, var(--ws-btn-bg, #fbfdff));
    padding: 14px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 72%, transparent);
  }

  .compact-section {
    padding: 12px 14px;
  }

  .setting-stack {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 12px;
    padding: 12px;
    display: grid;
    gap: 10px;
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 70%, transparent);
  }

  .setting-stack-head,
  .storage-summary-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
  }

  .setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    gap: 10px;
    align-items: center;
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 600;
  }

  .setting-row select,
  .setting-row input {
    width: 100%;
    border: 1px solid var(--ws-input-border, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-input-bg, #fbfdff);
    color: var(--ws-input-text, #0f172a);
    min-height: 36px;
    padding: 0 10px;
    font-size: 12px;
    outline: none;
  }

  .setting-toggle-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .setting-toggle-title {
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
  }

  .setting-toggle-hint,
  .storage-hint,
  .storage-status-copy {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.45;
  }

  .storage-summary code,
  .storage-directory-list code {
    display: block;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 82%, transparent);
    background: color-mix(in srgb, var(--ws-card-bg, #fdfefe) 88%, transparent);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--ws-text-strong, #0f172a);
    overflow-wrap: anywhere;
  }

  .storage-directory-list {
    display: grid;
    gap: 8px;
  }

  .storage-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .action-btn {
    min-height: 34px;
    border-radius: 10px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .action-btn-secondary {
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 72%, transparent);
  }

  .action-btn:disabled {
    opacity: 0.55;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    font-size: 11px;
    font-weight: 700;
  }

  .status-ready {
    color: var(--ws-accent, #1d4ed8);
    background: color-mix(in srgb, var(--ws-badge-bg, #e8f0ff) 75%, transparent);
  }

  .status-missing,
  .status-error {
    color: #b45309;
  }
</style>
