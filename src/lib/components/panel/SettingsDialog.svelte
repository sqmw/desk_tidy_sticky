<script>
  let {
    strings,
    showSettings = $bindable(),
    isAutostartEnabled,
    showPanelOnStartup = $bindable(),
    toggleAutostart,
    savePrefs,
  } = $props();
</script>

{#if showSettings}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dialog-backdrop"
    role="button"
    tabindex="-1"
    onclick={() => (showSettings = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="dialog settings-dialog" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-header">
        <div class="dialog-title-group">
          <h3>{strings.settingsTitle}</h3>
          <span class="version-badge">{strings.version}</span>
        </div>
        <a
          href="https://github.com/sqmw/desk_tidy_sticky"
          target="_blank"
          rel="noopener"
          class="github-link"
          title={strings.starOnGithub}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          <span>Star</span>
        </a>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h4>{strings.general}</h4>
          <label class="setting-item">
            <span class="setting-label">{strings.autoStart}</span>
            <div class="toggle-switch">
              <input
                type="checkbox"
                checked={isAutostartEnabled}
                onchange={(e) =>
                  toggleAutostart(
                    /** @type {HTMLInputElement} */ (e.target).checked,
                  )}
              />
              <span class="slider"></span>
            </div>
          </label>

          <label class="setting-item">
            <span class="setting-label">{strings.showPanelOnStartup}</span>
            <div class="toggle-switch">
              <input
                type="checkbox"
                checked={showPanelOnStartup}
                onchange={(e) => {
                  const checked = /** @type {HTMLInputElement} */ (e.target).checked;
                  showPanelOnStartup = checked;
                  savePrefs({ showPanelOnStartup: checked });
                }}
              />
              <span class="slider"></span>
            </div>
          </label>
        </div>

        <div class="settings-section">
          <h4>{strings.shortcuts}</h4>
          <div class="shortcuts-grid">
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutToggle.split(":")[0]}</span>
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutOverlay.split(":")[0]}</span>
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutPinSave.split(":")[0]}</span>
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutEsc.split(":")[0]}</span>
              <kbd>Esc</kbd>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button type="button" class="primary block-btn" onclick={() => (showSettings = false)}>
          {strings.close}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    min-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .settings-dialog {
    width: 380px;
    padding: 0;
    overflow: hidden;
  }

  .dialog-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--divider);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  .dialog-title-group h3 {
    margin: 0;
    font-size: 18px;
    color: var(--neutral);
    margin-bottom: 4px;
  }

  .version-badge {
    font-size: 11px;
    color: #888;
    background: #eee;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .github-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--neutral);
    text-decoration: none;
    background: #fff;
    border: 1px solid #dcdfe6;
    padding: 6px 12px;
    border-radius: 20px;
    transition: all 0.2s;
  }

  .github-link:hover {
    border-color: #333;
    background: #333;
    color: #fff;
  }

  .settings-content {
    padding: 24px;
    max-height: 400px;
    overflow-y: auto;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h4 {
    margin: 0 0 12px;
    font-size: 12px;
    text-transform: uppercase;
    color: #999;
    letter-spacing: 0.5px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    cursor: pointer;
    user-select: none;
  }

  .setting-label {
    font-size: 14px;
    color: var(--neutral);
  }

  .shortcuts-grid {
    display: grid;
    gap: 8px;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #555;
  }

  kbd {
    background: #f4f4f5;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    box-shadow: 0 1px 0 #e4e7ed;
    color: #606266;
    display: inline-block;
    font-family: monospace;
    font-size: 11px;
    padding: 2px 6px;
    margin: 0 2px;
    min-width: 20px;
    text-align: center;
  }

  .dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--divider);
    background: #fafafa;
    display: flex;
    justify-content: flex-end;
  }

  .block-btn {
    width: 100%;
    justify-content: center;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #dcdfe6;
    transition: 0.3s;
    border-radius: 20px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  input:checked + .slider {
    background-color: var(--primary);
  }

  input:checked + .slider:before {
    transform: translateX(16px);
  }

  .dialog-footer button.primary {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--primary);
    cursor: pointer;
    font-size: 14px;
    background: var(--primary);
    color: #fff;
  }
</style>
