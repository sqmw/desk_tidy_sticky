<script>
  import WorkspaceBreakControlBar from "$lib/components/workspace/break-control/WorkspaceBreakControlBar.svelte";
  import WorkspaceFocusPlanner from "$lib/components/workspace/pomodoro/WorkspaceFocusPlanner.svelte";
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
    draftTaskStartReminderEnabled = $bindable(false),
    draftTaskStartReminderLeadMinutes = $bindable(10),
    pomodoroTimerText,
    nextMiniBreakCountdownText,
    nextLongBreakCountdownText,
    selectedTaskTitle,
    phaseProgress,
    showBreakPanel = $bindable(false),
    selectedTaskId = "",
    todayPomodoroScoreText = "",
    breakActive = false,
    canSkipBreak = false,
    breakReminderEnabled = false,
    independentMiniBreakEveryMinutes = 10,
    independentLongBreakEveryMinutes = 30,
    miniBreakDurationSeconds = 20,
    longBreakDurationMinutes = 5,
    taskStartReminderLeadMinutes = 10,
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
    onOpenReview = () => {},
    onSetBreakReminderEnabled = () => {},
    onChangeIndependentBreakEveryMinutes = () => {},
    onChangeBreakDuration = () => {},
    onTriggerBreakSoon = () => {},
    onPostponeBreak = () => {},
    onSkipBreak = () => {},
    taskStartReminderNotice = null,
    onDismissTaskStartReminderNotice = () => {},
    focusCompletedReviewPrompt = null,
    focusCompletedReviewSaving = false,
    onDismissFocusCompletedReviewPrompt = () => {},
    onChangeFocusCompletedReviewDraft = () => {},
    onSaveFocusCompletedReviewPrompt = () => {},
    onAddTask = () => {},
    onToggleWeekday = () => {},
    onStartTask = () => {},
    onToggleTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    onTriggerTaskStartReminderTest = () => {},
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
        {phaseProgress}
        {showBreakPanel}
        {todayPomodoroScoreText}
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
        bind:draftTaskStartReminderEnabled
        bind:draftTaskStartReminderLeadMinutes
        tasks={plannerTasks}
        {selectedTaskId}
        {activeTaskStarted}
        {activeTaskRunning}
        {taskStartReminderLeadMinutes}
        showingAllTasks={plannerShowingAllTasks}
        {todayTaskCount}
        todayStats={plannerTodayStats}
        {onAddTask}
        {onToggleWeekday}
        {onStartTask}
        {onToggleTask}
        {onRemoveTask}
        {onUpdateTask}
        {onTriggerTaskStartReminderTest}
        {weekdayLabel}
      />
    </div>
  </div>

  {#if taskStartReminderNotice}
    <section class="task-start-notice" role="status" aria-live="polite">
      <div class="task-start-notice-mark" aria-hidden="true">!</div>
      <div class="task-start-notice-copy">
        <strong>{taskStartReminderNotice.title}</strong>
        <span>{taskStartReminderNotice.body}</span>
      </div>
      <button type="button" class="task-start-notice-close" onclick={() => onDismissTaskStartReminderNotice()}>
        {strings.cancel || "Dismiss"}
      </button>
    </section>
  {/if}

  {#if focusCompletedReviewPrompt}
    <section class="task-start-notice focus-complete-notice" role="status" aria-live="polite">
      <div class="task-start-notice-mark" aria-hidden="true">✓</div>
      <div class="task-start-notice-copy focus-complete-copy">
        <strong>{strings.workspaceFocusDoneLogPromptTitle}</strong>
        <span>{focusCompletedReviewPrompt.title}</span>
        <span class="focus-complete-hint">{strings.workspaceFocusDoneLogPromptHint}</span>
        <textarea
          class="focus-complete-input"
          value={focusCompletedReviewPrompt.draft}
          oninput={(event) => onChangeFocusCompletedReviewDraft(event.currentTarget.value)}
        ></textarea>
      </div>
      <div class="focus-complete-actions">
        <button type="button" class="focus-complete-btn primary" onclick={() => onSaveFocusCompletedReviewPrompt()}>
          {focusCompletedReviewSaving ? strings.shortcutSaving || "Saving..." : strings.workspaceReviewCreateAction}
        </button>
        <button type="button" class="focus-complete-btn" onclick={() => onDismissFocusCompletedReviewPrompt()}>
          {strings.cancel || "Dismiss"}
        </button>
      </div>
    </section>
  {/if}

  <section class="review-summary-shell">
    <div class="review-summary-copy">
      <div class="review-summary-title-row">
        <h3>{strings.workspaceFocusReviewCardTitle}</h3>
        <button type="button" class="review-link-btn" onclick={() => onOpenReview()}>
          {strings.workspaceFocusOpenReview}
        </button>
      </div>
      <p>{strings.workspaceFocusReviewCardHint}</p>
      <div class="review-summary-badges">
        <span>{strings.pomodoroTodayFocusMinutes}: {todayFocusMinutes}m</span>
        <span>{strings.pomodoroTodayPomodoros}: 🍅 x{todayPomodoros}</span>
        <span>{strings.pomodoroStreakDays}: {streakDays}d</span>
      </div>
    </div>
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

  .task-start-notice {
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 28%, var(--ws-border, #dbe5f2));
    border-radius: 14px;
    background:
      radial-gradient(circle at 0 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 15%, transparent), transparent 36%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.92)) 96%, #ffffff);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 72%, transparent),
      0 10px 24px color-mix(in srgb, #0f172a 10%, transparent);
    padding: 10px 12px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .task-start-notice-mark {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, #fff);
    color: var(--ws-accent, #1d4ed8);
    font-weight: 900;
    display: grid;
    place-items: center;
  }

  .task-start-notice-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .task-start-notice-copy strong {
    color: var(--ws-text-strong, #0f172a);
    font-size: 13px;
  }

  .task-start-notice-copy span {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-start-notice-close {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    min-height: 28px;
    padding: 0 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }

  .focus-complete-notice {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
  }

  .focus-complete-copy {
    gap: 6px;
  }

  .focus-complete-hint {
    font-size: 12px;
    color: color-mix(in srgb, var(--ws-text-2, #6b7280) 92%, transparent);
  }

  .focus-complete-input {
    width: 100%;
    min-height: 96px;
    border-radius: 12px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 13px;
    line-height: 1.6;
    padding: 10px 12px;
    resize: vertical;
    outline: none;
  }

  .focus-complete-actions {
    display: grid;
    gap: 8px;
  }

  .focus-complete-btn {
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
  }

  .focus-complete-btn.primary {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    color: var(--ws-accent, #1d4ed8);
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

  .review-summary-shell {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    padding: 12px 14px;
  }

  .review-summary-copy {
    display: grid;
    gap: 10px;
  }

  .review-summary-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .review-summary-title-row h3 {
    margin: 0;
    color: var(--ws-text-strong, #0f172a);
    font-size: clamp(14px, 0.88vw, 18px);
  }

  .review-link-btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    min-height: 34px;
    padding: 0 12px;
    cursor: pointer;
  }

  .review-summary-copy p {
    margin: 0;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.55;
  }

  .review-summary-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .review-summary-badges span {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    padding: 4px 10px;
    background: var(--ws-card-bg, #fff);
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
  }

  @media (max-width: 1360px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }
  }

  @media (max-width: 980px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }

    .task-start-notice {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .task-start-notice-close {
      grid-column: 2;
      justify-self: start;
    }
  }
</style>
