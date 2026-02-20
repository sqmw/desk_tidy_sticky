<script>
  let {
    strings,
    breakActive = false,
    canSkip = false,
    breakReminderEnabled = true,
    nextMiniBreakText = "00:00",
    nextLongBreakText = "00:00",
    independentMiniBreakEveryMinutes = 10,
    independentLongBreakEveryMinutes = 30,
    miniBreakDurationSeconds = 20,
    longBreakDurationMinutes = 5,
    onPostponeBreak = () => {},
    onSkipBreak = () => {},
    onSetBreakReminderEnabled = () => {},
    onChangeIndependentBreakEveryMinutes = () => {},
    onChangeBreakDuration = () => {},
    onTriggerBreakSoon = () => {},
  } = $props();

  const reminderEnabled = $derived(breakReminderEnabled === true);
  const stateText = $derived.by(() => {
    if (breakActive) return strings.pomodoroBreakRunning || "Break countdown running";
    return reminderEnabled
      ? (strings.pomodoroBreakReminderEnabled || "Break reminders enabled")
      : (strings.pomodoroBreakReminderDisabled || "Break reminders disabled");
  });

  const miniEveryMinutes = $derived(
    Math.max(1, Math.min(180, Math.round(Number(independentMiniBreakEveryMinutes || 10)))),
  );
  const longEveryMinutes = $derived(
    Math.max(1, Math.min(360, Math.round(Number(independentLongBreakEveryMinutes || 30)))),
  );
  const miniDurationSec = $derived(
    Math.max(10, Math.min(300, Math.round(Number(miniBreakDurationSeconds || 20)))),
  );
  const longDurationMin = $derived(
    Math.max(1, Math.min(30, Math.round(Number(longBreakDurationMinutes || 5)))),
  );

  /**
   * @param {"mini" | "long"} kind
   * @param {Event} event
   */
  function onIntervalInput(kind, event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    const raw = Number(target.value);
    if (!Number.isFinite(raw)) {
      target.value = String(kind === "mini" ? miniEveryMinutes : longEveryMinutes);
      return;
    }
    const safe = kind === "mini"
      ? Math.max(1, Math.min(180, Math.round(raw)))
      : Math.max(1, Math.min(360, Math.round(raw)));
    target.value = String(safe);
    onChangeIndependentBreakEveryMinutes(kind, safe);
  }

  /**
   * @param {"mini" | "long"} kind
   * @param {Event} event
   */
  function onDurationInput(kind, event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    const raw = Number(target.value);
    if (!Number.isFinite(raw)) return;
    const safe = kind === "mini"
      ? Math.max(10, Math.min(300, Math.round(raw)))
      : Math.max(1, Math.min(30, Math.round(raw)));
    target.value = String(safe);
    onChangeBreakDuration(kind, safe);
  }

  /**
   * @param {boolean} enabled
   */
  function setReminderEnabled(enabled) {
    if (enabled === reminderEnabled) return;
    onSetBreakReminderEnabled(enabled);
  }
</script>

<section class="break-controls" data-no-drag="true">
  <div class="break-head">
    <div class="head-copy">
      <strong>{strings.pomodoroBreakActionPanel || "Break controls"}</strong>
      <span class="break-state">{stateText}</span>
    </div>
    <div
      class="reminder-switch"
      role="group"
      aria-label={strings.pomodoroBreakToggleLabel || "Break reminder toggle"}
    >
      <button
        type="button"
        class="switch-option"
        class:active={!reminderEnabled}
        onclick={() => setReminderEnabled(false)}
      >
        {strings.pomodoroToggleOff || "Off"}
      </button>
      <button
        type="button"
        class="switch-option"
        class:active={reminderEnabled}
        onclick={() => setReminderEnabled(true)}
      >
        {strings.pomodoroToggleOn || "On"}
      </button>
    </div>
  </div>

  <div class="break-countdown-grid">
    <div class="countdown-card">
      <span class="countdown-label">{strings.pomodoroMiniBreakIn || "Mini break in"}</span>
      <strong class="countdown-value">{nextMiniBreakText}</strong>
    </div>
    <div class="countdown-card">
      <span class="countdown-label">{strings.pomodoroLongBreakIn || "Long break in"}</span>
      <strong class="countdown-value">{nextLongBreakText}</strong>
    </div>
  </div>

  <div class="schedule-grid">
    <label>
      <span>{strings.pomodoroBreakScheduleIndependentMini || "Mini break interval (min)"}</span>
      <input
        type="number"
        min="1"
        max="180"
        value={String(miniEveryMinutes)}
        oninput={(event) => onIntervalInput("mini", event)}
        onchange={(event) => onIntervalInput("mini", event)}
      />
    </label>
    <label>
      <span>{strings.pomodoroBreakScheduleIndependentLong || "Long break interval (min)"}</span>
      <input
        type="number"
        min="1"
        max="360"
        value={String(longEveryMinutes)}
        oninput={(event) => onIntervalInput("long", event)}
        onchange={(event) => onIntervalInput("long", event)}
      />
    </label>
    <label>
      <span>{strings.pomodoroMiniBreakDurationSeconds || "Mini break duration (sec)"}</span>
      <input
        type="number"
        min="10"
        max="300"
        value={String(miniDurationSec)}
        oninput={(event) => onDurationInput("mini", event)}
        onchange={(event) => onDurationInput("mini", event)}
      />
    </label>
    <label>
      <span>{strings.pomodoroLongBreakDurationMinutes || "Long break duration (min)"}</span>
      <input
        type="number"
        min="1"
        max="30"
        value={String(longDurationMin)}
        oninput={(event) => onDurationInput("long", event)}
        onchange={(event) => onDurationInput("long", event)}
      />
    </label>
  </div>

  <div class="quick-test-actions">
    <span class="quick-test-label">{strings.pomodoroBreakQuickTest || "Quick test"}</span>
    <button
      type="button"
      class="btn"
      disabled={!reminderEnabled}
      onclick={() => onTriggerBreakSoon("mini", 10)}
    >
      {strings.pomodoroBreakQuickMini10s || "Mini 10s"}
    </button>
    <button
      type="button"
      class="btn"
      disabled={!reminderEnabled}
      onclick={() => onTriggerBreakSoon("long", 10)}
    >
      {strings.pomodoroBreakQuickLong10s || "Long 10s"}
    </button>
  </div>

  <p class="break-hint">
    {strings.pomodoroBreakActionHint || "When reminders are enabled, the system prompts breaks after each interval."}
  </p>

  {#if breakActive}
    <div class="trigger-actions">
      <button type="button" class="btn primary" onclick={() => onPostponeBreak()}>
        {strings.pomodoroBreakPostponeTwoMinutes || "Postpone 2m"}
      </button>
      <button type="button" class="btn" disabled={!canSkip} onclick={() => onSkipBreak()}>
        {strings.pomodoroSkip || "Skip"}
      </button>
    </div>
  {/if}
</section>

<style>
  .break-controls {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 12px;
    padding: 9px 10px;
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, transparent), transparent 32%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    backdrop-filter: blur(8px);
    display: grid;
    gap: 9px;
  }

  .break-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .head-copy {
    display: grid;
    gap: 3px;
  }

  .head-copy strong {
    font-size: 13px;
    color: var(--ws-text-strong, #0f172a);
  }

  .break-state {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .reminder-switch {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    padding: 2px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
  }

  .switch-option {
    min-height: 24px;
    min-width: 48px;
    border: 0;
    border-radius: 999px;
    padding: 0 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ws-muted, #64748b);
    background: transparent;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease;
  }

  .switch-option.active {
    color: var(--ws-accent, #1d4ed8);
    background: color-mix(in srgb, var(--ws-accent, #3b82f6) 16%, transparent);
  }

  .break-countdown-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .countdown-card {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 90%, transparent);
    padding: 7px 9px;
    display: grid;
    gap: 4px;
    min-height: 52px;
  }

  .countdown-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .countdown-value {
    font-family: "Segoe UI", "Consolas", monospace;
    font-size: 18px;
    line-height: 1;
    color: var(--ws-text-strong, #0f172a);
    letter-spacing: 0.3px;
  }

  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .schedule-grid label {
    display: grid;
    gap: 4px;
  }

  .schedule-grid span {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .schedule-grid input {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    min-height: 31px;
    padding: 0 8px;
    font-size: 12px;
    color: var(--ws-text, #334155);
    background: var(--ws-card-bg, #fff);
  }

  .break-hint {
    margin: 0;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .quick-test-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .quick-test-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .trigger-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  @media (max-width: 900px) {
    .break-countdown-grid,
    .schedule-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
