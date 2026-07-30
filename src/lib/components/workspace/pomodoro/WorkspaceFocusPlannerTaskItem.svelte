<script>
  import TimeText24 from "$lib/components/ui/TimeText24.svelte";
  import {
    getTaskCycleSnapshot,
  } from "$lib/workspace/pomodoro/focus-pomodoro-metrics.js";

  let {
    strings,
    taskModeDuration = "duration",
    taskModeTimeWindow = "timeWindow",
    recurrence,
    weekdays,
    task,
    startedTask = false,
    runningTask = false,
    defaultTaskStartReminderLeadMinutes = 10,
    donePomodoros = 0,
    effectiveSeconds = 0,
    targetSeconds = 0,
    onStartTask = () => {},
    onToggleTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    weekdayLabel = /** @type {(day: number) => string} */ ((day) => String(day)),
  } = $props();

  let editing = $state(false);
  let editTitle = $state("");
  let editTaskMode = $state("timeWindow");
  let editTargetMinutes = $state(120);
  let editStartTime = $state("09:00");
  let editEndTime = $state("10:00");
  let editRecurrence = $state("none");
  let editWeekdays = $state([1, 2, 3, 4, 5]);
  let editTaskStartReminderEnabled = $state(false);
  let editTaskStartReminderLeadMinutes = $state(10);

  /** @param {unknown} value */
  function clampReminderLeadMinutes(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 10;
    return Math.max(1, Math.min(60, Math.round(n)));
  }

  function beginEdit() {
    editTitle = String(task?.title || "");
    editTaskMode = String(task?.taskMode || taskModeTimeWindow);
    editTargetMinutes = Math.max(1, Math.round(Number(task?.targetSeconds || 7200) / 60));
    editStartTime = String(task?.startTime || "09:00");
    editEndTime = String(task?.endTime || "10:00");
    editRecurrence = String(task?.recurrence || recurrence.NONE);
    editWeekdays = Array.isArray(task?.weekdays) ? [...task.weekdays] : [1, 2, 3, 4, 5];
    editTaskStartReminderEnabled = task?.taskStartReminderEnabled === true;
    editTaskStartReminderLeadMinutes = clampReminderLeadMinutes(
      task?.taskStartReminderLeadMinutes ?? defaultTaskStartReminderLeadMinutes,
    );
    editing = true;
  }

  function cancelEdit() {
    editing = false;
  }

  /** @param {number} day */
  function toggleEditWeekday(day) {
    const has = editWeekdays.includes(day);
    if (has) {
      editWeekdays = editWeekdays.filter((d) => d !== day);
      return;
    }
    editWeekdays = [...editWeekdays, day].sort((a, b) => a - b);
  }

  function saveEdit() {
    const title = editTitle.trim();
    if (!title) return;
    const nextRecurrence = String(editRecurrence || recurrence.NONE);
    const nextTaskMode = editTaskMode === taskModeDuration ? taskModeDuration : taskModeTimeWindow;
    onUpdateTask(task.id, {
      title,
      taskMode: nextTaskMode,
      targetSeconds: Math.max(1, Math.round(Number(editTargetMinutes || 120))) * 60,
      startTime: editStartTime,
      endTime: editEndTime,
      recurrence: nextRecurrence,
      weekdays: nextRecurrence === recurrence.CUSTOM ? editWeekdays : [],
      taskStartReminderEnabled: editTaskStartReminderEnabled,
      taskStartReminderLeadMinutes: clampReminderLeadMinutes(editTaskStartReminderLeadMinutes),
    });
    editing = false;
  }
  const isStartedTask = $derived(startedTask === true);
  const isRunningTask = $derived(runningTask === true);
  const safeEffectiveSeconds = $derived(Math.max(0, Math.floor(Number(effectiveSeconds || 0))));
  const safeTargetSeconds = $derived(Math.max(0, Math.floor(Number(targetSeconds || 0))));
  const primaryActionText = $derived.by(() => {
    if (isRunningTask) return strings.pomodoroPause || "Pause";
    if (isStartedTask) return strings.pomodoroResume || "Resume";
    return strings.pomodoroStart || "Start";
  });
  const showEffectiveProgress = $derived(safeTargetSeconds > 0);
  const cycleSnapshot = $derived(getTaskCycleSnapshot(safeEffectiveSeconds, safeTargetSeconds));
  const progressPercent = $derived(showEffectiveProgress ? cycleSnapshot.currentCycleProgressPercent : 0);
  const isDurationTask = $derived(String(task?.taskMode || taskModeTimeWindow) === taskModeDuration);

  /**
   * @param {number} totalSeconds
   */
  function formatDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
</script>

<div
  class="task-item"
  class:editing={editing}
  class:started={isStartedTask}
  class:running={isRunningTask}
  style={`--task-active-progress:${progressPercent}%`}
>
  {#if editing}
    <div class="task-edit-layout">
      <div class="task-edit-grid task-edit-primary-row">
        <input class="field-title" type="text" bind:value={editTitle} placeholder={strings.pomodoroTaskTitle} />
        <select class="field-mode" bind:value={editTaskMode}>
          <option value={taskModeTimeWindow}>{strings.pomodoroTaskModeTimeWindow || "Time window"}</option>
          <option value={taskModeDuration}>{strings.pomodoroTaskModeDuration || "Duration"}</option>
        </select>
      </div>
      <div class="task-edit-grid task-edit-schedule-row">
        {#if editTaskMode === taskModeDuration}
          <input
            class="field-target"
            type="number"
            min="1"
            max="1440"
            step="1"
            bind:value={editTargetMinutes}
            placeholder={strings.pomodoroTaskTargetMinutes || "Target minutes"}
          />
          <div class="field-duration-hint">{strings.pomodoroTaskFlexibleSchedule || "Flexible schedule"}</div>
        {:else}
          <TimeText24 class="field-start" bind:value={editStartTime} stepMinutes={5} />
          <TimeText24 class="field-end" bind:value={editEndTime} stepMinutes={5} />
        {/if}
        <select class="field-recur" bind:value={editRecurrence}>
          <option value={recurrence.NONE}>{strings.recurrenceNone}</option>
          <option value={recurrence.DAILY}>{strings.recurrenceDaily}</option>
          <option value={recurrence.WORKDAY}>{strings.recurrenceWorkday}</option>
          <option value={recurrence.CUSTOM}>{strings.recurrenceCustom}</option>
        </select>
      </div>
      {#if editRecurrence === recurrence.CUSTOM}
        <div class="weekday-picker edit-weekdays">
          {#each weekdays as day}
            <button
              type="button"
              class="day-chip"
              class:active={editWeekdays.includes(day)}
              onclick={() => toggleEditWeekday(day)}
            >
              {weekdayLabel(day)}
            </button>
          {/each}
        </div>
      {/if}
      <div class="task-edit-footer">
        <label class="edit-reminder-row">
          <span class="edit-reminder-toggle">
            <span>{strings.pomodoroTaskStartReminderToggle || "Task start reminder"}</span>
            <input type="checkbox" bind:checked={editTaskStartReminderEnabled} />
          </span>
          <span class="edit-reminder-lead">
            <span>{strings.pomodoroTaskStartReminderLeadMinutes || "Remind before task start (min)"}</span>
            <input
              type="number"
              min="1"
              max="60"
              step="1"
              bind:value={editTaskStartReminderLeadMinutes}
              disabled={!editTaskStartReminderEnabled}
            />
          </span>
        </label>
        <div class="task-actions edit-actions">
          <button type="button" class="btn tiny danger ghost" onclick={() => onRemoveTask(task.id)}>{strings.delete}</button>
          <button type="button" class="btn tiny" onclick={() => cancelEdit()}>{strings.cancel}</button>
          <button type="button" class="btn tiny primary" onclick={() => saveEdit()}>{strings.saveNote}</button>
        </div>
      </div>
    </div>
  {:else}
    <div class="task-main">
      <div class="task-line-primary">
        <span class="task-title">{task.title}</span>
        <span class="task-time">
          {#if isDurationTask}
            {strings.pomodoroTaskFlexibleSchedule || "Flexible schedule"}
          {:else}
            {task.startTime} - {task.endTime}
          {/if}
        </span>
        <span class="task-progress" title={`${strings.pomodoroCompletedSessions || "Completed sessions"} ${donePomodoros}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="14" r="6.6"></circle>
            <path d="M12 7.4V4.6"></path>
            <path d="M12 7.4c-1.3-1.1-2.9-1.4-4.3-.9M12 7.4c1.3-1.1 2.9-1.4 4.3-.9"></path>
          </svg>
          x{donePomodoros}
        </span>
      </div>
      {#if showEffectiveProgress}
        <div class="task-line-meta">
          {(strings.pomodoroTaskElapsed || "Elapsed")} {formatDuration(safeEffectiveSeconds)}
          · {strings.pomodoroTaskRounds || "Task rounds"} x{cycleSnapshot.completedCycles}
          · {strings.pomodoroTaskCurrentRound || "Current round"} {formatDuration(cycleSnapshot.currentCycleSeconds)} / {formatDuration(safeTargetSeconds)}
        </div>
      {/if}
    </div>
    <div class="task-actions">
      <button
        type="button"
        class="btn tiny start"
        class:started={isStartedTask}
        onclick={() => (isStartedTask ? onToggleTask() : onStartTask(task.id))}
      >
        {primaryActionText}
      </button>
      <button type="button" class="btn tiny quiet" onclick={() => beginEdit()}>{strings.edit}</button>
      <button type="button" class="btn tiny quiet quiet-danger" onclick={() => onRemoveTask(task.id)}>{strings.delete}</button>
    </div>
  {/if}
</div>

<style>
  .task-item {
    border: 1px solid transparent;
    border-radius: var(--ws-radius-md, 12px);
    padding: 9px 10px;
    width: 100%;
    box-sizing: border-box;
    flex: 0 0 auto;
    justify-self: stretch;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    background: transparent;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: background 0.16s ease, border-color 0.16s ease;
  }

  .task-item > * {
    position: relative;
    z-index: 1;
  }

  .task-item:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 7%, transparent);
  }

  .task-item.started {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 28%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 4%, transparent);
  }

  .task-item.started::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--task-active-progress, 0%);
    min-width: 14px;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    pointer-events: none;
    z-index: 0;
  }

  .task-item.editing {
    display: grid;
    align-items: stretch;
    padding: 12px;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 4%, var(--ws-card-bg, #ffffff));
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 22%, var(--ws-border-soft, #e7ecf5));
  }

  .task-edit-layout {
    --task-edit-control-height: clamp(34px, 2.25vw, 40px);
    display: grid;
    gap: 8px;
    width: 100%;
  }

  .edit-reminder-row {
    display: grid;
    grid-template-columns: minmax(180px, 0.9fr) minmax(200px, 1.1fr);
    gap: 8px;
    align-items: center;
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 600;
  }

  .edit-reminder-toggle,
  .edit-reminder-lead {
    min-height: var(--task-edit-control-height);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 82%, transparent);
    border-radius: 10px;
    padding: 0 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .edit-reminder-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--ws-accent, #1d4ed8);
    cursor: pointer;
  }

  .edit-reminder-lead input {
    width: 76px;
    height: 28px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 8px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    padding: 0 8px;
    outline: none;
  }

  .edit-reminder-lead input:disabled {
    opacity: 0.52;
    cursor: not-allowed;
  }

  .task-main {
    display: grid;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .task-line-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .task-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ws-text-strong, #101828);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .task-time {
    flex: 0 0 auto;
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: var(--ws-muted, #71809b);
    white-space: nowrap;
  }

  .task-progress {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--ws-accent, #2563eb);
    border-radius: 999px;
    padding: 3px 8px;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
  }

  .task-line-meta {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: var(--ws-muted, #71809b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .task-edit-grid {
    display: grid;
    gap: 6px;
    align-items: stretch;
  }

  .task-edit-primary-row {
    grid-template-columns: minmax(240px, 1fr) minmax(140px, 180px);
  }

  .task-edit-schedule-row {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }

  .task-edit-grid input,
  .task-edit-grid :global(.time-text-24),
  .task-edit-grid select {
    border: 1px solid var(--ws-input-border, #dfe6f0);
    border-radius: 10px;
    background: var(--ws-input-bg, #ffffff);
    color: var(--ws-input-text, #101828);
    font-size: 13px;
    padding: 6px 10px;
    height: var(--task-edit-control-height);
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .task-edit-grid input:focus,
  .task-edit-grid :global(.time-text-24:focus-within),
  .task-edit-grid select:focus-visible {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-input-border, #dfe6f0));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .field-duration-hint {
    height: var(--task-edit-control-height);
    border: 1px dashed var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 88%, transparent);
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    white-space: nowrap;
  }

  .task-edit-footer {
    display: grid;
    grid-template-columns: minmax(420px, 0.62fr) minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .weekday-picker {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .edit-weekdays {
    padding: 2px 0;
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

  .day-chip.active {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 14%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .task-actions {
    display: flex;
    gap: 5px;
    justify-self: end;
  }

  .edit-actions {
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
  }

  .btn {
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    height: 32px;
    padding: 0 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease, opacity 0.14s ease;
  }

  .btn:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
  }

  .btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .btn.tiny {
    height: 28px;
    font-size: 12px;
    padding: 0 10px;
  }

  .btn.start {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 32%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 9%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .btn.start:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 15%, transparent);
  }

  .btn.quiet {
    border-color: transparent;
    color: var(--ws-muted, #71809b);
    opacity: 0;
  }

  .task-item:hover .btn.quiet,
  .task-item:focus-within .btn.quiet {
    opacity: 1;
  }

  .btn.quiet:hover {
    color: var(--ws-text-strong, #101828);
  }

  .btn.quiet-danger:hover {
    color: #dc2626;
    background: color-mix(in srgb, #dc2626 9%, transparent);
  }

  .btn.primary {
    border: none;
    background: var(--ws-accent, #2563eb);
    color: #fff;
    font-weight: 700;
  }

  .btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  :global(.workspace.theme-dark) .btn.primary {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  .btn.started {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 40%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 15%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .btn.danger {
    border-color: color-mix(in srgb, #dc2626 24%, var(--ws-border, #e3e9f2));
    color: #dc2626;
  }

  .btn.ghost {
    background: transparent;
  }

  @media (max-width: 1600px) {
    .task-edit-primary-row {
      grid-template-columns: minmax(200px, 1fr) minmax(130px, 170px);
    }

    .task-edit-schedule-row {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .task-edit-footer {
      grid-template-columns: minmax(360px, 0.62fr) minmax(0, 1fr);
    }
  }

  @media (max-width: 900px) {
    .task-main {
      flex-wrap: wrap;
    }

    .task-actions {
      justify-self: start;
      flex-wrap: wrap;
    }

    .task-edit-primary-row,
    .task-edit-schedule-row,
    .task-edit-footer,
    .edit-reminder-row {
      grid-template-columns: 1fr;
    }

    .edit-actions {
      justify-content: flex-start;
    }
  }
</style>
