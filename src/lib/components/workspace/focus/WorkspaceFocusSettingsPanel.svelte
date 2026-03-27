<script>
  import TargetPomodoroInput from "$lib/components/workspace/focus/TargetPomodoroInput.svelte";

  let {
    strings,
    draftFocusMinutes = $bindable(25),
    draftMiniBreakEveryMinutes = $bindable(10),
    draftMiniBreakDurationSeconds = $bindable(20),
    draftLongBreakEveryMinutes = $bindable(30),
    draftLongBreakDurationMinutes = $bindable(5),
    draftBreakNotifyBeforeSeconds = $bindable(10),
    draftTaskStartReminderEnabled = $bindable(false),
    draftTaskStartReminderLeadMinutes = $bindable(10),
    draftMiniBreakPostponeMinutes = $bindable(5),
    draftLongBreakPostponeMinutes = $bindable(10),
    draftBreakPostponeLimit = $bindable(3),
    draftBreakStrictMode = $bindable(false),
    onSaveSettings = () => {},
    onCancelSettings = () => {},
  } = $props();
</script>

<div class="focus-settings-panel">
  <div class="focus-settings-grid">
    <label>
      <span>{strings.pomodoroFocusMinutes}</span>
      <TargetPomodoroInput bind:value={draftFocusMinutes} min={5} max={90} title={strings.pomodoroFocusMinutes} />
    </label>
    <label>
      <span>{strings.pomodoroMiniBreakEveryMinutes || "Mini break every (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftMiniBreakEveryMinutes}
        min={5}
        max={60}
        title={strings.pomodoroMiniBreakEveryMinutes || "Mini break every (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroMiniBreakDurationSeconds || "Mini break duration (sec)"}</span>
      <TargetPomodoroInput
        bind:value={draftMiniBreakDurationSeconds}
        min={10}
        max={300}
        title={strings.pomodoroMiniBreakDurationSeconds || "Mini break duration (sec)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroLongBreakEveryMinutes || "Long break every (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftLongBreakEveryMinutes}
        min={15}
        max={180}
        title={strings.pomodoroLongBreakEveryMinutes || "Long break every (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroLongBreakDurationMinutes || "Long break duration (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftLongBreakDurationMinutes}
        min={1}
        max={30}
        title={strings.pomodoroLongBreakDurationMinutes || "Long break duration (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroBreakNotifyBeforeSeconds || "Notify before (sec)"}</span>
      <TargetPomodoroInput
        bind:value={draftBreakNotifyBeforeSeconds}
        min={0}
        max={120}
        title={strings.pomodoroBreakNotifyBeforeSeconds || "Notify before (sec)"}
      />
    </label>
    <label class="toggle-row">
      <span>{strings.pomodoroTaskStartReminderToggle || "Task start reminder"}</span>
      <input type="checkbox" bind:checked={draftTaskStartReminderEnabled} />
    </label>
    <label>
      <span>{strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftTaskStartReminderLeadMinutes}
        min={1}
        max={60}
        title={strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroMiniBreakPostponeMinutes || "Mini postpone (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftMiniBreakPostponeMinutes}
        min={1}
        max={30}
        title={strings.pomodoroMiniBreakPostponeMinutes || "Mini postpone (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroLongBreakPostponeMinutes || "Long postpone (min)"}</span>
      <TargetPomodoroInput
        bind:value={draftLongBreakPostponeMinutes}
        min={1}
        max={60}
        title={strings.pomodoroLongBreakPostponeMinutes || "Long postpone (min)"}
      />
    </label>
    <label>
      <span>{strings.pomodoroBreakPostponeLimit || "Postpone limit"}</span>
      <TargetPomodoroInput
        bind:value={draftBreakPostponeLimit}
        min={0}
        max={10}
        title={strings.pomodoroBreakPostponeLimit || "Postpone limit"}
      />
    </label>
    <label class="toggle-row">
      <span>{strings.pomodoroBreakStrictMode || "Strict mode"}</span>
      <input type="checkbox" bind:checked={draftBreakStrictMode} />
    </label>
  </div>

  <div class="notify-tip">
    {strings.pomodoroBreakNotifyHint || "Desktop notification permission is required for break reminders."}
    {#if draftBreakNotifyBeforeSeconds > 0}
      · {strings.pomodoroBreakNotifyBeforeSeconds || "Notify before (sec)"}: {draftBreakNotifyBeforeSeconds}s
    {/if}
  </div>

  <div class="focus-settings-actions">
    <button type="button" class="btn primary" onclick={() => onSaveSettings()}>{strings.saveNote}</button>
    <button type="button" class="btn" onclick={() => onCancelSettings()}>{strings.cancel}</button>
  </div>
</div>

<style>
  .focus-settings-panel {
    margin-top: 8px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 94%, transparent);
    padding: 10px;
    display: grid;
    gap: 8px;
  }

  .focus-settings-grid {
    display: grid;
    gap: 6px;
  }

  .focus-settings-grid label {
    display: grid;
    grid-template-columns: 1fr 130px;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--ws-text, #334155);
  }

  .toggle-row {
    grid-template-columns: 1fr auto !important;
  }

  .toggle-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--ws-accent, #1d4ed8);
    cursor: pointer;
  }

  .focus-settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .notify-tip {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--ws-muted, #64748b);
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
</style>
