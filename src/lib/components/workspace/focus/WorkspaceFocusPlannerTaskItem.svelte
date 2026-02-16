<script>
  import TargetPomodoroInput from "$lib/components/workspace/focus/TargetPomodoroInput.svelte";

  let {
    strings,
    recurrence,
    weekdays,
    task,
    defaultMiniBreakEveryMinutes = 10,
    defaultLongBreakEveryMinutes = 30,
    completed = false,
    donePomodoros = 0,
    onToggleTaskDone = () => {},
    onStartTask = () => {},
    onRemoveTask = () => {},
    onUpdateTask = () => {},
    weekdayLabel = /** @type {(day: number) => string} */ ((day) => String(day)),
  } = $props();

  let editing = $state(false);
  let editTitle = $state("");
  let editStartTime = $state("09:00");
  let editEndTime = $state("10:00");
  let editTargetPomodoros = $state(1);
  let editRecurrence = $state("none");
  let editWeekdays = $state([1, 2, 3, 4, 5]);
  let editUseDefaultBreakProfile = $state(true);
  let editTaskMiniBreakEveryMinutes = $state(10);
  let editTaskLongBreakEveryMinutes = $state(30);

  function beginEdit() {
    editTitle = String(task?.title || "");
    editStartTime = String(task?.startTime || "09:00");
    editEndTime = String(task?.endTime || "10:00");
    editTargetPomodoros = Number(task?.targetPomodoros || 1);
    editRecurrence = String(task?.recurrence || recurrence.NONE);
    editWeekdays = Array.isArray(task?.weekdays) ? [...task.weekdays] : [1, 2, 3, 4, 5];
    const profile = task?.breakProfile && typeof task.breakProfile === "object" ? task.breakProfile : null;
    editUseDefaultBreakProfile = !profile;
    editTaskMiniBreakEveryMinutes = Number(profile?.miniBreakEveryMinutes || defaultMiniBreakEveryMinutes || 10);
    editTaskLongBreakEveryMinutes = Number(profile?.longBreakEveryMinutes || defaultLongBreakEveryMinutes || 30);
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
    onUpdateTask(task.id, {
      title,
      startTime: editStartTime,
      endTime: editEndTime,
      targetPomodoros: editTargetPomodoros,
      recurrence: nextRecurrence,
      weekdays: nextRecurrence === recurrence.CUSTOM ? editWeekdays : [],
      breakProfile: editUseDefaultBreakProfile
        ? null
        : {
            miniBreakEveryMinutes: editTaskMiniBreakEveryMinutes,
            longBreakEveryMinutes: editTaskLongBreakEveryMinutes,
          },
    });
    editing = false;
  }

  const taskBreakMiniEveryMinutes = $derived(
    Number(task?.breakProfile?.miniBreakEveryMinutes || defaultMiniBreakEveryMinutes || 10),
  );
  const taskBreakLongEveryMinutes = $derived(
    Number(task?.breakProfile?.longBreakEveryMinutes || defaultLongBreakEveryMinutes || 30),
  );
</script>

<div class="task-item" class:editing={editing}>
  {#if editing}
    <div class="task-edit-grid">
      <input class="field-title" type="text" bind:value={editTitle} placeholder={strings.pomodoroTaskTitle} />
      <input class="field-start" type="time" bind:value={editStartTime} />
      <input class="field-end" type="time" bind:value={editEndTime} />
      <div class="field-target">
        <TargetPomodoroInput bind:value={editTargetPomodoros} min={1} max={24} title={strings.pomodoroTargetCount} />
      </div>
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
    <div class="break-profile-row">
      <span class="break-profile-label">{strings.pomodoroTaskBreakProfile || "Task break profile"}</span>
      <div class="break-profile-toggle">
        <button
          type="button"
          class="btn tiny chip-btn"
          class:active={editUseDefaultBreakProfile}
          onclick={() => (editUseDefaultBreakProfile = true)}
        >
          {strings.pomodoroTaskBreakDefault || "Default"}
        </button>
        <button
          type="button"
          class="btn tiny chip-btn"
          class:active={!editUseDefaultBreakProfile}
          onclick={() => (editUseDefaultBreakProfile = false)}
        >
          {strings.pomodoroTaskBreakCustom || "Custom"}
        </button>
        {#if editUseDefaultBreakProfile}
          <span class="break-profile-hint">
            {defaultMiniBreakEveryMinutes}/{defaultLongBreakEveryMinutes}m
          </span>
        {/if}
      </div>
      {#if !editUseDefaultBreakProfile}
        <div class="break-profile-inputs">
          <label>
            <span>{strings.pomodoroTaskBreakMiniEveryMinutes || "Task mini every (min)"}</span>
            <TargetPomodoroInput
              bind:value={editTaskMiniBreakEveryMinutes}
              min={5}
              max={180}
              title={strings.pomodoroTaskBreakMiniEveryMinutes || "Task mini every (min)"}
            />
          </label>
          <label>
            <span>{strings.pomodoroTaskBreakLongEveryMinutes || "Task long every (min)"}</span>
            <TargetPomodoroInput
              bind:value={editTaskLongBreakEveryMinutes}
              min={15}
              max={360}
              title={strings.pomodoroTaskBreakLongEveryMinutes || "Task long every (min)"}
            />
          </label>
        </div>
      {/if}
    </div>
    <div class="task-actions">
      <button type="button" class="btn tiny primary" onclick={() => saveEdit()}>{strings.saveNote}</button>
      <button type="button" class="btn tiny" onclick={() => cancelEdit()}>{strings.cancel}</button>
      <button type="button" class="btn tiny" onclick={() => onRemoveTask(task.id)}>{strings.delete}</button>
    </div>
  {:else}
    <label class="task-main">
      <input
        type="checkbox"
        checked={completed}
        onchange={() => onToggleTaskDone(task.id)}
      />
      <span class="task-title">{task.title}</span>
      <span class="task-time">{task.startTime} - {task.endTime}</span>
      <span class="task-progress">
        🍅 {donePomodoros}/{task.targetPomodoros || 1}
      </span>
      <span class="task-break-profile">
        ⏸ {taskBreakMiniEveryMinutes}/{taskBreakLongEveryMinutes}m
      </span>
    </label>
    <div class="task-actions">
      <button type="button" class="btn tiny" onclick={() => onStartTask(task.id)}>{strings.pomodoroStart}</button>
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
  }

  .task-item.editing {
    display: grid;
    gap: 8px;
    align-items: stretch;
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

  .task-break-profile {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .task-edit-grid {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.8fr)
      minmax(86px, 0.92fr)
      minmax(86px, 0.92fr)
      minmax(80px, 0.72fr)
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

  .field-target {
    min-width: 0;
  }

  .weekday-picker {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .break-profile-row {
    display: grid;
    gap: 6px;
  }

  .break-profile-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .break-profile-toggle {
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

  .break-profile-hint {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .break-profile-inputs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .break-profile-inputs label {
    display: grid;
    gap: 4px;
  }

  .break-profile-inputs span {
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

    .break-profile-inputs {
      grid-template-columns: 1fr;
    }
  }
</style>
