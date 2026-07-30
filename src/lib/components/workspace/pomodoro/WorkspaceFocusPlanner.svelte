<script>
  import { showDevQuickActions } from "$lib/runtime/dev-flags.js";
  import TimeText24 from "$lib/components/ui/TimeText24.svelte";
  import WorkspaceFocusPlannerTaskItem from "$lib/components/workspace/pomodoro/WorkspaceFocusPlannerTaskItem.svelte";

  let {
    strings,
    taskModeDuration = "duration",
    taskModeTimeWindow = "timeWindow",
    recurrence,
    weekdays,
    draftTitle = $bindable(""),
    draftTaskMode = $bindable("timeWindow"),
    draftTargetMinutes = $bindable(120),
    draftStartTime = $bindable("09:00"),
    draftEndTime = $bindable("10:00"),
    draftRecurrence = $bindable("none"),
    draftWeekdays = $bindable([1, 2, 3, 4, 5]),
    draftTaskStartReminderEnabled = $bindable(false),
    draftTaskStartReminderLeadMinutes = $bindable(10),
    tasks = [],
    selectedTaskId = "",
    activeTaskStarted = false,
    activeTaskRunning = false,
    taskStartReminderLeadMinutes = 10,
    showingAllTasks = false,
    todayTaskCount = 0,
    todayStats,
    onAddTask = () => {},
    onToggleWeekday = () => {},
    onStartTask = () => {},
    onToggleTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    onTriggerTaskStartReminderTest = () => {},
    weekdayLabel = /** @type {(day: number) => string} */ ((day) => String(day)),
  } = $props();
</script>

<div class="planner-card">
  <div class="planner-head">
    <h3>{strings.pomodoroTaskPlanner}</h3>
    <div class="planner-head-side">
      {#if showingAllTasks}
        <span>
          {strings.workspacePlannerShowingAllHint || "No tasks match today. Showing all tasks."}
          · {strings.workspacePlannerTodayMatched || "Today matched"} {todayTaskCount}
        </span>
      {:else}
        <span>
          {strings.pomodoroTask || "Tasks"}: {todayStats.taskCount ?? tasks.length}
          · {strings.pomodoroTaskRounds || "Task rounds"} x{todayStats.totalTaskCycles || 0}
        </span>
      {/if}
    </div>
  </div>
  <div class="planner-form">
    <input class="field-title" type="text" placeholder={strings.pomodoroTaskTitle} bind:value={draftTitle} />
    <select class="field-mode" bind:value={draftTaskMode}>
      <option value={taskModeTimeWindow}>{strings.pomodoroTaskModeTimeWindow || "Time window"}</option>
      <option value={taskModeDuration}>{strings.pomodoroTaskModeDuration || "Duration"}</option>
    </select>
    {#if draftTaskMode === taskModeDuration}
      <input
        class="field-target"
        type="number"
        min="1"
        max="1440"
        step="1"
        placeholder={strings.pomodoroTaskTargetMinutes || "Target minutes"}
        bind:value={draftTargetMinutes}
      />
      <div class="field-duration-hint">{strings.pomodoroTaskFlexibleSchedule || "Flexible schedule"}</div>
    {:else}
      <TimeText24 class="field-start" bind:value={draftStartTime} stepMinutes={5} />
      <TimeText24 class="field-end" bind:value={draftEndTime} stepMinutes={5} />
    {/if}
    <select class="field-recur" bind:value={draftRecurrence}>
      <option value={recurrence.NONE}>{strings.recurrenceNone}</option>
      <option value={recurrence.DAILY}>{strings.recurrenceDaily}</option>
      <option value={recurrence.WORKDAY}>{strings.recurrenceWorkday}</option>
      <option value={recurrence.CUSTOM}>{strings.recurrenceCustom}</option>
    </select>
    <button type="button" class="btn primary field-add" onclick={() => onAddTask()}>{strings.addTask}</button>
  </div>
  <div class="planner-reminder-row">
    <label class="planner-reminder-toggle">
      <span>{strings.pomodoroTaskStartReminderToggle || "Task start reminder"}</span>
      <input type="checkbox" bind:checked={draftTaskStartReminderEnabled} />
    </label>
    <label class="planner-reminder-lead">
      <span>{strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}</span>
      <input
        type="number"
        min="1"
        max="60"
        step="1"
        bind:value={draftTaskStartReminderLeadMinutes}
        disabled={!draftTaskStartReminderEnabled}
      />
    </label>
    {#if showDevQuickActions}
      <div class="planner-reminder-test">
        <span>{strings.pomodoroTaskReminderQuickTest || "Reminder test"}</span>
        <button type="button" class="btn" onclick={() => onTriggerTaskStartReminderTest()}>
          {strings.pomodoroTaskReminderQuickNow || "Trigger now"}
        </button>
      </div>
    {/if}
  </div>
  {#if draftRecurrence === recurrence.CUSTOM}
    <div class="weekday-picker">
      {#each weekdays as day}
        <button
          type="button"
          class="day-chip"
          class:active={draftWeekdays.includes(day)}
          onclick={() => onToggleWeekday(day)}
        >
          {weekdayLabel(day)}
        </button>
      {/each}
    </div>
  {/if}
  <div class="task-list">
    {#if tasks.length === 0}
      <div class="empty">{strings.pomodoroNoTasksToday}</div>
    {:else}
      {#each tasks as task (task.id)}
        <WorkspaceFocusPlannerTaskItem
          {strings}
          {taskModeDuration}
          {taskModeTimeWindow}
          {recurrence}
          {weekdays}
          {task}
          startedTask={activeTaskStarted && selectedTaskId === task.id}
          runningTask={activeTaskRunning && selectedTaskId === task.id}
          defaultTaskStartReminderLeadMinutes={taskStartReminderLeadMinutes}
          donePomodoros={todayStats.taskPomodoros?.[task.id] || 0}
          effectiveSeconds={todayStats.taskEffectiveSeconds?.[task.id] || 0}
          targetSeconds={task.targetSeconds || 0}
          onStartTask={onStartTask}
          onToggleTask={onToggleTask}
          onRemoveTask={onRemoveTask}
          onUpdateTask={onUpdateTask}
          {weekdayLabel}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .planner-card {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 88%, transparent);
    border-radius: var(--ws-radius-lg, 16px);
    background: var(--ws-card-bg, #ffffff);
    padding: 14px 16px;
    min-height: clamp(330px, 42vh, 560px);
    display: flex;
    flex-direction: column;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
  }

  .planner-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
  }

  .planner-head h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ws-text-strong, #101828);
  }

  .planner-head span {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--ws-muted, #71809b);
  }

  .planner-head-side {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .planner-form {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.7fr)
      minmax(118px, 1fr)
      minmax(96px, 0.92fr)
      minmax(96px, 0.92fr)
      minmax(112px, 1fr)
      minmax(96px, max-content);
    gap: 6px;
    align-items: stretch;
  }

  .planner-form input,
  .planner-form :global(.time-text-24),
  .planner-form select,
  .planner-reminder-lead input {
    border: 1px solid var(--ws-input-border, #dfe6f0);
    border-radius: 10px;
    background: var(--ws-input-bg, #ffffff);
    color: var(--ws-input-text, #101828);
    font-size: 13px;
    padding: 6px 10px;
    height: 36px;
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .planner-form input:focus,
  .planner-form :global(.time-text-24:focus-within),
  .planner-form select:focus-visible,
  .planner-reminder-lead input:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-input-border, #dfe6f0));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .btn {
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: 10px;
    background: transparent;
    color: var(--ws-text, #3a4557);
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }

  .btn:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
  }

  .btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .field-add {
    min-width: 92px;
  }

  .planner-reminder-row {
    margin-top: 6px;
    display: grid;
    grid-template-columns: minmax(190px, 0.9fr) minmax(220px, 1.1fr) auto;
    gap: 6px;
    max-width: min(800px, 100%);
  }

  .planner-reminder-toggle,
  .planner-reminder-lead,
  .planner-reminder-test {
    min-height: 32px;
    border: none;
    border-radius: var(--ws-radius-sm, 8px);
    background: color-mix(in srgb, var(--ws-muted, #71809b) 6%, transparent);
    color: var(--ws-text, #3a4557);
    font-size: 12.5px;
    font-weight: 600;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .planner-reminder-test {
    color: var(--ws-muted, #71809b);
  }

  .planner-reminder-test .btn {
    height: 28px;
    font-size: 11px;
    padding: 0 8px;
  }

  .planner-reminder-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--ws-accent, #1d4ed8);
    cursor: pointer;
  }

  .planner-reminder-lead input {
    width: 78px;
    height: 28px;
    padding: 0 8px;
    box-shadow: none;
  }

  .planner-reminder-lead input:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  .field-duration-hint {
    height: 36px;
    border: 1px dashed var(--ws-border-soft, #e7ecf5);
    border-radius: 10px;
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    white-space: nowrap;
  }

  .btn.primary {
    border: none;
    background: var(--ws-accent, #2563eb);
    color: #fff;
    font-weight: 700;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06));
  }

  .btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  :global(.workspace.theme-dark) .btn.primary {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  :global(.workspace.theme-dark) .btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 32%, transparent);
  }

  .weekday-picker {
    margin-top: 6px;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .day-chip {
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
    color: var(--ws-text, #3a4557);
    font-size: 11px;
    font-weight: 600;
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease;
  }

  .day-chip:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .day-chip.active {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 14%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .task-list {
    margin-top: 8px;
    flex: 1;
    min-height: 180px;
    max-height: clamp(220px, 44vh, 620px);
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .empty {
    border: 1px dashed var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    padding: 12px;
    text-align: center;
  }

  @media (max-width: 1700px) {
    .planner-form {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .field-title {
      grid-column: span 2;
    }

    .planner-form :global(.field-start),
    .planner-form :global(.field-end),
    .field-recur,
    .field-add {
      grid-column: span 1;
      min-width: 0;
    }
  }

  @media (max-width: 900px) {
    .planner-form {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .field-title {
      grid-column: 1 / -1;
    }

    .field-add {
      grid-column: 1 / -1;
    }

    .planner-reminder-row {
      grid-template-columns: 1fr;
      max-width: none;
    }

  }
</style>
