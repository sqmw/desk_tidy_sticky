<script>
  import {
    BREAK_SESSION_SCOPE_GLOBAL,
    BREAK_SESSION_SCOPE_TASK,
  } from "$lib/workspace/focus/focus-break-session.js";
  import {
    BREAK_SCHEDULE_MODE_INDEPENDENT,
    BREAK_SCHEDULE_MODE_TASK,
    normalizeBreakScheduleMode,
  } from "$lib/workspace/focus/focus-break-profile.js";

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
    breakScheduleMode = /** @type {string} */ (BREAK_SCHEDULE_MODE_TASK),
    taskBreakProfile = null,
    defaultMiniBreakEveryMinutes = 10,
    defaultLongBreakEveryMinutes = 30,
    independentMiniBreakEveryMinutes = 10,
    independentLongBreakEveryMinutes = 30,
    selectedTaskId = "",
    selectedTaskTitle = "",
    onStartSession = () => {},
    onClearSession = () => {},
    onChangeBreakScheduleMode = () => {},
    onChangeIndependentBreakEveryMinutes = () => {},
    onStartBreak = () => {},
    onPostponeBreak = () => {},
    onSkipBreak = () => {},
  } = $props();
  let sessionScope = $state(BREAK_SESSION_SCOPE_GLOBAL);

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
  const isTaskScope = $derived(sessionScope === BREAK_SESSION_SCOPE_TASK);
  const sessionStartDisabled = $derived(isTaskScope && !selectedTaskId);
  const selectedTaskText = $derived(selectedTaskTitle || strings.pomodoroNoTaskSelected || "Not selected");
  const safeBreakScheduleMode = $derived(normalizeBreakScheduleMode(breakScheduleMode));
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
  const activeScopeText = $derived(
    breakSession.scope === BREAK_SESSION_SCOPE_TASK
      ? (strings.pomodoroBreakSessionScopeTask || "Task-bound")
      : (strings.pomodoroBreakSessionScopeGlobal || "Independent"),
  );
  const activeBindingText = $derived(
    breakSession.scope === BREAK_SESSION_SCOPE_TASK
      ? `${strings.pomodoroTask || "Task"}: ${breakSession.taskTitle || breakSession.taskId || "-"}`
      : (strings.pomodoroBreakSessionIndependentHint || "Run independently, no task binding"),
  );

  $effect(() => {
    if (!breakSessionActive) return;
    sessionScope = breakSession.scope === BREAK_SESSION_SCOPE_TASK
      ? BREAK_SESSION_SCOPE_TASK
      : BREAK_SESSION_SCOPE_GLOBAL;
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
    <div class="schedule-head">
      <span>{strings.pomodoroBreakScheduleSource || "Break cadence source"}</span>
      <div class="schedule-toggle">
        <button
          type="button"
          class="btn schedule-btn"
          class:active={safeBreakScheduleMode === BREAK_SCHEDULE_MODE_TASK}
          onclick={() => onChangeBreakScheduleMode(BREAK_SCHEDULE_MODE_TASK)}
        >
          {strings.pomodoroBreakScheduleSourceTask || "Follow task/default"}
        </button>
        <button
          type="button"
          class="btn schedule-btn"
          class:active={safeBreakScheduleMode === BREAK_SCHEDULE_MODE_INDEPENDENT}
          onclick={() => onChangeBreakScheduleMode(BREAK_SCHEDULE_MODE_INDEPENDENT)}
        >
          {strings.pomodoroBreakScheduleSourceIndependent || "Independent interval"}
        </button>
      </div>
    </div>
    {#if safeBreakScheduleMode === BREAK_SCHEDULE_MODE_INDEPENDENT}
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
    {:else}
      <span class="schedule-hint">
        {strings.pomodoroBreakScheduleTaskResolved || "Current task cadence"}: {taskBreakMiniEveryMinutes}/{taskBreakLongEveryMinutes}m
      </span>
    {/if}
  </div>
  <div class="session-row">
    <div class="session-state-wrap">
      <span class="session-state">{sessionStateText}</span>
      {#if breakSessionActive}
        <span class="session-scope">{activeScopeText} · {activeBindingText}</span>
      {/if}
    </div>
    <div class="scope-row">
      <button
        type="button"
        class="btn scope-btn"
        class:active={sessionScope === BREAK_SESSION_SCOPE_GLOBAL}
        onclick={() => (sessionScope = BREAK_SESSION_SCOPE_GLOBAL)}
      >
        {strings.pomodoroBreakSessionScopeGlobal || "Independent"}
      </button>
      <button
        type="button"
        class="btn scope-btn"
        class:active={sessionScope === BREAK_SESSION_SCOPE_TASK}
        onclick={() => (sessionScope = BREAK_SESSION_SCOPE_TASK)}
      >
        {strings.pomodoroBreakSessionScopeTask || "Bind task"}
      </button>
      {#if isTaskScope}
        <span class="scope-task">{strings.pomodoroTask || "Task"}: {selectedTaskText}</span>
      {/if}
    </div>
    <div class="session-actions">
      {#each breakSessionModes as mode (mode)}
        <button
          type="button"
          class="btn session-btn"
          class:active={breakSession.mode === mode && breakSessionActive}
          disabled={sessionStartDisabled}
          onclick={() => onStartSession(mode, { scope: sessionScope, taskId: selectedTaskId, taskTitle: selectedTaskTitle })}
        >
          {sessionLabel(mode)}
        </button>
      {/each}
      <button type="button" class="btn session-btn clear" disabled={!breakSessionActive} onclick={() => onClearSession()}>
        {strings.pomodoroBreakSessionClear || strings.cancel || "Clear"}
      </button>
    </div>
    {#if sessionStartDisabled}
      <span class="scope-hint">{strings.pomodoroBreakSessionBindTaskHint || "Select a task first to start task-bound session."}</span>
    {/if}
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

  .schedule-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .schedule-toggle {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .schedule-btn {
    min-height: 27px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
  }

  .schedule-btn.active {
    border-color: var(--ws-border-active, #2f4368);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-btn-bg, #fff));
    color: var(--ws-text-strong, #0f172a);
    font-weight: 700;
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

  .scope-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .scope-btn {
    min-height: 27px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
  }

  .scope-btn.active {
    border-color: var(--ws-border-active, #2f4368);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-btn-bg, #fff));
    color: var(--ws-text-strong, #0f172a);
    font-weight: 700;
  }

  .scope-task {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .session-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .scope-hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
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
