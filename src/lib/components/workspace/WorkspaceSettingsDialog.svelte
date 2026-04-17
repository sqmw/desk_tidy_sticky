<script>
  import WorkspaceSettingsDisplaySection from "$lib/components/workspace/settings/WorkspaceSettingsDisplaySection.svelte";
  import WorkspaceSettingsGeneralSection from "$lib/components/workspace/settings/WorkspaceSettingsGeneralSection.svelte";
  import WorkspaceSettingsThemeSection from "$lib/components/workspace/settings/WorkspaceSettingsThemeSection.svelte";
  import FeedbackQrCard from "$lib/components/common/FeedbackQrCard.svelte";

  let {
    strings,
    show = $bindable(false),
    locale = "en",
    isAutostartEnabled = false,
    showPanelOnStartup = $bindable(false),
    shortcutSettings,
    shortcutSettingsSaving = false,
    taskStartReminderLeadMinutes = 10,
    pomodoroFocusMinutes = 25,
    zoomOption = "auto",
    fontSize = "medium",
    sidebarLayoutMode = "auto",
    themePreset = "light",
    themePresetOptions = [],
    toggleAutostart = async () => {},
    onSavePrefs = async () => {},
    onSaveShortcutSettings = async () => {},
    onChangeTaskStartReminderLeadMinutes = async () => {},
    onChangePomodoroFocusMinutes = async () => {},
    themeCustomCss = "",
    onChangeLanguage = () => {},
    onChangeThemePreset = () => {},
    onExportThemeCss = () => {},
    onImportThemeCss = async () => ({ ok: false }),
    onCopyDefaultThemeTemplate = async () => ({ ok: false }),
    onChangeThemeCustomCss = () => {},
    onResetThemeCustomCss = () => {},
    onChangeZoomOption = () => {},
    onChangeFontSize = () => {},
    onChangeSidebarLayoutMode = () => {},
    themeDark = false,
    themeVarStyle = "",
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

  async function handleCopyDefaultThemeTemplate() {
    try {
      const result = await onCopyDefaultThemeTemplate();
      if (result && typeof result === "object" && result.ok === false) {
        themeImportFailed = true;
        themeImportStatus =
          result.message || strings.workspaceThemeCopyDefaultFailed || strings.workspaceThemeImportFailed || "Copy failed";
        return;
      }
      themeImportFailed = false;
      themeImportStatus = strings.workspaceThemeCopyDefaultSuccess || "Template copied";
    } catch (error) {
      console.error("copy default theme template failed", error);
      themeImportFailed = true;
      themeImportStatus =
        strings.workspaceThemeCopyDefaultFailed || strings.workspaceThemeImportFailed || "Copy failed";
    }
  }

  /** @param {Event} event */
  async function handleThemeImportChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.currentTarget);
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await onImportThemeCss(text);
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
  <div
    class="settings-backdrop"
    class:theme-dark={themeDark}
    style={themeVarStyle}
    role="button"
    tabindex="-1"
    onclick={() => (show = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="settings-dialog" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <div class="dialog-head">
        <h3>{strings.settingsTitle}</h3>
        <button type="button" class="close-btn" onclick={() => (show = false)}>{strings.close}</button>
      </div>

      <div class="dialog-body">
        <WorkspaceSettingsGeneralSection
          {strings}
          {locale}
          {isAutostartEnabled}
          {showPanelOnStartup}
          {shortcutSettings}
          {shortcutSettingsSaving}
          {taskStartReminderLeadMinutes}
          {pomodoroFocusMinutes}
          {toggleAutostart}
          {onSavePrefs}
          {onSaveShortcutSettings}
          {onChangeTaskStartReminderLeadMinutes}
          {onChangePomodoroFocusMinutes}
          {onChangeLanguage}
        />

        <WorkspaceSettingsThemeSection
          {strings}
          {themePreset}
          {themePresetOptions}
          {themeCustomCss}
          {themeImportStatus}
          {themeImportFailed}
          bind:themeImportInputEl
          onThemePresetClick={handleThemePresetClick}
          onOpenThemeImportPicker={openThemeImportPicker}
          onCopyDefaultThemeTemplate={handleCopyDefaultThemeTemplate}
          onResetThemeCustomCss={onResetThemeCustomCss}
          onExportThemeCss={onExportThemeCss}
          onChangeThemeCustomCss={onChangeThemeCustomCss}
          onThemeImportChange={handleThemeImportChange}
        />

        <WorkspaceSettingsDisplaySection
          {strings}
          {zoomOption}
          {fontSize}
          {sidebarLayoutMode}
          {onChangeZoomOption}
          {onChangeFontSize}
          onChangeSidebarLayoutMode={onChangeSidebarLayoutMode}
        />

        <FeedbackQrCard {strings} variant="workspace" />
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-backdrop {
    --ws-text-strong: #0f172a;
    --ws-text: #334155;
    --ws-muted: #64748b;
    --ws-accent: #1d4ed8;
    --ws-panel-bg: rgba(255, 255, 255, 0.92);
    --ws-card-bg: #fdfefe;
    --ws-btn-bg: #fbfdff;
    --ws-btn-hover: #f4f8ff;
    --ws-btn-active: linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%);
    --ws-badge-bg: #e8f0ff;
    --ws-badge-border: #d7e5ff;
    --ws-border: #dce5f3;
    --ws-border-soft: #d9e2ef;
    --ws-border-hover: #c6d5e8;
    --ws-border-active: #94a3b8;
    --ws-scrollbar-track: rgba(148, 163, 184, 0.14);
    --ws-scrollbar-thumb: rgba(71, 85, 105, 0.45);
    --ws-scrollbar-thumb-hover: rgba(51, 65, 85, 0.62);
    --ws-input-bg: #fbfdff;
    --ws-input-border: #d9e2ef;
    --ws-input-text: #0f172a;
    position: fixed;
    inset: 0;
    z-index: 2400;
    background: color-mix(in srgb, #020617 38%, transparent);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .settings-backdrop.theme-dark {
    --ws-text-strong: #e5ecf7;
    --ws-text: #c6d0dd;
    --ws-muted: #94a3b8;
    --ws-accent: #7aa2ff;
    --ws-panel-bg: rgba(16, 23, 36, 0.92);
    --ws-card-bg: #152033;
    --ws-btn-bg: #1a2740;
    --ws-btn-hover: #233454;
    --ws-btn-active: linear-gradient(180deg, #1d2f50 0%, #263a5a 100%);
    --ws-badge-bg: #1a2c49;
    --ws-badge-border: #2f4a75;
    --ws-border: #2b3a54;
    --ws-border-soft: #31445f;
    --ws-border-hover: #415981;
    --ws-border-active: #6389c9;
    --ws-scrollbar-track: rgba(148, 163, 184, 0.14);
    --ws-scrollbar-thumb: rgba(148, 163, 184, 0.42);
    --ws-scrollbar-thumb-hover: rgba(186, 201, 224, 0.58);
    --ws-input-bg: #12233a;
    --ws-input-border: #324561;
    --ws-input-text: #dbe7f7;
  }

  .settings-dialog {
    width: min(820px, 100%);
    max-height: min(90vh, 960px);
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
    padding: 16px 18px 18px;
    display: grid;
    gap: 14px;
    max-height: calc(min(90vh, 960px) - 72px);
    overflow: auto;
  }

  @media (max-width: 540px) {
    .settings-dialog {
      width: min(100%, 560px);
    }

    .dialog-body {
      padding: 14px;
    }
  }
</style>
