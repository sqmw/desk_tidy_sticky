<script>
  import TargetPomodoroInput from "$lib/components/workspace/focus/TargetPomodoroInput.svelte";

  let {
    strings,
    phaseLabelText = "",
    timerText = "00:00",
    breakMiniCountdownText = "00:00",
    breakLongCountdownText = "00:00",
    focusMinutes = 25,
    selectedTaskId = "",
    taskOptions = [],
    selectedTaskDonePomodoros = 0,
    selectedTaskTargetPomodoros = 0,
    roundText = "",
    taskText = "",
    phaseProgress = 0,
    running = false,
    hasStarted = false,
    showConfig = false,
    draftFocusMinutes = $bindable(25),
    draftShortBreakMinutes = $bindable(5),
    draftLongBreakMinutes = $bindable(15),
    draftLongBreakEvery = $bindable(4),
    draftMiniBreakEveryMinutes = $bindable(10),
    draftMiniBreakDurationSeconds = $bindable(20),
    draftLongBreakEveryMinutes = $bindable(30),
    draftLongBreakDurationMinutes = $bindable(5),
    draftBreakNotifyBeforeSeconds = $bindable(10),
    draftMiniBreakPostponeMinutes = $bindable(5),
    draftLongBreakPostponeMinutes = $bindable(10),
    draftBreakPostponeLimit = $bindable(3),
    draftBreakStrictMode = $bindable(false),
    onApplyFocusPreset = () => {},
    onSelectTask = () => {},
    onToggleRunning = () => {},
    onReset = () => {},
    onToggleSettings = () => {},
    showBreakPanel = false,
    onToggleBreakPanel = () => {},
    breakPanel = undefined,
    onSaveSettings = () => {},
    onCancelSettings = () => {},
  } = $props();

  const isFocusPhase = $derived(phaseLabelText === strings.pomodoroFocus);
  const selectedTaskProgressRate = $derived(
    selectedTaskTargetPomodoros <= 0
      ? 0
      : Math.min(100, Math.round((selectedTaskDonePomodoros / selectedTaskTargetPomodoros) * 100)),
  );
</script>

<div class="timer-card">
  <div class="timer-hero">
    <div class="timer-head">
      <div class="focus-tabs" role="tablist" aria-label={strings.pomodoro}>
        <button
          type="button"
          role="tab"
          class="focus-tab"
          class:active={!showBreakPanel}
          aria-selected={!showBreakPanel}
          onclick={() => onToggleBreakPanel(false)}
        >
          🍅 {strings.pomodoro}
        </button>
        <button
          type="button"
          role="tab"
          class="focus-tab"
          class:active={showBreakPanel}
          aria-selected={showBreakPanel}
          onclick={() => onToggleBreakPanel(true)}
        >
          {strings.pomodoroBreakActionPanel || "Break"}
        </button>
      </div>
      {#if !isFocusPhase}
        <span class="phase">
          <span class="phase-icon">⏱</span>
          <span>{phaseLabelText}</span>
        </span>
      {/if}
      {#if showBreakPanel}
        <div class="break-countdowns">
          <span class="break-countdown-item">
            {strings.pomodoroMiniBreakIn || "Mini break in"}:
            <strong>{breakMiniCountdownText}</strong>
          </span>
          <span class="break-countdown-item">
            {strings.pomodoroLongBreakIn || "Long break in"}:
            <strong>{breakLongCountdownText}</strong>
          </span>
        </div>
      {:else}
        <strong class="timer">{timerText}</strong>
      {/if}
    </div>
    <div class="phase-progress">
      <div class="phase-progress-fill" style={`width:${Math.max(0, Math.min(100, phaseProgress))}%`}></div>
    </div>
  </div>
  {#if showBreakPanel}
    <div class="break-tab-panel">
      {#if typeof breakPanel === "function"}
        {@render breakPanel()}
      {:else}
        <div class="break-tab-empty">{strings.pomodoroBreakActionPanel || "Break controls"}</div>
      {/if}
    </div>
  {:else}
    <div class="timer-meta">
      <span>{strings.pomodoroRound}: {roundText}</span>
      <span>{strings.pomodoroTask}: {taskText}</span>
    </div>
    {#if selectedTaskId}
      <div class="task-progress">
        <div class="task-progress-head">
          <span>{strings.pomodoroTask}</span>
          <strong>🍅 {selectedTaskDonePomodoros}/{selectedTaskTargetPomodoros || 0}</strong>
        </div>
        <div class="task-progress-bar">
          <div class="task-progress-fill" style={`width:${selectedTaskProgressRate}%`}></div>
        </div>
      </div>
    {/if}
    <div class="timer-row">
      <div class="preset-group">
        <button
          type="button"
          class="preset-chip"
          class:active={focusMinutes === 25}
          onclick={() => onApplyFocusPreset(25)}
        >
          25m
        </button>
        <button
          type="button"
          class="preset-chip"
          class:active={focusMinutes === 40}
          onclick={() => onApplyFocusPreset(40)}
        >
          40m
        </button>
      </div>
      <select
        class="task-select"
        value={selectedTaskId}
        onchange={(e) => onSelectTask(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
      >
        {#if taskOptions.length === 0}
          <option value="">{strings.pomodoroNoTasksToday}</option>
        {:else}
          {#each taskOptions as item (item.id)}
            <option value={item.id}>{item.title} ({item.timeRange})</option>
          {/each}
        {/if}
      </select>
    </div>
    <div class="timer-actions">
      <button type="button" class="btn primary" onclick={() => onToggleRunning()}>
        {running ? strings.pomodoroPause : hasStarted ? strings.pomodoroResume : strings.pomodoroStart}
      </button>
      <button type="button" class="btn" onclick={() => onReset()}>{strings.pomodoroReset}</button>
      <button type="button" class="btn" onclick={() => onToggleSettings()}>{strings.settings}</button>
    </div>
    {#if showConfig}
      <div class="timer-settings">
        <label>
          <span>{strings.pomodoroFocusMinutes}</span>
          <TargetPomodoroInput bind:value={draftFocusMinutes} min={5} max={90} title={strings.pomodoroFocusMinutes} />
        </label>
        <label>
          <span>{strings.pomodoroShortBreakMinutes}</span>
          <TargetPomodoroInput bind:value={draftShortBreakMinutes} min={1} max={30} title={strings.pomodoroShortBreakMinutes} />
        </label>
        <label>
          <span>{strings.pomodoroLongBreakMinutes}</span>
          <TargetPomodoroInput bind:value={draftLongBreakMinutes} min={5} max={60} title={strings.pomodoroLongBreakMinutes} />
        </label>
        <label>
          <span>{strings.pomodoroLongBreakEvery}</span>
          <TargetPomodoroInput bind:value={draftLongBreakEvery} min={2} max={8} title={strings.pomodoroLongBreakEvery} />
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
        <label class="strict-mode-row">
          <span>{strings.pomodoroBreakStrictMode || "Strict mode"}</span>
          <input type="checkbox" bind:checked={draftBreakStrictMode} />
        </label>
        <div class="notify-tip">
          {strings.pomodoroBreakNotifyHint || "Desktop notification permission is required for break reminders."}
          {#if draftBreakNotifyBeforeSeconds > 0}
            · {strings.pomodoroBreakNotifyBeforeSeconds || "Notify before (sec)"}: {draftBreakNotifyBeforeSeconds}s
          {/if}
        </div>
        <div class="timer-settings-actions">
          <button type="button" class="btn primary" onclick={() => onSaveSettings()}>{strings.saveNote}</button>
          <button type="button" class="btn" onclick={() => onCancelSettings()}>{strings.cancel}</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .timer-card {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background:
      radial-gradient(circle at 90% 6%, color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent), transparent 48%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    backdrop-filter: blur(8px);
    padding: 12px;
    min-height: clamp(300px, 38vh, 520px);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
      0 8px 22px color-mix(in srgb, #0f172a 12%, transparent);
  }

  .timer-hero {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    padding: 10px 10px 9px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 86%, transparent);
  }

  .timer-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .focus-tabs {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    padding: 2px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: var(--ws-btn-bg, #fff);
  }

  .focus-tab {
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 11px;
    font-weight: 700;
    height: 24px;
    padding: 0 9px;
    cursor: pointer;
  }

  .focus-tab.active {
    border: 1px solid var(--ws-border-active, #2f4368);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-btn-bg, #fff));
    color: var(--ws-text-strong, #0f172a);
  }

  .break-tab-panel {
    margin-top: 8px;
  }

  .break-tab-empty {
    border: 1px dashed var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    padding: 10px;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
  }

  .phase {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ws-text, #334155);
  }

  .phase-icon {
    font-size: 11px;
    opacity: 0.88;
  }

  .timer {
    margin-left: auto;
    font-family: "Segoe UI", "Consolas", monospace;
    font-size: clamp(20px, 1.3vw, 30px);
    color: var(--ws-text-strong, #0f172a);
  }

  .break-countdowns {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .break-countdown-item {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    white-space: nowrap;
  }

  .break-countdown-item strong {
    margin-left: 4px;
    font-family: "Segoe UI", "Consolas", monospace;
    font-size: 12px;
    color: var(--ws-text-strong, #0f172a);
  }

  .timer-meta {
    margin-top: 8px;
    display: grid;
    gap: 4px;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .timer-actions {
    margin-top: 8px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .task-progress {
    margin-top: 8px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 90%, transparent);
    padding: 6px 8px;
    display: grid;
    gap: 6px;
  }

  .task-progress-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .task-progress-head strong {
    font-size: 12px;
    color: var(--ws-text-strong, #0f172a);
  }

  .task-progress-bar {
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 65%, transparent);
  }

  .task-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #22c55e 0%, #38bdf8 100%);
    transition: width 0.2s ease;
  }

  .timer-row {
    margin-top: 8px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 6px;
    align-items: center;
  }

  .preset-group {
    display: inline-flex;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    overflow: hidden;
    background: var(--ws-btn-bg, #fff);
  }

  .preset-chip {
    border: none;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 11px;
    font-weight: 700;
    height: 28px;
    min-width: 46px;
    padding: 0 10px;
    cursor: pointer;
  }

  .preset-chip + .preset-chip {
    border-left: 1px solid var(--ws-border-soft, #d6e0ee);
  }

  .preset-chip.active {
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
    color: var(--ws-text-strong, #0f172a);
  }

  .task-select {
    min-width: 0;
    height: 30px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    padding: 0 8px;
    outline: none;
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

  .phase-progress {
    margin-top: 8px;
    height: 7px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 65%, transparent);
    overflow: hidden;
  }

  .phase-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 75%, #1e3a8a), #38bdf8);
    transition: width 0.25s ease;
  }

  .timer-settings {
    margin-top: 8px;
    display: grid;
    gap: 6px;
  }

  .timer-settings label {
    display: grid;
    grid-template-columns: 1fr 130px;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--ws-text, #334155);
  }

  .strict-mode-row {
    grid-template-columns: 1fr auto !important;
  }

  .strict-mode-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--ws-accent, #1d4ed8);
    cursor: pointer;
  }

  .timer-settings-actions {
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

  @media (max-width: 980px) {
    .timer-head {
      flex-wrap: wrap;
    }

    .break-countdowns {
      width: 100%;
      margin-left: 0;
      justify-content: flex-start;
    }
  }
</style>
