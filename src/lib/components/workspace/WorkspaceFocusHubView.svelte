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
    <div class="review-summary-row">
      <div class="review-summary-copy">
        <h3>{strings.workspaceFocusReviewCardTitle}</h3>
        <p>{strings.workspaceFocusReviewCardHint}</p>
      </div>
      <div class="review-summary-badges">
        <span>{strings.pomodoroTodayFocusMinutes} <strong>{todayFocusMinutes}m</strong></span>
        <span>{strings.pomodoroTodayPomodoros} <strong>x{todayPomodoros}</strong></span>
        <span>{strings.pomodoroStreakDays} <strong>{streakDays}d</strong></span>
      </div>
      <button type="button" class="review-link-btn" onclick={() => onOpenReview()}>
        {strings.workspaceFocusOpenReview}
      </button>
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
    border: 1px solid color-mix(in srgb, var(--ws-accent, #2563eb) 24%, var(--ws-border-soft, #e7ecf5));
    border-radius: var(--ws-radius-md, 12px);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 5%, var(--ws-card-bg, #ffffff));
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
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
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 14%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 800;
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
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    min-height: 28px;
    padding: 0 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.16s ease;
  }

  .task-start-notice-close:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
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
    color: var(--ws-muted, #71809b);
  }

  .focus-complete-input {
    width: 100%;
    min-height: 96px;
    border-radius: 10px;
    border: 1px solid var(--ws-input-border, #dfe6f0);
    background: var(--ws-input-bg, #ffffff);
    color: var(--ws-input-text, #101828);
    font-size: 13px;
    line-height: 1.6;
    padding: 10px 12px;
    resize: vertical;
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .focus-complete-input:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-input-border, #dfe6f0));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .focus-complete-actions {
    display: grid;
    gap: 8px;
  }

  .focus-complete-btn {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--ws-radius-sm, 8px);
    border: 1px solid var(--ws-border, #e3e9f2);
    background: transparent;
    color: var(--ws-text, #3a4557);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.16s ease;
  }

  .focus-complete-btn:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
  }

  .focus-complete-btn.primary {
    border: none;
    background: var(--ws-accent, #2563eb);
    color: #fff;
    font-weight: 700;
  }

  .focus-complete-btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  :global(.workspace.theme-dark) .focus-complete-btn.primary {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  .timer-slot {
    grid-area: timer;
  }

  .planner-slot {
    grid-area: planner;
  }

  .review-summary-shell {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 88%, transparent);
    border-radius: 14px;
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
    padding: 12px 16px;
  }

  .review-summary-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .review-summary-copy {
    min-width: 0;
    flex: 1 1 280px;
    display: grid;
    gap: 3px;
  }

  .review-summary-copy h3 {
    margin: 0;
    color: var(--ws-text-strong, #101828);
    font-size: 13.5px;
    font-weight: 700;
  }

  .review-link-btn {
    flex: 0 0 auto;
    border: 1px solid color-mix(in srgb, var(--ws-accent, #2563eb) 32%, transparent);
    border-radius: var(--ws-radius-sm, 8px);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 9%, transparent);
    color: var(--ws-accent, #2563eb);
    font-size: 12.5px;
    font-weight: 700;
    min-height: 32px;
    padding: 0 14px;
    cursor: pointer;
    transition: background 0.16s ease;
  }

  .review-link-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 15%, transparent);
  }

  .review-link-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .review-summary-copy p {
    margin: 0;
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    line-height: 1.55;
  }

  .review-summary-badges {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .review-summary-badges span {
    font-size: 12px;
    color: var(--ws-muted, #71809b);
  }

  .review-summary-badges strong {
    margin-left: 3px;
    font-size: 12.5px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--ws-text-strong, #101828);
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
