<script>
  import TargetPomodoroInput from "$lib/components/workspace/pomodoro/TargetPomodoroInput.svelte";

  let {
    strings,
    draftFocusMinutes = $bindable(25),
    draftTaskStartReminderEnabled = $bindable(false),
    draftTaskStartReminderLeadMinutes = $bindable(10),
    onSaveSettings = () => {},
    onCancelSettings = () => {},
  } = $props();
</script>

<div class="focus-settings-panel">
  <div class="focus-settings-head">
    <div class="focus-settings-title">{strings.pomodoroTaskSettingsTitle || "Pomodoro task settings"}</div>
    <div class="notify-tip">
      {strings.pomodoroTaskSettingsHint || "Only adjusts pomodoro duration and task-start reminders for focus tasks."}
    </div>
  </div>

  <div class="focus-settings-grid">
    <label class="setting-row">
      <span class="setting-copy">{strings.pomodoroFocusMinutes}</span>
      <TargetPomodoroInput bind:value={draftFocusMinutes} min={5} max={90} title={strings.pomodoroFocusMinutes} />
    </label>
    <label class="setting-row toggle-row">
      <span class="setting-copy">{strings.pomodoroTaskStartReminderToggle || "Task start reminder"}</span>
      <input type="checkbox" bind:checked={draftTaskStartReminderEnabled} />
    </label>
    <label class="setting-row">
      <span class="setting-copy">{strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftTaskStartReminderLeadMinutes}
        min={1}
        max={60}
        title={strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}
      />
    </label>
  </div>

  <div class="focus-settings-actions">
    <button type="button" class="btn primary" onclick={() => onSaveSettings()}>{strings.saveNote}</button>
    <button type="button" class="btn" onclick={() => onCancelSettings()}>{strings.cancel}</button>
  </div>
</div>

<style>
  .focus-settings-panel {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 94%, transparent);
    padding: 10px 12px;
    display: grid;
    gap: 10px;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 65%, transparent);
  }

  .focus-settings-head {
    display: grid;
    gap: 4px;
  }

  .focus-settings-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-text-strong, #0f172a);
  }

  .focus-settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 138px;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--ws-text, #334155);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 88%, transparent);
    border-radius: 10px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
    min-height: 52px;
  }

  .setting-copy {
    font-weight: 600;
    line-height: 1.35;
  }

  .toggle-row {
    grid-template-columns: 1fr auto !important;
    grid-column: 1 / -1;
  }

  .toggle-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--ws-accent, #1d4ed8);
    cursor: pointer;
  }

  .focus-settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .notify-tip {
    font-size: 11px;
    line-height: 1.45;
    color: var(--ws-muted, #64748b);
    max-width: 72ch;
  }

  .btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    height: clamp(32px, 2.2vw, 40px);
    padding: 0 10px;
    font-size: clamp(12px, 0.72vw, 14px);
    cursor: pointer;
  }

  .btn.primary {
    border-color: var(--ws-border-active, #2f4368);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    font-weight: 700;
  }

  @media (max-width: 900px) {
    .focus-settings-grid {
      grid-template-columns: 1fr;
    }

    .setting-row {
      grid-template-columns: 1fr 132px;
    }
  }
</style>
