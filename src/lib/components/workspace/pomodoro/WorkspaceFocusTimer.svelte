<script>
  import HelpTip from "$lib/components/workspace/ui/HelpTip.svelte";

  let {
    strings,
    timerText = "00:00",
    breakMiniCountdownText = "00:00",
    breakLongCountdownText = "00:00",
    todayPomodoroScoreText = "0",
    taskText = "",
    phaseProgress = 0,
    showBreakPanel = false,
    onToggleBreakPanel = () => {},
    breakPanel = undefined,
  } = $props();

  const RING_RADIUS = 24;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const safeProgress = $derived(Math.max(0, Math.min(100, Number(phaseProgress || 0))));
  const ringOffset = $derived(RING_CIRCUMFERENCE * (1 - safeProgress / 100));
  // Below ~4% the arc is shorter than its rounded caps and reads as a lone dot at 12 o'clock.
  const showRingFill = $derived(safeProgress >= 4);
</script>

<div class="timer-card" class:break-mode={showBreakPanel} class:focus-mode={!showBreakPanel}>
  <div class="timer-row">
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
      <div class="timer-ring" aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle class="ring-track" cx="28" cy="28" r={RING_RADIUS}></circle>
          {#if showRingFill}
            <circle
              class="ring-fill"
              cx="28"
              cy="28"
              r={RING_RADIUS}
              style={`stroke-dasharray: ${RING_CIRCUMFERENCE}; stroke-dashoffset: ${ringOffset};`}
            ></circle>
          {/if}
        </svg>
      </div>
      <div class="timer-info">
        <strong class="timer">{timerText}</strong>
        {#if taskText}
          <div class="timer-task" title={taskText}>
            <span class="timer-task-label">{strings.pomodoroTask || "Task"}</span>
            <span class="timer-task-value">{taskText}</span>
          </div>
        {/if}
      </div>
    {/if}

    <div class="timer-side">
      <div class="focus-tabs" role="tablist" aria-label={strings.pomodoro}>
        <button
          type="button"
          role="tab"
          class="focus-tab"
          class:active={!showBreakPanel}
          aria-selected={!showBreakPanel}
          onclick={() => onToggleBreakPanel(false)}
        >
          {strings.pomodoro}
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
      {#if !showBreakPanel}
        <div class="today-chip" aria-label={strings.pomodoroTodayPomodoros || "Today pomodoros"}>
          <svg class="tomato-icon" aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="14" r="6.6"></circle>
            <path d="M12 7.4V4.6"></path>
            <path d="M12 7.4c-1.3-1.1-2.9-1.4-4.3-.9M12 7.4c1.3-1.1 2.9-1.4 4.3-.9"></path>
          </svg>
          <span>{todayPomodoroScoreText}</span>
          <HelpTip
            text={strings.pomodoroTodayPomodorosHint ||
              "Counts completed pomodoros today (all tasks). Per-task counts are shown in the task list."}
            ariaLabel="Pomodoro total help"
          />
        </div>
      {/if}
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
  {/if}
</div>

<style>
  .timer-card {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 88%, transparent);
    border-radius: var(--ws-radius-lg, 16px);
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
    padding: 12px 16px;
  }

  .timer-card.break-mode {
    min-height: clamp(300px, 38vh, 520px);
  }

  .timer-row {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .timer-ring {
    position: relative;
    flex: 0 0 auto;
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
  }

  .timer-ring svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  .ring-track,
  .ring-fill {
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
  }

  .ring-track {
    stroke: color-mix(in srgb, var(--ws-muted, #71809b) 16%, transparent);
  }

  .ring-fill {
    stroke: var(--ws-accent, #2563eb);
    transition: stroke-dashoffset 0.25s ease;
  }

  .timer-info {
    min-width: 0;
    display: grid;
    gap: 1px;
  }

  .timer {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    color: var(--ws-text-strong, #101828);
  }

  .timer-task {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .timer-task-label {
    flex: 0 0 auto;
    color: var(--ws-muted, #71809b);
  }

  .timer-task-value {
    min-width: 0;
    color: var(--ws-text, #3a4557);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timer-side {
    margin-left: auto;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .focus-tabs {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 12%, transparent);
  }

  .focus-tab {
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--ws-text, #3a4557);
    font-size: 12px;
    font-weight: 600;
    height: 26px;
    padding: 0 12px;
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  }

  .focus-tab:hover {
    color: var(--ws-text-strong, #101828);
  }

  .focus-tab:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .focus-tab.active {
    background: var(--ws-card-bg, #ffffff);
    color: var(--ws-text-strong, #101828);
    font-weight: 700;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
  }

  .today-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
    padding: 0 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    color: var(--ws-accent, #2563eb);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .tomato-icon {
    flex: 0 0 auto;
  }

  .break-tab-panel {
    margin-top: 10px;
  }

  .break-tab-empty {
    border: 1px dashed var(--ws-border-soft, #e7ecf5);
    border-radius: 10px;
    padding: 10px;
    color: var(--ws-muted, #71809b);
    font-size: 12px;
  }

  .break-countdowns {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .break-countdown-item {
    font-size: 12px;
    color: var(--ws-muted, #71809b);
    white-space: nowrap;
  }

  .break-countdown-item strong {
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: var(--ws-text-strong, #101828);
  }

  @media (max-width: 980px) {
    .timer-row {
      flex-wrap: wrap;
      gap: 10px;
    }

    .timer-side {
      margin-left: 0;
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
