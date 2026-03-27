<script>
  let {
    strings,
    timerText = "00:00",
    breakMiniCountdownText = "00:00",
    breakLongCountdownText = "00:00",
    selectedTaskId = "",
    selectedTaskDonePomodoros = 0,
    taskText = "",
    phaseProgress = 0,
    showBreakPanel = false,
    onToggleBreakPanel = () => {},
    breakPanel = undefined,
  } = $props();

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
      <div class="timer-task-card">
        <span class="timer-meta-label">{strings.pomodoroTask || "Task"}</span>
        <strong class="timer-task-value">{taskText}</strong>
      </div>
      {#if selectedTaskId}
        <div class="timer-stat-chip" aria-label={strings.pomodoroTodayPomodoros || "Today pomodoros"}>
          <span class="timer-meta-label">{strings.pomodoroTodayPomodoros || "Today pomodoros"}</span>
          <strong>🍅 {selectedTaskDonePomodoros}</strong>
        </div>
      {/if}
    </div>
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
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: stretch;
  }

  .timer-task-card,
  .timer-stat-chip {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
    padding: 6px 8px;
    display: grid;
    gap: 4px;
  }

  .timer-task-card {
    min-width: 0;
  }

  .timer-stat-chip {
    min-width: 128px;
    align-content: center;
  }

  .timer-meta-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .timer-task-value {
    min-width: 0;
    font-size: 13px;
    color: var(--ws-text-strong, #0f172a);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timer-stat-chip strong {
    font-size: 12px;
    color: var(--ws-text-strong, #0f172a);
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

  @media (max-width: 980px) {
    .timer-head {
      flex-wrap: wrap;
    }

    .break-countdowns {
      width: 100%;
      margin-left: 0;
      justify-content: flex-start;
    }

    .timer-meta {
      grid-template-columns: 1fr;
    }
  }
</style>
