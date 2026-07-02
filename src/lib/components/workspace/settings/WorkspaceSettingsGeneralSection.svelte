<script>
  import TargetPomodoroInput from "$lib/components/workspace/pomodoro/TargetPomodoroInput.svelte";
  import HelpTip from "$lib/components/workspace/ui/HelpTip.svelte";
  import ShortcutSettingsSection from "$lib/components/common/ShortcutSettingsSection.svelte";

  import { resolveAppLocale } from "$lib/i18n/locale.js";
  let {
    strings,
    locale = resolveAppLocale(),
    isAutostartEnabled = false,
    showPanelOnStartup = false,
    shortcutSettings,
    shortcutSettingsSaving = false,
    pomodoroFocusMinutes = 25,
    taskStartReminderLeadMinutes = 10,
    toggleAutostart = async () => {},
    onSavePrefs = async () => {},
    onSaveShortcutSettings = async () => {},
    onChangePomodoroFocusMinutes = async () => {},
    onChangeTaskStartReminderLeadMinutes = async () => {},
    onRecoverPinnedStickies = async () => {},
    onChangeLanguage = () => {},
  } = $props();

  let recoveringStickies = $state(false);

  async function handleRecoverPinnedStickies() {
    if (recoveringStickies) return;
    try {
      recoveringStickies = true;
      await onRecoverPinnedStickies();
    } finally {
      recoveringStickies = false;
    }
  }
</script>

<section class="settings-section compact-section">
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
</section>

<section class="settings-section compact-section">
  <div class="setting-stack">
    <div class="setting-stack-head">
      <span>{strings.shortcuts}</span>
    </div>
    <ShortcutSettingsSection
      {strings}
      {shortcutSettings}
      saving={shortcutSettingsSaving}
      onSave={onSaveShortcutSettings}
      variant="workspace"
    />
  </div>
</section>

<section class="settings-section compact-section">
  <div class="setting-stack">
    <div class="setting-stack-head">
      <span>{strings.general}</span>
    </div>

    <label class="setting-toggle">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title">{strings.autoStart}</span>
      </span>
      <span class="toggle-switch">
        <input
          type="checkbox"
          checked={isAutostartEnabled}
          onchange={(e) => toggleAutostart(/** @type {HTMLInputElement} */ (e.currentTarget).checked)}
        />
        <span class="toggle-slider"></span>
      </span>
    </label>

    <label class="setting-toggle">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title">{strings.showPanelOnStartup}</span>
      </span>
      <span class="toggle-switch">
        <input
          type="checkbox"
          checked={showPanelOnStartup}
          onchange={(e) => {
            const checked = /** @type {HTMLInputElement} */ (e.currentTarget).checked;
            onSavePrefs({ showPanelOnStartup: checked });
          }}
        />
        <span class="toggle-slider"></span>
      </span>
    </label>

    <label class="setting-row compact-control-row">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title">
          {strings.pomodoroTaskReminderDefaultLeadMinutes || "Default task reminder lead time (min)"}
        </span>
      </span>
      <TargetPomodoroInput
        value={taskStartReminderLeadMinutes}
        min={1}
        max={60}
        title={strings.pomodoroTaskReminderDefaultLeadMinutes || "Default task reminder lead time (min)"}
        onCommit={(/** @type {number} */ nextMinutes) => onChangeTaskStartReminderLeadMinutes(nextMinutes)}
      />
    </label>

    <div class="setting-row compact-action-row">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title">
          {strings.workspaceRecoverPinnedStickiesTitle || "Recover pinned stickies"}
        </span>
        <span class="setting-toggle-hint">
          {strings.workspaceRecoverPinnedStickiesHint ||
            "If a sticky was dragged off-screen, bring all pinned stickies back into the primary monitor."}
        </span>
      </span>
      <button
        type="button"
        class="action-btn"
        disabled={recoveringStickies}
        onclick={() => handleRecoverPinnedStickies()}
      >
        {recoveringStickies
          ? (strings.workspaceRecoverPinnedStickiesRunning || "Recovering...")
          : (strings.workspaceRecoverPinnedStickiesAction || "Recover now")}
      </button>
    </div>
  </div>
</section>

<section class="settings-section compact-section">
  <div class="setting-stack">
    <div class="setting-stack-head">
      <span>{strings.pomodoro || "Pomodoro"}</span>
    </div>

    <label class="setting-row compact-control-row">
      <span class="setting-toggle-copy">
        <span class="setting-toggle-title setting-title-with-tip">
          {strings.pomodoroFocusMinutes || "Pomodoro duration (min)"}
          <HelpTip
            text={strings.pomodoroFocusMinutesHint ||
              "A pomodoro is counted after this full duration completes. Changes apply to new cycles."}
            ariaLabel="Pomodoro duration help"
          />
        </span>
      </span>
      <TargetPomodoroInput
        value={pomodoroFocusMinutes}
        min={5}
        max={90}
        title={strings.pomodoroFocusMinutes || "Pomodoro duration (min)"}
        onCommit={(/** @type {number} */ nextMinutes) => onChangePomodoroFocusMinutes(nextMinutes)}
      />
    </label>
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

  .compact-section {
    padding: 0;
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

  .setting-stack {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 32%, transparent);
    border-radius: 0;
    padding: 12px 0 0;
    display: grid;
    gap: 10px;
    background: transparent;
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

  .setting-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 72%, transparent);
    border-radius: 10px;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.96)) 55%, var(--ws-btn-bg, #fbfdff));
  }

  .compact-control-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .compact-action-row {
    grid-template-columns: minmax(0, 1fr) auto;
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

  .setting-title-with-tip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .setting-toggle-hint {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
  }

  .action-btn {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color 0.14s ease, background 0.14s ease, transform 0.14s ease;
  }

  .action-btn:hover:enabled {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  .action-btn:disabled {
    opacity: 0.62;
    cursor: default;
    transform: none;
  }

  .toggle-switch {
    position: relative;
    display: inline-flex;
    width: 46px;
    height: 28px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }

  .toggle-slider {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 56%, #fff);
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .toggle-slider::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(15, 23, 42, 0.16);
    transition: transform 0.18s ease;
  }

  .toggle-switch input:checked + .toggle-slider {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 54%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 82%, #ffffff);
  }

  .toggle-switch input:checked + .toggle-slider::after {
    transform: translateX(18px);
  }

  @media (max-width: 540px) {
    .setting-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .setting-toggle {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
