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

  <div class="break-countdown-strip" aria-label={strings.pomodoroBreakActionPanel || "Break status"}>
    <article class="break-countdown-card mini">
      <span class="break-countdown-label">{strings.pomodoroMiniBreakIn || "Mini break in"}</span>
      <strong class="break-countdown-value">{nextMiniBreakText}</strong>
    </article>
    <article class="break-countdown-card long">
      <span class="break-countdown-label">{strings.pomodoroLongBreakIn || "Long break in"}</span>
      <strong class="break-countdown-value">{nextLongBreakText}</strong>
    </article>
  </div>

  <div class="schedule-columns">
    <section class="schedule-column" aria-label={strings.pomodoroMiniBreakIn || "Mini break"}>
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
    </section>

    <section class="schedule-column" aria-label={strings.pomodoroLongBreakIn || "Long break"}>
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
    </section>
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

  .schedule-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .break-countdown-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
  }

  .break-countdown-card {
    position: relative;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 90%, transparent);
    border-radius: 12px;
    padding: 10px 12px;
    display: grid;
    gap: 4px;
    min-width: 0;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--ws-card-bg, #fff) 96%, transparent) 0%, color-mix(in srgb, var(--ws-card-bg, #fff) 90%, transparent) 100%);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
      0 8px 18px color-mix(in srgb, #0f172a 5%, transparent);
    overflow: hidden;
  }

  .break-countdown-card::before {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 3px;
    opacity: 0.95;
    background: linear-gradient(90deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 78%, #0ea5e9), #38bdf8);
  }

  .break-countdown-card.long::before {
    background: linear-gradient(90deg, color-mix(in srgb, #0f766e 72%, #14b8a6), #5eead4);
  }

  .break-countdown-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .break-countdown-value {
    font-family: "Segoe UI", "Consolas", monospace;
    font-size: clamp(18px, 1.25vw, 24px);
    line-height: 1;
    color: var(--ws-text-strong, #0f172a);
    letter-spacing: 0.4px;
  }

  .schedule-column {
    position: relative;
    display: grid;
    gap: 8px;
    min-width: 0;
    padding-inline: 2px;
  }

  .schedule-column + .schedule-column::before {
    content: "";
    position: absolute;
    left: -8px;
    top: 2px;
    bottom: 2px;
    width: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 82%, transparent);
  }

  .schedule-column label {
    display: grid;
    gap: 4px;
  }

  .schedule-column label > span {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .schedule-column input {
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
    .break-countdown-strip,
    .schedule-columns {
      grid-template-columns: 1fr;
    }

    .schedule-column + .schedule-column::before {
      display: none;
    }
  }
</style>
