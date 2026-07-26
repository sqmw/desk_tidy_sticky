<script>
  import WorkspaceSettingsDisplaySection from "$lib/components/workspace/settings/WorkspaceSettingsDisplaySection.svelte";
  import WorkspaceSettingsGeneralSection from "$lib/components/workspace/settings/WorkspaceSettingsGeneralSection.svelte";
  import WorkspaceSettingsStorageSection from "$lib/components/workspace/settings/WorkspaceSettingsStorageSection.svelte";
  import WorkspaceSettingsThemeSection from "$lib/components/workspace/settings/WorkspaceSettingsThemeSection.svelte";
  import FeedbackQrCard from "$lib/components/common/FeedbackQrCard.svelte";

  import { resolveAppLocale } from "$lib/i18n/locale.js";
  let {
    strings,
    show = $bindable(false),
    locale = resolveAppLocale(),
    isAutostartEnabled = false,
    showPanelOnStartup = $bindable(false),
    shortcutSettings,
    shortcutSettingsSaving = false,
    storageMode = /** @type {"app_default" | "custom_directory"} */ ("app_default"),
    storageRoot = "",
    storageSnapshot = null,
    storageSaving = false,
    storageExporting = false,
    storageImporting = false,
    taskStartReminderLeadMinutes = 10,
    pomodoroFocusMinutes = 25,
    zoomOption = "auto",
    fontSize = "medium",
    themePreset = "light",
    themeTransitionShape = "circle",
    themePresetOptions = [],
    toggleAutostart = async () => {},
    onSavePrefs = async () => {},
    onSaveShortcutSettings = async () => {},
    onChangeTaskStartReminderLeadMinutes = async () => {},
    onChangePomodoroFocusMinutes = async () => {},
    onRecoverPinnedStickies = async () => {},
    onApplyMarkdownStorage = async () => ({ ok: false }),
    onExportMarkdownStorage = async () => ({ ok: false }),
    onImportPreviewMarkdownStorage = async () => ({ ok: false }),
    onImportMarkdownStorage = async () => ({ ok: false }),
    themeCustomCss = "",
    onChangeLanguage = () => {},
    onChangeThemePreset = () => {},
    onChangeThemeTransitionShape = async () => {},
    onExportThemeCss = () => {},
    onImportThemeCss = async () => ({ ok: false }),
    onCopyDefaultThemeTemplate = async () => ({ ok: false }),
    onChangeThemeCustomCss = () => {},
    onResetThemeCustomCss = () => {},
    onChangeZoomOption = () => {},
    onChangeFontSize = () => {},
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
          {onRecoverPinnedStickies}
          {onChangeLanguage}
        />

        <WorkspaceSettingsStorageSection
          {strings}
          {storageMode}
          {storageRoot}
          storageSnapshot={storageSnapshot}
          saving={storageSaving}
          exporting={storageExporting}
          importing={storageImporting}
          onApply={onApplyMarkdownStorage}
          onExport={onExportMarkdownStorage}
          onImportPreview={onImportPreviewMarkdownStorage}
          onImport={onImportMarkdownStorage}
        />

        <WorkspaceSettingsThemeSection
          {strings}
          {themePreset}
          {themeTransitionShape}
          {themePresetOptions}
          {themeCustomCss}
          {themeImportStatus}
          {themeImportFailed}
          bind:themeImportInputEl
          onThemePresetClick={handleThemePresetClick}
          {onChangeThemeTransitionShape}
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
          {onChangeZoomOption}
          {onChangeFontSize}
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

  /* Theme tokens come from the inline style (themeVarStyle) built by
     theme-presets.js; do not duplicate preset values here. */

  .settings-dialog {
    width: min(820px, 100%);
    max-height: min(90vh, 960px);
    border: 1px solid color-mix(in srgb, var(--ws-border, #dce5f3) 70%, transparent);
    border-radius: 10px;
    background: var(--ws-panel-bg, rgba(255, 255, 255, 0.96));
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
    overflow: hidden;
  }

  .dialog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 70%, transparent);
  }

  .dialog-head h3 {
    margin: 0;
    font-size: 16px;
    color: var(--ws-text-strong, #0f172a);
  }

  .close-btn {
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
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
    gap: 12px;
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
