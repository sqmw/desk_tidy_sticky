<script>
  let {
    strings,
    show = $bindable(false),
    locale = "en",
    zoomOption = "auto",
    fontSize = "medium",
    sidebarLayoutMode = "auto",
    themePreset = "light",
    themePresetOptions = [],
    themeCustomCss = "",
    onChangeLanguage = () => {},
    onChangeThemePreset = () => {},
    onExportTheme = () => {},
    onImportTheme = async () => ({ ok: false }),
    onChangeThemeCustomCss = () => {},
    onResetThemeCustomCss = () => {},
    onChangeZoomOption = () => {},
    onChangeFontSize = () => {},
    onChangeSidebarLayoutMode = () => {},
  } = $props();

  /** @type {HTMLInputElement | null} */
  let themeImportInputEl = $state(null);
  let themeImportStatus = $state("");
  let themeImportFailed = $state(false);

  /**
   * @param {string} preset
   */
  async function handleThemePresetClick(preset) {
    themeImportStatus = "";
    themeImportFailed = false;
    await onChangeThemePreset(preset);
  }

  function openThemeImportPicker() {
    themeImportInputEl?.click();
  }

  /** @param {Event} event */
  async function handleThemeImportChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget);
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await onImportTheme(text);
      if (result && typeof result === "object" && result.ok === false) {
        themeImportFailed = true;
        themeImportStatus = result.message || strings.workspaceThemeImportFailed || "Import failed";
      } else {
        themeImportFailed = false;
        themeImportStatus = strings.workspaceThemeImportSuccess || "Imported";
      }
    } catch (error) {
      console.error("theme import failed", error);
      themeImportFailed = true;
      themeImportStatus = strings.workspaceThemeImportFailed || "Import failed";
    } finally {
      input.value = "";
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="settings-backdrop" role="button" tabindex="-1" onclick={() => (show = false)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="settings-dialog" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-head">
        <h3>{strings.settingsTitle}</h3>
        <button type="button" class="close-btn" onclick={() => (show = false)}>{strings.close}</button>
      </div>

      <div class="dialog-body">
        <label class="setting-row" for="workspace-setting-language">
          <span>{strings.language}</span>
          <select
            id="workspace-setting-language"
            value={locale}
            onchange={(e) => onChangeLanguage(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </label>

        <div class="setting-stack theme-preset-stack">
          <div class="setting-stack-head">
            <span>{strings.workspaceThemePreset || "Theme preset"}</span>
          </div>
          <div class="theme-preset-grid">
            {#each themePresetOptions as option (option.value)}
              <button
                type="button"
                class="theme-card"
                class:active={themePreset === option.value}
                onclick={() => handleThemePresetClick(option.value)}
              >
                <span class="theme-card-title">{option.label}</span>
                <span
                  class="theme-card-preview"
                  style={`--theme-preview-bg:${option.previewBg || "#f8fafc"}; --theme-preview-text:${option.previewText || "#0f172a"}; --theme-preview-accent:${option.previewAccent || "#1d4ed8"};`}
                >
                  <span class="theme-card-line strong"></span>
                  <span class="theme-card-line"></span>
                  <span class="theme-card-chip"></span>
                </span>
              </button>
            {/each}
          </div>
        </div>

        <label class="setting-row" for="workspace-setting-zoom">
          <span>{strings.workspaceDisplayScale}</span>
          <select
            id="workspace-setting-zoom"
            value={zoomOption}
            onchange={(e) => onChangeZoomOption(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
          >
            <option value="auto">{strings.workspaceDisplayScaleAuto}</option>
            <option value="0.9">90%</option>
            <option value="1">100%</option>
            <option value="1.1">110%</option>
            <option value="1.25">125%</option>
            <option value="1.4">140%</option>
          </select>
        </label>

        <label class="setting-row" for="workspace-setting-font-size">
          <span>{strings.workspaceFontSize}</span>
          <select
            id="workspace-setting-font-size"
            value={fontSize}
            onchange={(e) => onChangeFontSize(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
          >
            <option value="small">{strings.workspaceFontSizeSmall}</option>
            <option value="medium">{strings.workspaceFontSizeMedium}</option>
            <option value="large">{strings.workspaceFontSizeLarge}</option>
          </select>
        </label>

        <label class="setting-row" for="workspace-setting-sidebar-layout">
          <span>{strings.workspaceSidebarLayoutMode || "Sidebar layout"}</span>
          <select
            id="workspace-setting-sidebar-layout"
            value={sidebarLayoutMode}
            onchange={(e) => onChangeSidebarLayoutMode(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
          >
            <option value="auto">{strings.workspaceSidebarLayoutAuto || "Auto priority"}</option>
            <option value="manual">{strings.workspaceSidebarLayoutManual || "Manual fixed"}</option>
          </select>
        </label>

        <div class="setting-stack">
          <div class="setting-stack-head">
            <span>{strings.workspaceThemeCustomCss || "Custom CSS"}</span>
          </div>
          <div class="theme-actions">
            <button type="button" class="clear-btn" onclick={() => onExportTheme()}>
              {strings.workspaceThemeExport || "Export JSON"}
            </button>
            <button type="button" class="clear-btn" onclick={openThemeImportPicker}>
              {strings.workspaceThemeImport || "Import JSON"}
            </button>
            <button type="button" class="clear-btn" onclick={() => onResetThemeCustomCss()}>
              {strings.clear}
            </button>
            <input
              bind:this={themeImportInputEl}
              class="theme-import-input"
              type="file"
              accept="application/json,.json"
              onchange={handleThemeImportChange}
            />
          </div>
          <textarea
            class="css-editor"
            rows="6"
            value={themeCustomCss}
            oninput={(e) => onChangeThemeCustomCss(/** @type {HTMLTextAreaElement} */ (e.currentTarget).value)}
            placeholder={strings.workspaceThemeCustomCssPlaceholder || ".workspace { --ws-accent: #4f46e5; }"}
          ></textarea>
          {#if themeImportStatus}
            <small class:status-error={themeImportFailed}>{themeImportStatus}</small>
          {/if}
          <small>{strings.workspaceThemeCustomCssHint || "Applied immediately and saved automatically."}</small>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2400;
    background: color-mix(in srgb, #020617 38%, transparent);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .settings-dialog {
    width: min(480px, 100%);
    border: 1px solid var(--ws-border, #dce5f3);
    border-radius: 14px;
    background: var(--ws-panel-bg, rgba(255, 255, 255, 0.96));
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.26);
    overflow: hidden;
  }

  .dialog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 90%, transparent);
  }

  .dialog-head h3 {
    margin: 0;
    font-size: 16px;
    color: var(--ws-text-strong, #0f172a);
  }

  .close-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    min-height: 32px;
    padding: 0 12px;
    cursor: pointer;
  }

  .dialog-body {
    padding: 14px 16px 16px;
    display: grid;
    gap: 10px;
  }

  .setting-row {
    display: grid;
    grid-template-columns: 1fr 160px;
    gap: 10px;
    align-items: center;
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 600;
  }

  .setting-row select {
    width: 100%;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    min-height: 34px;
    padding: 0 10px;
    font-size: 12px;
    outline: none;
  }

  .setting-row select:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
  }

  .setting-stack {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 12px;
    padding: 10px;
    display: grid;
    gap: 8px;
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 70%, transparent);
  }

  .setting-stack-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
  }

  .theme-preset-stack {
    gap: 10px;
  }

  .theme-preset-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .theme-card {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    display: grid;
    gap: 8px;
    padding: 8px;
    text-align: left;
    cursor: pointer;
  }

  .theme-card:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .theme-card.active {
    border-color: var(--ws-border-active, #94a3b8);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ws-accent, #1d4ed8) 25%, transparent);
  }

  .theme-card-title {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
  }

  .theme-card-preview {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 70%, transparent);
    border-radius: 8px;
    background: var(--theme-preview-bg, #f8fafc);
    min-height: 42px;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 5px 8px;
    padding: 6px;
  }

  .theme-card-line {
    display: block;
    grid-column: 1 / span 2;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--theme-preview-text, #0f172a) 35%, transparent);
  }

  .theme-card-line.strong {
    width: 70%;
    background: color-mix(in srgb, var(--theme-preview-text, #0f172a) 60%, transparent);
  }

  .theme-card-chip {
    justify-self: end;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: var(--theme-preview-accent, #1d4ed8);
  }

  .theme-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .theme-import-input {
    display: none;
  }

  .clear-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 8px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    min-height: 28px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .css-editor {
    width: 100%;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    min-height: 110px;
    resize: vertical;
    padding: 10px;
    font-size: 12px;
    font-family: "Consolas", "SFMono-Regular", "Microsoft YaHei UI", monospace;
    line-height: 1.45;
    outline: none;
  }

  .css-editor:hover,
  .css-editor:focus {
    border-color: var(--ws-border-hover, #c6d5e8);
  }

  .setting-stack small {
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    line-height: 1.4;
  }

  .setting-stack small.status-error {
    color: color-mix(in srgb, #dc2626 76%, var(--ws-text, #334155));
    font-weight: 700;
  }

  @media (max-width: 540px) {
    .theme-preset-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
