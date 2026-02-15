<script>
  let {
    strings,
    show = $bindable(false),
    locale = "en",
    zoomOption = "auto",
    fontSize = "medium",
    sidebarLayoutMode = "auto",
    onChangeLanguage = () => {},
    onChangeZoomOption = () => {},
    onChangeFontSize = () => {},
    onChangeSidebarLayoutMode = () => {},
  } = $props();
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
</style>
