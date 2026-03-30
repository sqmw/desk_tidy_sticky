<script>
  let {
    strings,
    tasks = [],
    currentMinutes = 0,
  } = $props();

  const HOUR_MARKERS = [0, 4, 8, 12, 16, 20, 24];

  /** @param {number} hour */
  function formatHourLabel(hour) {
    if (hour >= 24) return "24:00";
    return `${String(hour).padStart(2, "0")}:00`;
  }

  /**
   * @param {unknown} value
   * @param {number} fallback
   */
  function clampMinutes(value, fallback) {
    const next = Number(value);
    if (!Number.isFinite(next)) return fallback;
    return Math.max(0, Math.min(24 * 60, Math.round(next)));
  }

  /** @param {any} task */
  function normalizeTask(task) {
    const startMinutes = clampMinutes(task?.startMinutes, 0);
    const rawEndMinutes = clampMinutes(task?.endMinutes, startMinutes + 30);
    const safeEndMinutes = rawEndMinutes <= startMinutes
      ? Math.min(24 * 60, startMinutes + 30)
      : rawEndMinutes;
    return {
      ...task,
      startMinutes,
      endMinutes: safeEndMinutes,
      widthPercent: Math.max(2.5, ((safeEndMinutes - startMinutes) / (24 * 60)) * 100),
      leftPercent: (startMinutes / (24 * 60)) * 100,
      progressPercent: Math.max(0, Math.min(100, Number(task?.progressPercent || 0))),
      completedCycles: Math.max(0, Number(task?.completedCycles || 0)),
      isActive: currentMinutes >= startMinutes && currentMinutes < safeEndMinutes,
      isPast: currentMinutes >= safeEndMinutes,
      isUpcoming: currentMinutes < startMinutes,
    };
  }

  const normalizedTasks = $derived(tasks.map((task) => normalizeTask(task)));

  const tracks = $derived.by(() => {
    /** @type {{ endMinutes: number; tasks: any[] }[]} */
    const rows = [];
    for (const task of normalizedTasks) {
      let placed = false;
      for (const row of rows) {
        if (task.startMinutes >= row.endMinutes) {
          row.tasks.push(task);
          row.endMinutes = task.endMinutes;
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push({
          endMinutes: task.endMinutes,
          tasks: [task],
        });
      }
    }
    return rows;
  });

  const nowIndicatorLeft = $derived(Math.max(0, Math.min(100, (currentMinutes / (24 * 60)) * 100)));
</script>

{#if normalizedTasks.length === 0}
  <div class="timeline-empty">{strings.pomodoroNoTasksToday}</div>
{:else}
  <div class="timeline-shell">
    <div class="timeline-ruler">
      {#each HOUR_MARKERS as hour (hour)}
        <span class="timeline-hour" style={`left:${(hour / 24) * 100}%`}>
          {formatHourLabel(hour)}
        </span>
      {/each}
    </div>

    <div class="timeline-body">
      <div class="timeline-grid">
        {#each Array.from({ length: 12 }) as _, index (`grid-${index}`)}
          <span class="timeline-grid-line" style={`left:${(index / 12) * 100}%`}></span>
        {/each}
      </div>

      <span class="timeline-now-line" style={`left:${nowIndicatorLeft}%`}></span>

      <div class="timeline-tracks">
        {#each tracks as track, trackIndex (`track-${trackIndex}`)}
          <div class="timeline-track">
            {#each track.tasks as task (task.id)}
              <div
                class="timeline-task"
                class:active={task.isActive}
                class:past={task.isPast}
                class:upcoming={task.isUpcoming}
                style={`left:${task.leftPercent}%;width:${task.widthPercent}%`}
                title={`${task.title} · ${task.startTime}-${task.endTime} · ${strings.pomodoroTaskElapsed || "Elapsed"} ${Math.round(Number(task.effectiveSeconds || 0) / 60)}m · ${(strings.pomodoroTaskRounds || "Task rounds")} x${task.completedCycles || 0}`}
              >
                <span class="timeline-task-title">{task.title}</span>
                <span class="timeline-task-meta">
                  {task.startTime}-{task.endTime} · {strings.pomodoroTaskElapsed || "Elapsed"} {Math.round(Number(task.effectiveSeconds || 0) / 60)}m · {strings.pomodoroTaskRounds || "Task rounds"} x{task.completedCycles || 0}
                </span>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .timeline-empty {
    font-size: 12px;
    color: var(--ws-muted, #64748b);
  }

  .timeline-shell {
    display: grid;
    gap: 8px;
  }

  .timeline-ruler {
    position: relative;
    height: 18px;
  }

  .timeline-hour {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    font-size: 10px;
    color: var(--ws-muted, #64748b);
    white-space: nowrap;
  }

  .timeline-hour:first-child {
    transform: translateX(0);
  }

  .timeline-hour:last-child {
    transform: translateX(-100%);
  }

  .timeline-body {
    position: relative;
    border: 1px solid var(--ws-border-soft, #dbe4ef);
    border-radius: 10px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--ws-card-bg, #fff) 96%, transparent), color-mix(in srgb, var(--ws-card-bg, #fff) 88%, transparent)),
      color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent);
    padding: 10px 8px 8px;
    overflow: hidden;
  }

  .timeline-grid {
    position: absolute;
    inset: 0 8px 0 8px;
    pointer-events: none;
  }

  .timeline-grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 78%, transparent);
  }

  .timeline-now-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: color-mix(in srgb, #f97316 78%, #fb923c);
    border-radius: 999px;
    box-shadow: 0 0 0 1px color-mix(in srgb, #fff 72%, transparent);
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 2;
  }

  .timeline-tracks {
    position: relative;
    display: grid;
    gap: 8px;
    z-index: 1;
  }

  .timeline-track {
    position: relative;
    min-height: 42px;
  }

  .timeline-task {
    position: absolute;
    top: 0;
    bottom: 0;
    min-width: 76px;
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 24%, var(--ws-border-soft, #dbe4ef));
    border-radius: 10px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, #ffffff) 0%,
      color-mix(in srgb, var(--ws-card-bg, #fff) 94%, transparent) 100%
    );
    padding: 7px 8px;
    display: grid;
    gap: 2px;
    text-align: left;
    color: var(--ws-text, #334155);
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 76%, transparent);
  }

  .timeline-task.active {
    border-color: color-mix(in srgb, #22c55e 55%, var(--ws-accent, #1d4ed8));
    background: linear-gradient(135deg, color-mix(in srgb, #22c55e 14%, #ffffff) 0%, color-mix(in srgb, var(--ws-card-bg, #fff) 92%, transparent) 100%);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 82%, transparent),
      0 0 0 1px color-mix(in srgb, #22c55e 18%, transparent);
  }

  .timeline-task.past {
    opacity: 0.72;
  }

  .timeline-task.upcoming {
    opacity: 0.92;
  }

  .timeline-task-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-text-strong, #0f172a);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-task-meta {
    font-size: 10px;
    color: var(--ws-muted, #64748b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
