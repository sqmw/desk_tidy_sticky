<script>
  import { BREAK_SESSION_SCOPE_GLOBAL } from "$lib/workspace/focus/focus-break-session.js";

  let {
    strings,
    breakPrompt = null,
    nextMiniBreakText = "00:00",
    nextLongBreakText = "00:00",
    notifyEnabled = false,
    notifyChecked = false,
    breakStrictMode = false,
    breakPostponeLimit = 0,
    breakSession = { mode: "none", untilTs: 0, scope: BREAK_SESSION_SCOPE_GLOBAL, taskId: "", taskTitle: "" },
    breakSessionRemainingText = "",
    breakSessionActive = false,
    breakSessionModes = ["30m", "1h", "2h", "today"],
    taskBreakProfile = null,
    defaultMiniBreakEveryMinutes = 10,
    defaultLongBreakEveryMinutes = 30,
    independentMiniBreakEveryMinutes = 10,
    independentLongBreakEveryMinutes = 30,
    onStartSession = () => {},
    onClearSession = () => {},
    onChangeIndependentBreakEveryMinutes = () => {},
    onStartBreak = () => {},
    onPostponeBreak = () => {},
    onSkipBreak = () => {},
  } = $props();
  let selectedPauseMode = $state("30m");

  const isReady = $derived(Boolean(breakPrompt));
  const promptKindText = $derived(
    breakPrompt?.kind === "long"
      ? (strings.pomodoroLongBreakNow || "Take a long break")
      : (strings.pomodoroMiniBreakNow || "Take a mini break"),
  );
  const postponeUsed = $derived(Number(breakPrompt?.postponeUsed || 0));
  const postponeDisabled = $derived(
    !isReady || breakStrictMode || postponeUsed >= Math.max(0, Number(breakPostponeLimit || 0)),
  );
  const skipDisabled = $derived(!isReady || breakStrictMode);
  const notifyStatusText = $derived(
    notifyChecked
      ? (notifyEnabled ? (strings.pomodoroBreakNotifyOn || "On") : (strings.pomodoroBreakNotifyOff || "Off"))
      : "...",
  );
  const sessionStateText = $derived(
    breakSessionActive
      ? `${strings.pomodoroBreakSessionActive || "Session active"} · ${breakSessionRemainingText}`
      : (strings.pomodoroBreakSessionNone || "No active session"),
  );
  const taskBreakMiniEveryMinutes = $derived(
    Number(taskBreakProfile?.miniBreakEveryMinutes || defaultMiniBreakEveryMinutes || 10),
  );
  const taskBreakLongEveryMinutes = $derived(
    Number(taskBreakProfile?.longBreakEveryMinutes || defaultLongBreakEveryMinutes || 30),
  );
  const independentBreakMiniEveryMinutes = $derived(
    Math.max(5, Math.min(180, Math.round(Number(independentMiniBreakEveryMinutes || 10)))),
  );
  const independentBreakLongEveryMinutes = $derived(
    Math.max(15, Math.min(360, Math.round(Number(independentLongBreakEveryMinutes || 30)))),
  );

  $effect(() => {
    if (!breakSessionModes.includes(selectedPauseMode)) {
      selectedPauseMode = String(breakSessionModes[0] || "30m");
    }
  });

  $effect(() => {
    if (!breakSessionActive) return;
    const mode = String(breakSession?.mode || "");
    if (!breakSessionModes.includes(mode)) return;
    if (selectedPauseMode === mode) return;
    selectedPauseMode = mode;
  });

  /**
   * @param {string} mode
   */
  function sessionLabel(mode) {
    if (mode === "30m") return strings.pomodoroBreakSession30m || "30m";
    if (mode === "1h") return strings.pomodoroBreakSession1h || "1h";
    if (mode === "2h") return strings.pomodoroBreakSession2h || "2h";
    if (mode === "today") return strings.pomodoroBreakSessionToday || "Today";
    return mode;
  }

  function startPauseSession() {
    onStartSession(selectedPauseMode, { scope: BREAK_SESSION_SCOPE_GLOBAL });
  }

  /**
   * @param {"mini" | "long"} kind
   * @param {Event} event
   */
  function onIndependentEveryInput(kind, event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    const raw = Number(target.value);
    if (!Number.isFinite(raw)) return;
    const safe = kind === "mini"
      ? Math.max(5, Math.min(180, Math.round(raw)))
      : Math.max(15, Math.min(360, Math.round(raw)));
    target.value = String(safe);
    onChangeIndependentBreakEveryMinutes(kind, safe);
  }
</script>

<section class="break-controls" data-no-drag="true">
  <div class="break-head">
    <strong>{strings.pomodoroBreakActionPanel || "Break controls"}</strong>
    <span class="break-state">{isReady ? promptKindText : (strings.pomodoroBreakWaitState || "Waiting for break trigger")}</span>
  </div>
  <div class="break-meta">
    <span>{strings.pomodoroMiniBreakIn || "Mini break in"}: {nextMiniBreakText}</span>
    <span>{strings.pomodoroLongBreakIn || "Long break in"}: {nextLongBreakText}</span>
    <span>{strings.pomodoroBreakNotifyStatus || "Notify"}: {notifyStatusText}</span>
  </div>
  <div class="schedule-row">
    <span class="schedule-title">{strings.pomodoroBreakScheduleSourceIndependent || "Independent interval"}</span>
    <div class="schedule-independent-editor">
      <label>
        <span>{strings.pomodoroBreakScheduleIndependentMini || "Independent mini every (min)"}</span>
        <input
          type="number"
          min="5"
          max="180"
          value={String(independentBreakMiniEveryMinutes)}
          onchange={(e) => onIndependentEveryInput("mini", e)}
        />
      </label>
      <label>
        <span>{strings.pomodoroBreakScheduleIndependentLong || "Independent long every (min)"}</span>
        <input
          type="number"
          min="15"
          max="360"
          value={String(independentBreakLongEveryMinutes)}
          onchange={(e) => onIndependentEveryInput("long", e)}
        />
      </label>
    </div>
    <span class="schedule-hint">
      {strings.pomodoroBreakScheduleTaskResolved || "Current task cadence"}: {taskBreakMiniEveryMinutes}/{taskBreakLongEveryMinutes}m
    </span>
  </div>
  <div class="session-row">
    <div class="session-state-wrap">
      <span class="session-state">{sessionStateText}</span>
      {#if breakSessionActive}
        <span class="session-scope">{strings.pomodoroBreakSessionIndependentHint || "Run independently, no task binding"}</span>
      {/if}
    </div>
    <div class="session-selectors">
      {#each breakSessionModes as mode (mode)}
        <button
          type="button"
          class="btn session-btn"
          class:active={selectedPauseMode === mode}
          onclick={() => (selectedPauseMode = mode)}
        >
          {sessionLabel(mode)}
        </button>
      {/each}
    </div>
    <div class="session-actions">
      <button type="button" class="btn session-btn close" onclick={() => startPauseSession()}>
        {strings.pomodoroBreakControlDisable || strings.close || "Disable"}
      </button>
      <button type="button" class="btn session-btn clear" disabled={!breakSessionActive} onclick={() => onClearSession()}>
        {strings.pomodoroBreakControlEnable || strings.pomodoroStart || "Enable"}
      </button>
    </div>
  </div>
  <div class="break-actions">
    <button type="button" class="btn primary" disabled={!isReady} onclick={() => onStartBreak()}>
      {strings.pomodoroBreakStartNow || strings.pomodoroStart || "Start break"}
    </button>
    <button type="button" class="btn" disabled={postponeDisabled} onclick={() => onPostponeBreak()}>
      {strings.workspaceDeadlineActionSnooze15 || "Postpone"} ({postponeUsed}/{Math.max(0, Number(breakPostponeLimit || 0))})
    </button>
    <button type="button" class="btn" disabled={skipDisabled} onclick={() => onSkipBreak()}>
      {strings.pomodoroSkip || "Skip"}
    </button>
  </div>
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
    gap: 7px;
  }

  .break-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .break-head strong {
    font-size: 13px;
    color: var(--ws-text-strong, #0f172a);
  }

  .break-state {
    font-size: 12px;
    color: var(--ws-muted, #64748b);
  }

  .break-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .break-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .schedule-row {
    display: grid;
    gap: 6px;
  }

  .schedule-title {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .schedule-independent-editor {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .schedule-independent-editor label {
    display: grid;
    gap: 4px;
  }

  .schedule-independent-editor span {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .schedule-independent-editor input {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    min-height: 30px;
    padding: 0 8px;
    font-size: 12px;
    color: var(--ws-text, #334155);
    background: var(--ws-card-bg, #fff);
  }

  .schedule-hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .session-row {
    display: grid;
    gap: 6px;
  }

  .session-state-wrap {
    display: grid;
    gap: 2px;
  }

  .session-state {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .session-scope {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .session-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .session-selectors {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .session-btn {
    min-height: 27px;
    padding: 0 10px;
    font-size: 11px;
    border-radius: 999px;
  }

  .session-btn.active {
    border-color: var(--ws-border-active, #2f4368);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-btn-bg, #fff));
    color: var(--ws-text-strong, #0f172a);
    font-weight: 700;
  }

  .session-btn.clear {
    border-style: dashed;
  }

  .session-btn.close {
    border-style: solid;
  }

  .btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    min-height: 30px;
    padding: 0 11px;
    font-size: 12px;
    cursor: pointer;
  }

  .btn.primary {
    border-color: var(--ws-border-active, #2f4368);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    font-weight: 700;
  }

  .btn:disabled {
    opacity: 0.54;
    cursor: not-allowed;
  }

  @media (max-width: 960px) {
    .schedule-independent-editor {
      grid-template-columns: 1fr;
    }
  }
</style>
