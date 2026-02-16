<script>
  import TargetPomodoroInput from "$lib/components/workspace/focus/TargetPomodoroInput.svelte";
  import WorkspaceFocusPlannerTaskItem from "$lib/components/workspace/focus/WorkspaceFocusPlannerTaskItem.svelte";

  let {
    strings,
    recurrence,
    weekdays,
    draftTitle = $bindable(""),
    draftStartTime = $bindable("09:00"),
    draftEndTime = $bindable("10:00"),
    draftTargetPomodoros = $bindable(1),
    draftRecurrence = $bindable("none"),
    draftWeekdays = $bindable([1, 2, 3, 4, 5]),
    draftUseDefaultBreakProfile = $bindable(true),
    draftTaskMiniBreakEveryMinutes = $bindable(10),
    draftTaskLongBreakEveryMinutes = $bindable(30),
    defaultMiniBreakEveryMinutes = 10,
    defaultLongBreakEveryMinutes = 30,
    tasks = [],
    showingAllTasks = false,
    todayTaskCount = 0,
    todayStats,
    onAddTask = () => {},
    onToggleWeekday = () => {},
    onToggleTaskDone = () => {},
    onStartTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    weekdayLabel = /** @type {(day: number) => string} */ ((day) => String(day)),
  } = $props();
</script>

<div class="planner-card">
  <div class="planner-head">
    <h3>{strings.pomodoroTaskPlanner}</h3>
    {#if showingAllTasks}
      <span>
        {strings.workspacePlannerShowingAllHint || "No tasks match today. Showing all tasks."}
        · {strings.workspacePlannerTodayMatched || "Today matched"} {todayTaskCount}
      </span>
    {:else}
      <span>{strings.todo}: {todayStats.completedCount}/{tasks.length} · 🍅 {todayStats.donePomodoros}/{todayStats.targetPomodoros}</span>
    {/if}
  </div>
  <div class="planner-form">
    <input class="field-title" type="text" placeholder={strings.pomodoroTaskTitle} bind:value={draftTitle} />
    <input class="field-start" type="time" bind:value={draftStartTime} />
    <input class="field-end" type="time" bind:value={draftEndTime} />
    <div class="field-target">
      <TargetPomodoroInput bind:value={draftTargetPomodoros} min={1} max={24} title={strings.pomodoroTargetCount} />
    </div>
    <select class="field-recur" bind:value={draftRecurrence}>
      <option value={recurrence.NONE}>{strings.recurrenceNone}</option>
      <option value={recurrence.DAILY}>{strings.recurrenceDaily}</option>
      <option value={recurrence.WORKDAY}>{strings.recurrenceWorkday}</option>
      <option value={recurrence.CUSTOM}>{strings.recurrenceCustom}</option>
    </select>
    <button type="button" class="btn primary field-add" onclick={() => onAddTask()}>{strings.addTask}</button>
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
  <div class="draft-break-row">
    <span class="draft-break-label">{strings.pomodoroTaskBreakProfile || "Task break profile"}</span>
    <div class="draft-break-toggle">
      <button
        type="button"
        class="btn tiny chip-btn"
        class:active={draftUseDefaultBreakProfile}
        onclick={() => (draftUseDefaultBreakProfile = true)}
      >
        {strings.pomodoroTaskBreakDefault || "Default"}
      </button>
      <button
        type="button"
        class="btn tiny chip-btn"
        class:active={!draftUseDefaultBreakProfile}
        onclick={() => (draftUseDefaultBreakProfile = false)}
      >
        {strings.pomodoroTaskBreakCustom || "Custom"}
      </button>
      {#if draftUseDefaultBreakProfile}
        <span class="draft-break-hint">{defaultMiniBreakEveryMinutes}/{defaultLongBreakEveryMinutes}m</span>
      {/if}
    </div>
    {#if !draftUseDefaultBreakProfile}
      <div class="draft-break-inputs">
        <label>
          <span>{strings.pomodoroTaskBreakMiniEveryMinutes || "Task mini every (min)"}</span>
          <TargetPomodoroInput
            bind:value={draftTaskMiniBreakEveryMinutes}
            min={5}
            max={180}
            title={strings.pomodoroTaskBreakMiniEveryMinutes || "Task mini every (min)"}
          />
        </label>
        <label>
          <span>{strings.pomodoroTaskBreakLongEveryMinutes || "Task long every (min)"}</span>
          <TargetPomodoroInput
            bind:value={draftTaskLongBreakEveryMinutes}
            min={15}
            max={360}
            title={strings.pomodoroTaskBreakLongEveryMinutes || "Task long every (min)"}
          />
        </label>
      </div>
    {/if}
  </div>
  <div class="task-list">
    {#if tasks.length === 0}
      <div class="empty">{strings.pomodoroNoTasksToday}</div>
    {:else}
      {#each tasks as task (task.id)}
        <WorkspaceFocusPlannerTaskItem
          {strings}
          {recurrence}
          {weekdays}
          {task}
          completed={todayStats.completedTaskIds.includes(task.id)}
          donePomodoros={todayStats.taskPomodoros?.[task.id] || 0}
          onToggleTaskDone={onToggleTaskDone}
          onStartTask={onStartTask}
          onRemoveTask={onRemoveTask}
          onUpdateTask={onUpdateTask}
          {defaultMiniBreakEveryMinutes}
          {defaultLongBreakEveryMinutes}
          {weekdayLabel}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .planner-card {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent), transparent 35%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    backdrop-filter: blur(8px);
    padding: 12px;
    min-height: clamp(330px, 42vh, 560px);
    display: flex;
    flex-direction: column;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
      0 8px 22px color-mix(in srgb, #0f172a 10%, transparent);
  }

  .planner-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }

  .planner-head h3 {
    margin: 0;
    font-size: clamp(13px, 0.82vw, 17px);
    color: var(--ws-text-strong, #0f172a);
  }

  .planner-head span {
    font-size: clamp(11px, 0.65vw, 13px);
    color: var(--ws-muted, #64748b);
  }

  .planner-form {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.8fr)
      minmax(88px, 0.95fr)
      minmax(88px, 0.95fr)
      minmax(82px, 0.76fr)
      minmax(112px, 1fr)
      minmax(96px, max-content);
    gap: 6px;
    align-items: stretch;
  }

  .planner-form input,
  .planner-form select {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: clamp(12px, 0.72vw, 14px);
    padding: 6px 8px;
    height: clamp(34px, 2.3vw, 40px);
    outline: none;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent);
  }

  .field-target {
    min-width: 0;
  }

  .btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    height: clamp(32px, 2.3vw, 40px);
    padding: 0 10px;
    font-size: clamp(12px, 0.72vw, 14px);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field-add {
    min-width: 92px;
  }

  .btn.primary {
    border-color: var(--ws-border-active, #2f4368);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    font-weight: 700;
  }

  .weekday-picker {
    margin-top: 6px;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .draft-break-row {
    margin-top: 6px;
    display: grid;
    gap: 6px;
  }

  .draft-break-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .draft-break-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chip-btn {
    border-radius: 999px;
  }

  .chip-btn.active {
    border-color: var(--ws-border-active, #2f4368);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-btn-bg, #fff));
    color: var(--ws-text-strong, #0f172a);
    font-weight: 700;
  }

  .draft-break-hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .draft-break-inputs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .draft-break-inputs label {
    display: grid;
    gap: 4px;
  }

  .draft-break-inputs span {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
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

  .task-list {
    margin-top: 8px;
    flex: 1;
    min-height: 180px;
    max-height: clamp(220px, 44vh, 620px);
    overflow: auto;
    display: grid;
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

  @media (max-width: 1220px) {
    .planner-form {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .field-title {
      grid-column: span 2;
    }

    .field-start,
    .field-end,
    .field-target,
    .field-recur,
    .field-add {
      grid-column: span 1;
      min-width: 0;
    }
  }

  @media (max-width: 1700px) {
    .planner-form {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .field-title {
      grid-column: span 2;
    }

    .field-start,
    .field-end,
    .field-target,
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

    .draft-break-inputs {
      grid-template-columns: 1fr;
    }
  }
</style>
