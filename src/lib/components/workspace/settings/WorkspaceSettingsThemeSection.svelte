<script>
  let {
    strings,
    themePreset = "light",
    themeTransitionShape = "circle",
    themePresetOptions = [],
    themeCustomCss = "",
    themeImportStatus = "",
    themeImportFailed = false,
    themeImportInputEl = $bindable(null),
    onThemePresetClick = async () => {},
    onChangeThemeTransitionShape = async () => {},
    onOpenThemeImportPicker = () => {},
    onCopyDefaultThemeTemplate = async () => {},
    onResetThemeCustomCss = () => {},
    onExportThemeCss = () => {},
    onChangeThemeCustomCss = () => {},
    onThemeImportChange = async () => {},
  } = $props();
</script>

<section class="settings-section">
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
          onclick={() => onThemePresetClick(option.value)}
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

  <div class="setting-stack theme-custom-stack">
    <div class="theme-custom-head">
      <span>{strings.workspaceThemeCustomCss || "Custom theme"}</span>
    </div>
    <div class="theme-actions">
      <button type="button" class="clear-btn" onclick={() => onExportThemeCss()}>
        {strings.workspaceThemeExport || "Export theme"}
      </button>
      <button type="button" class="clear-btn" onclick={() => onOpenThemeImportPicker()}>
        {strings.workspaceThemeImport || "Import theme"}
      </button>
      <button type="button" class="clear-btn" onclick={() => onCopyDefaultThemeTemplate()}>
        {strings.workspaceThemeCopyDefault || "Copy default template"}
      </button>
      <button type="button" class="clear-btn" onclick={() => onResetThemeCustomCss()}>
        {strings.clear}
      </button>
      <input
        bind:this={themeImportInputEl}
        class="theme-import-input"
        type="file"
        accept=".css,text/css,text/plain"
        onchange={(e) => onThemeImportChange(e)}
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

  <div class="setting-stack theme-transition-stack">
    <div class="setting-stack-head">
      <span>{strings.workspaceThemeTransitionStyle || "Theme transition"}</span>
    </div>
    <div class="transition-shape-row">
      <button
        type="button"
        class="transition-shape-btn"
        class:active={themeTransitionShape === "circle"}
        onclick={() => onChangeThemeTransitionShape("circle")}
      >
        <span class="transition-shape-indicator" aria-hidden="true"></span>
        <span>{strings.themeTransitionCircle}</span>
      </button>
      <button
        type="button"
        class="transition-shape-btn"
        class:active={themeTransitionShape === "heart"}
        onclick={() => onChangeThemeTransitionShape("heart")}
      >
        <span class="transition-shape-indicator" aria-hidden="true"></span>
        <span>{strings.themeTransitionHeart}</span>
      </button>
    </div>
    <small>{strings.workspaceThemeTransitionStyleHint || "Choose how the workstation theme spreads when switching light and dark."}</small>
  </div>
</section>

<style>
  .settings-section {
    display: grid;
    gap: 10px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 44%, transparent);
    border-radius: 0;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }

  .setting-stack {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 32%, transparent);
    border-radius: 0;
    padding: 12px 0 0;
    display: grid;
    gap: 10px;
    background: transparent;
  }

  .setting-stack-head,
  .theme-custom-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
    flex-wrap: wrap;
  }

  .theme-preset-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .theme-card {
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    display: grid;
    gap: 8px;
    padding: 8px;
    text-align: left;
    cursor: pointer;
  }

  .theme-card:hover {
    border-color: transparent;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .theme-card.active {
    border-color: transparent;
    box-shadow: none;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent);
  }

  .theme-card-title {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
  }

  .theme-card-preview {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 30%, transparent);
    border-radius: 0;
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    gap: 8px;
  }

  .transition-shape-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .transition-shape-btn {
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    min-height: 42px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .transition-shape-btn:hover {
    border-color: transparent;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .transition-shape-btn.active {
    border-color: transparent;
    box-shadow: none;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent);
  }

  .transition-shape-indicator {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1.5px solid color-mix(in srgb, var(--ws-border-active, #94a3b8) 72%, transparent);
    background: transparent;
    box-sizing: border-box;
    position: relative;
    flex-shrink: 0;
  }

  .transition-shape-indicator::after {
    content: "";
    position: absolute;
    inset: 3px;
    border-radius: inherit;
    background: transparent;
    transition: background 0.16s ease;
  }

  .transition-shape-btn.active .transition-shape-indicator {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 68%, white);
  }

  .transition-shape-btn.active .transition-shape-indicator::after {
    background: var(--ws-accent, #1d4ed8);
  }

  .theme-import-input {
    display: none;
  }

  .clear-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 8px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    min-height: 34px;
    padding: 0 12px;
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
    min-height: 170px;
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

  small {
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    line-height: 1.4;
  }

  small.status-error {
    color: color-mix(in srgb, #dc2626 76%, var(--ws-text, #334155));
    font-weight: 700;
  }

  @media (max-width: 540px) {
    .theme-preset-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .theme-actions {
      grid-template-columns: minmax(0, 1fr);
    }

    .transition-shape-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
