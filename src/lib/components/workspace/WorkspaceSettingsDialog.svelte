<script>
  import WorkspaceSettingsDisplaySection from "$lib/components/workspace/settings/WorkspaceSettingsDisplaySection.svelte";
  import WorkspaceSettingsGeneralSection from "$lib/components/workspace/settings/WorkspaceSettingsGeneralSection.svelte";
  import WorkspaceSettingsThemeSection from "$lib/components/workspace/settings/WorkspaceSettingsThemeSection.svelte";

  let {
    strings,
    show = $bindable(false),
    locale = "en",
    isAutostartEnabled = false,
    showPanelOnStartup = $bindable(false),
    taskStartReminderLeadMinutes = 10,
    zoomOption = "auto",
    fontSize = "medium",
    sidebarLayoutMode = "auto",
    themePreset = "light",
    themePresetOptions = [],
    toggleAutostart = async () => {},
    onSavePrefs = async () => {},
    onChangeTaskStartReminderLeadMinutes = async () => {},
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
  <div class="settings-backdrop" role="button" tabindex="-1" onclick={() => (show = false)}>
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
          {taskStartReminderLeadMinutes}
          {toggleAutostart}
          {onSavePrefs}
          {onChangeTaskStartReminderLeadMinutes}
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
