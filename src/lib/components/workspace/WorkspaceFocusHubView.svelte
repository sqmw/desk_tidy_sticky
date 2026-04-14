<script>
  import WorkspaceBreakControlBar from "$lib/components/workspace/break-control/WorkspaceBreakControlBar.svelte";
  import WorkspaceFocusPlanner from "$lib/components/workspace/pomodoro/WorkspaceFocusPlanner.svelte";
  import WorkspaceFocusStats from "$lib/components/workspace/pomodoro/WorkspaceFocusStats.svelte";
  import WorkspaceFocusTimer from "$lib/components/workspace/pomodoro/WorkspaceFocusTimer.svelte";

  let {
    strings,
    compact = false,
    focusTaskModeDuration,
    focusTaskModeTimeWindow,
    recurrence,
    weekdays,
    draftTitle = $bindable(""),
    draftTaskMode = $bindable("time_window"),
    draftTargetMinutes = $bindable(120),
    draftStartTime = $bindable("09:00"),
    draftEndTime = $bindable("10:00"),
    draftRecurrence = $bindable("none"),
    draftWeekdays = $bindable([1, 2, 3, 4, 5]),
    pomodoroTimerText,
    nextMiniBreakCountdownText,
    nextLongBreakCountdownText,
    selectedTaskTitle,
    focusMinutes = 25,
    phaseProgress,
    showBreakPanel = $bindable(false),
    showStats = $bindable(false),
    selectedTaskId = "",
    selectedTaskPomodoroScoreText = "",
    breakActive = false,
    canSkipBreak = false,
    breakReminderEnabled = false,
    independentMiniBreakEveryMinutes = 10,
    independentLongBreakEveryMinutes = 30,
    miniBreakDurationSeconds = 20,
    longBreakDurationMinutes = 5,
    plannerTasks = [],
    activeTaskStarted = false,
    activeTaskRunning = false,
    plannerShowingAllTasks = false,
    todayTaskCount = 0,
    plannerTodayStats = {},
    todayFocusMinutes = 0,
    todayPomodoros = 0,
    todayTaskCountForStats = 0,
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
    onSetBreakReminderEnabled = () => {},
    onChangeIndependentBreakEveryMinutes = () => {},
    onChangeBreakDuration = () => {},
    onTriggerBreakSoon = () => {},
    onPostponeBreak = () => {},
    onSkipBreak = () => {},
    onAddTask = () => {},
    onToggleWeekday = () => {},
    onStartTask = () => {},
    onToggleTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    onApplyFocusMinutes = () => {},
    weekdayLabel = () => "",
  } = $props();
</script>

<section class="focus-hub" class:compact data-no-drag="true">
  <div class="focus-main">
    <div class="focus-slot timer-slot">
      <WorkspaceFocusTimer
        {strings}
        timerText={pomodoroTimerText}
        breakMiniCountdownText={nextMiniBreakCountdownText}
        breakLongCountdownText={nextLongBreakCountdownText}
        taskText={selectedTaskTitle}
        {focusMinutes}
        {phaseProgress}
        {showBreakPanel}
        {selectedTaskId}
        {selectedTaskPomodoroScoreText}
        {onApplyFocusMinutes}
        onToggleBreakPanel={(next = !showBreakPanel) => {
          showBreakPanel = !!next;
        }}
      >
        {#snippet breakPanel()}
          <WorkspaceBreakControlBar
            {strings}
            breakActive={breakActive}
            canSkip={canSkipBreak}
            nextMiniBreakText={nextMiniBreakCountdownText}
            nextLongBreakText={nextLongBreakCountdownText}
            {breakReminderEnabled}
            {independentMiniBreakEveryMinutes}
            {independentLongBreakEveryMinutes}
            {miniBreakDurationSeconds}
            {longBreakDurationMinutes}
            {onSetBreakReminderEnabled}
            {onChangeIndependentBreakEveryMinutes}
            {onChangeBreakDuration}
            {onTriggerBreakSoon}
            {onPostponeBreak}
            {onSkipBreak}
          />
        {/snippet}
      </WorkspaceFocusTimer>
    </div>

    <div class="focus-slot planner-slot">
      <WorkspaceFocusPlanner
        {strings}
        taskModeDuration={focusTaskModeDuration}
        taskModeTimeWindow={focusTaskModeTimeWindow}
        {recurrence}
        {weekdays}
        bind:draftTitle
        bind:draftTaskMode
        bind:draftTargetMinutes
        bind:draftStartTime
        bind:draftEndTime
        bind:draftRecurrence
        bind:draftWeekdays
        tasks={plannerTasks}
        {selectedTaskId}
        {activeTaskStarted}
        {activeTaskRunning}
        showingAllTasks={plannerShowingAllTasks}
        {todayTaskCount}
        todayStats={plannerTodayStats}
        {onAddTask}
        {onToggleWeekday}
        {onStartTask}
        {onToggleTask}
        {onRemoveTask}
        {onUpdateTask}
        {weekdayLabel}
      />
    </div>
  </div>

  <section class="stats-shell">
    <button type="button" class="stats-toggle" onclick={() => (showStats = !showStats)}>
      {showStats ? "v" : ">"} {strings.pomodoroStats}
      <span class="stats-quick">
        <span>{strings.pomodoroTodayFocusMinutes}: {todayFocusMinutes}m</span>
        <span>{strings.pomodoroStreakDays}: {streakDays}d</span>
      </span>
    </button>
    {#if showStats}
      <WorkspaceFocusStats
        {strings}
        {todayFocusMinutes}
        {todayPomodoros}
        todayTaskCount={todayTaskCountForStats}
        {todayTaskCycles}
        {weekFocusMinutes}
        {weekPomodoros}
        {weekAverageMinutes}
        {streakDays}
        {bestDayDateKey}
        {bestDayMinutes}
        {heatmapCells}
        {taskDistribution}
        {taskRollups}
        {currentMinutes}
      />
    {/if}
  </section>
</section>

<style>
  .focus-hub {
    display: grid;
    gap: 8px;
    min-height: 0;
    align-items: start;
  }

  .focus-main {
    display: grid;
    grid-template-columns: minmax(360px, 1fr) minmax(560px, 1.9fr);
    grid-template-areas: "timer planner";
    gap: 8px;
    min-height: 0;
    align-items: start;
  }

  .focus-hub.compact {
    gap: 7px;
  }

  .focus-hub.compact .focus-main {
    gap: 7px;
  }

  .focus-slot {
    min-width: 0;
    min-height: 0;
  }

  .timer-slot {
    grid-area: timer;
  }

  .planner-slot {
    grid-area: planner;
  }

  .focus-hub :global(.timer-card),
  .focus-hub :global(.planner-card) {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
  }

  .focus-hub :global(.btn) {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
  }

  .focus-hub :global(input),
  .focus-hub :global(select) {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
  }

  .stats-shell {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    padding: 8px;
  }

  .stats-toggle {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    min-height: 34px;
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .stats-quick {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ws-muted, #64748b);
  }

  .stats-quick span {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    padding: 2px 8px;
    background: var(--ws-card-bg, #fff);
  }

  .stats-shell :global(.stats-card) {
    margin-top: 8px;
    min-height: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1800px) {
    .focus-main {
      grid-template-columns: minmax(360px, 0.95fr) minmax(860px, 2.05fr);
      grid-template-areas: "timer planner";
    }
  }

  @media (max-width: 1360px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }

    .stats-shell :global(.stats-card) {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 980px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }
  }
</style>
