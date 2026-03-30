<script>
  import WorkspaceTaskTimeline from "$lib/components/workspace/focus/WorkspaceTaskTimeline.svelte";
  import {
    formatFocusDuration,
  } from "$lib/workspace/focus/focus-pomodoro-metrics.js";

  let {
    strings,
    todayFocusMinutes = 0,
    todayPomodoros = 0,
    todayTaskCount = 0,
    todayTaskCycles = 0,
    weekFocusMinutes = 0,
    weekPomodoros = 0,
    weekAverageMinutes = 0,
    streakDays = 0,
    bestDayDateKey = "",
    bestDayMinutes = 0,
    heatmapCells = [],
    taskDistribution = [],
    taskRollups = [],
    currentMinutes = 0,
  } = $props();
</script>

<div class="stats-card">
  <h3>{strings.pomodoroStats}</h3>
  <div class="stat">
    <span>{strings.pomodoroTodayFocusMinutes}</span>
    <strong>{todayFocusMinutes} min</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroTodayPomodoros}</span>
    <strong>🍅 x{todayPomodoros}</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroWeekFocusMinutes}</span>
    <strong>{weekFocusMinutes} min</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroWeekPomodoros}</span>
    <strong>🍅 x{weekPomodoros}</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroTaskRounds || "Task rounds"}</span>
    <strong>x{todayTaskCycles} / {todayTaskCount}</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroStreakDays}</span>
    <strong>{streakDays} d</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroWeekAverageMinutes}</span>
    <strong>{weekAverageMinutes} min</strong>
  </div>
  <div class="stat">
    <span>{strings.pomodoroBestDay}</span>
    <strong>{bestDayDateKey ? `${bestDayDateKey} / ${bestDayMinutes}m` : "--"}</strong>
  </div>

  <div class="heatmap-wrap">
    <div class="heatmap-title">{strings.pomodoroHeatmap28Days}</div>
    <div class="heatmap-grid">
      {#each heatmapCells as cell (cell.key)}
        <div
          class="heat-cell"
          class:l0={cell.level === 0}
          class:l1={cell.level === 1}
          class:l2={cell.level === 2}
          class:l3={cell.level === 3}
          class:l4={cell.level === 4}
          title={`${cell.key}: ${cell.minutes}m`}
        ></div>
      {/each}
    </div>
  </div>

  <div class="dist-wrap">
    <div class="dist-title">{strings.pomodoroTaskDistributionToday}</div>
    <WorkspaceTaskTimeline {strings} tasks={taskDistribution} {currentMinutes} />
  </div>

  <div class="rollup-wrap">
    <div class="rollup-title">{strings.pomodoroTaskRollup || "Task totals"}</div>
    {#if taskRollups.length === 0}
      <div class="rollup-empty">{strings.pomodoroNoTasksToday || "No focus tasks yet"}</div>
    {:else}
      <div class="rollup-list">
        {#each taskRollups as item (item.title)}
          <div class="rollup-item">
            <strong>{item.title}</strong>
            <span>{strings.pomodoroTodayFocusMinutes || "Focus"} {formatFocusDuration(item.focusSeconds)}</span>
            <span>{strings.pomodoroWeekPomodoros || "Pomodoros"} 🍅 x{item.completedPomodoros}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .stats-card {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent), transparent 44%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    backdrop-filter: blur(8px);
    padding: 12px;
    display: grid;
    gap: 8px;
    align-content: start;
    min-height: clamp(260px, 34vh, 430px);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
      0 8px 22px color-mix(in srgb, #0f172a 10%, transparent);
  }

  .stats-card h3 {
    margin: 0;
    font-size: clamp(13px, 0.82vw, 17px);
    color: var(--ws-text-strong, #0f172a);
  }

  .stat {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background: var(--ws-card-bg, #fff);
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .stat span {
    font-size: clamp(11px, 0.65vw, 13px);
    color: var(--ws-muted, #64748b);
  }

  .stat strong {
    font-size: clamp(13px, 0.82vw, 17px);
    color: var(--ws-text-strong, #0f172a);
  }

  .heatmap-wrap {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background: var(--ws-card-bg, #fff);
    padding: 8px;
    display: grid;
    gap: 8px;
  }

  .heatmap-title {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(14, minmax(0, 1fr));
    gap: 4px;
  }

  .heat-cell {
    aspect-ratio: 1 / 1;
    border-radius: 3px;
    border: 1px solid var(--ws-border-soft, #dbe4ef);
  }

  .heat-cell.l0 {
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 78%, transparent);
  }

  .heat-cell.l1 {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, transparent);
  }

  .heat-cell.l2 {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 38%, transparent);
  }

  .heat-cell.l3 {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 56%, transparent);
  }

  .heat-cell.l4 {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 74%, transparent);
  }

  .dist-wrap {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background: var(--ws-card-bg, #fff);
    padding: 8px;
    display: grid;
    gap: 6px;
  }

  .dist-title,
  .rollup-title {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .rollup-wrap {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background: var(--ws-card-bg, #fff);
    padding: 8px;
    display: grid;
    gap: 6px;
  }

  .rollup-list {
    display: grid;
    gap: 6px;
    max-height: 220px;
    overflow: auto;
  }

  .rollup-item {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 9px;
    padding: 8px 10px;
    display: grid;
    gap: 2px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 94%, transparent);
  }

  .rollup-item strong {
    font-size: 12px;
    color: var(--ws-text-strong, #0f172a);
  }

  .rollup-item span,
  .rollup-empty {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

</style>
