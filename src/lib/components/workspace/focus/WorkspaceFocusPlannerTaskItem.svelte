<script>
  import {
    formatPomodoroScore,
    getEquivalentPomodoros,
  } from "$lib/workspace/focus/focus-pomodoro-metrics.js";

  let {
    strings,
    taskModeDuration = "duration",
    taskModeTimeWindow = "timeWindow",
    recurrence,
    weekdays,
    task,
    startedTask = false,
    runningTask = false,
    donePomodoros = 0,
    pomodoroScore = 0,
    effectiveSeconds = 0,
    targetSeconds = 0,
    focusMinutesPerPomodoro = 25,
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

  function beginEdit() {
    editTitle = String(task?.title || "");
    editTaskMode = String(task?.taskMode || taskModeTimeWindow);
    editTargetMinutes = Math.max(1, Math.round(Number(task?.targetSeconds || 7200) / 60));
    editStartTime = String(task?.startTime || "09:00");
    editEndTime = String(task?.endTime || "10:00");
    editRecurrence = String(task?.recurrence || recurrence.NONE);
    editWeekdays = Array.isArray(task?.weekdays) ? [...task.weekdays] : [1, 2, 3, 4, 5];
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
    });
    editing = false;
  }
  const isStartedTask = $derived(startedTask === true);
  const isRunningTask = $derived(runningTask === true);
  const primaryActionText = $derived.by(() => {
    if (isRunningTask) return strings.pomodoroPause || "Pause";
    if (isStartedTask) return strings.pomodoroResume || "Resume";
    return strings.pomodoroStart || "Start";
  });
  const safeEffectiveSeconds = $derived(Math.max(0, Math.floor(Number(effectiveSeconds || 0))));
  const safeTargetSeconds = $derived(Math.max(0, Math.floor(Number(targetSeconds || 0))));
  const showEffectiveProgress = $derived(safeTargetSeconds > 0);
  const progressPercent = $derived.by(() => {
    if (!showEffectiveProgress) return 0;
    const ratio = safeEffectiveSeconds / Math.max(1, safeTargetSeconds);
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  });
  const isDurationTask = $derived(String(task?.taskMode || taskModeTimeWindow) === taskModeDuration);
  const isCompleted = $derived(showEffectiveProgress && safeEffectiveSeconds >= safeTargetSeconds);
  const displayPomodoroScore = $derived.by(() => {
    const explicit = Number(pomodoroScore || 0);
    if (explicit > 0) return explicit;
    return getEquivalentPomodoros(safeEffectiveSeconds, focusMinutesPerPomodoro);
  });

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
  class:completed={isCompleted}
  style={`--task-active-progress:${progressPercent}%`}
>
  {#if editing}
    <div class="task-edit-grid">
      <input class="field-title" type="text" bind:value={editTitle} placeholder={strings.pomodoroTaskTitle} />
      <select class="field-mode" bind:value={editTaskMode}>
        <option value={taskModeTimeWindow}>{strings.pomodoroTaskModeTimeWindow || "Time window"}</option>
        <option value={taskModeDuration}>{strings.pomodoroTaskModeDuration || "Duration"}</option>
      </select>
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
        <input class="field-start" type="time" bind:value={editStartTime} />
        <input class="field-end" type="time" bind:value={editEndTime} />
      {/if}
      <select class="field-recur" bind:value={editRecurrence}>
        <option value={recurrence.NONE}>{strings.recurrenceNone}</option>
        <option value={recurrence.DAILY}>{strings.recurrenceDaily}</option>
        <option value={recurrence.WORKDAY}>{strings.recurrenceWorkday}</option>
        <option value={recurrence.CUSTOM}>{strings.recurrenceCustom}</option>
      </select>
    </div>
    {#if editRecurrence === recurrence.CUSTOM}
      <div class="weekday-picker">
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
    <div class="task-actions">
      <button type="button" class="btn tiny primary" onclick={() => saveEdit()}>{strings.saveNote}</button>
      <button type="button" class="btn tiny" onclick={() => cancelEdit()}>{strings.cancel}</button>
      <button type="button" class="btn tiny" onclick={() => onRemoveTask(task.id)}>{strings.delete}</button>
    </div>
  {:else}
    <div class="task-main">
      <span class="task-title">{task.title}</span>
      <span class="task-time">
        {#if isDurationTask}
          {strings.pomodoroTaskFlexibleSchedule || "Flexible schedule"}
        {:else}
          {task.startTime} - {task.endTime}
        {/if}
      </span>
      {#if showEffectiveProgress}
        <span class="task-elapsed">
          {(strings.pomodoroTaskElapsed || "Elapsed")} {formatDuration(safeEffectiveSeconds)} / {formatDuration(safeTargetSeconds)}
        </span>
      {/if}
      {#if isCompleted}
        <span class="task-completed">{strings.pomodoroTaskCompleted || "Completed"}</span>
      {/if}
      <span class="task-progress" title={`整番茄 ${donePomodoros}`}>
        🍅 {formatPomodoroScore(displayPomodoroScore)}
      </span>
    </div>
    <div class="task-actions">
      <button
        type="button"
        class="btn tiny"
        class:started={isStartedTask}
        onclick={() => (isStartedTask ? onToggleTask() : onStartTask(task.id))}
      >
        {primaryActionText}
      </button>
      <button type="button" class="btn tiny" onclick={() => beginEdit()}>{strings.edit}</button>
      <button type="button" class="btn tiny" onclick={() => onRemoveTask(task.id)}>{strings.delete}</button>
    </div>
  {/if}
</div>

<style>
  .task-item {
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    padding: 7px 8px;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    background: var(--ws-card-bg, #fff);
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .task-item > * {
    position: relative;
    z-index: 1;
  }

  .task-item.started {
    border-color: color-mix(in srgb, #14b8a6 30%, var(--ws-border-soft, #dbe4ef));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 65%, transparent),
      0 0 0 1px color-mix(in srgb, #14b8a6 10%, transparent);
  }

  .task-item.started::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--task-active-progress, 0%);
    min-width: 14px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, #0f766e 20%, transparent) 0%,
      color-mix(in srgb, #2dd4bf 26%, transparent) 100%
    );
    opacity: 0.58;
    pointer-events: none;
    z-index: 0;
  }

  .task-item.started::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, #ffffff 58%, transparent) 0%,
      color-mix(in srgb, #ecfeff 18%, transparent) 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  .task-item.editing {
    display: grid;
    gap: 8px;
    align-items: stretch;
  }

  .task-item.completed {
    border-color: color-mix(in srgb, #22c55e 38%, var(--ws-border-soft, #dbe4ef));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
      0 0 0 1px color-mix(in srgb, #22c55e 12%, transparent);
  }

  .task-main {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .task-title {
    font-size: clamp(12px, 0.72vw, 14px);
    color: var(--ws-text, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 360px;
  }

  .task-time {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .task-progress {
    font-size: 11px;
    color: var(--ws-accent, #1d4ed8);
    border: 1px solid var(--ws-badge-border, #d7e5ff);
    border-radius: 999px;
    padding: 2px 6px;
    background: var(--ws-badge-bg, #e8f0ff);
  }

  .task-elapsed {
    font-size: 11px;
    color: var(--ws-text, #334155);
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 95%, transparent);
    border-radius: 999px;
    padding: 2px 6px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 92%, #f8fafc);
    white-space: nowrap;
  }

  .task-completed {
    font-size: 11px;
    color: #166534;
    border: 1px solid color-mix(in srgb, #22c55e 42%, #bbf7d0);
    border-radius: 999px;
    padding: 2px 6px;
    background: color-mix(in srgb, #dcfce7 86%, #ffffff);
    white-space: nowrap;
    font-weight: 700;
  }

  .task-edit-grid {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.5fr)
      minmax(112px, 0.96fr)
      minmax(92px, 0.85fr)
      minmax(92px, 0.85fr)
      minmax(108px, 0.96fr);
    gap: 6px;
    align-items: stretch;
  }

  .task-edit-grid input,
  .task-edit-grid select {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: clamp(12px, 0.72vw, 14px);
    padding: 6px 8px;
    height: clamp(32px, 2.2vw, 38px);
    outline: none;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent);
  }

  .field-duration-hint {
    height: clamp(32px, 2.2vw, 38px);
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

  .weekday-picker {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .day-chip {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
  }

  .day-chip.active {
    border-color: var(--ws-border-active, #94a3b8);
    background: var(--ws-btn-active, #e8f0ff);
    color: var(--ws-text-strong, #0f172a);
  }

  .task-actions {
    display: flex;
    gap: 5px;
    justify-self: end;
  }

  .btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    height: clamp(30px, 2.1vw, 36px);
    padding: 0 10px;
    font-size: clamp(12px, 0.72vw, 14px);
    cursor: pointer;
    white-space: nowrap;
  }

  .btn.tiny {
    height: 26px;
    font-size: 11px;
    padding: 0 8px;
  }

  .btn.primary {
    border-color: var(--ws-border-active, #2f4368);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    font-weight: 700;
  }

  .btn.started {
    border-color: color-mix(in srgb, #14b8a6 34%, var(--ws-border-soft, #d6e0ee));
    background: color-mix(in srgb, #ccfbf1 82%, #ffffff);
    color: #0f766e;
    font-weight: 700;
    cursor: default;
  }

  @media (max-width: 1600px) {
    .task-edit-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .field-title {
      grid-column: span 2;
    }

    .field-recur {
      grid-column: span 2;
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

    .task-edit-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .field-title,
    .field-recur {
      grid-column: 1 / -1;
    }

  }
</style>
