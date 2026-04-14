<script>
  let {
    strings,
    zoomOption = "auto",
    fontSize = "medium",
    sidebarLayoutMode = "auto",
    onChangeZoomOption = () => {},
    onChangeFontSize = () => {},
    onChangeSidebarLayoutMode = () => {},
  } = $props();
</script>

<section class="settings-section compact-section">
  <div class="setting-grid">
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

  .setting-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
  }

  .setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
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

  @media (max-width: 540px) {
    .setting-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .setting-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
