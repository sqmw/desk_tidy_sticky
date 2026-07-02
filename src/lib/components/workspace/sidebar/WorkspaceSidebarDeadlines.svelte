<script>
  let {
    strings,
    collapsed = false,
    compact = false,
    blockStyle = "",
    sectionCollapsed = false,
    focusDeadlines = [],
    onToggleSectionCollapsed = () => {},
    onDeadlineAction = () => {},
  } = $props();

  /**
   * @param {number} totalSeconds
   */
  function formatMinutesSummary(totalSeconds) {
    return `${Math.max(0, Math.round(Number(totalSeconds || 0) / 60))}m`;
  }

  /** @param {{ isOverdue: boolean; minutesLeft: number; started?: boolean; minutesUntilStart?: number; currentCycleSeconds?: number; targetSeconds?: number; taskCycles?: number }} item */
  function deadlineLabel(item) {
    if (item.isOverdue) return `${strings.workspaceDeadlineOverdue} ${Math.abs(item.minutesLeft)}m`;
    if (!item.started) return `${strings.workspaceDeadlineStartsIn} ${Math.max(0, item.minutesUntilStart ?? 0)}m`;
    return `${strings.pomodoroTaskCurrentRound || "Current round"} ${formatMinutesSummary(Number(item.currentCycleSeconds || 0))} / ${formatMinutesSummary(Number(item.targetSeconds || 0))}`;
  }

  /** @param {{ isOverdue: boolean; started?: boolean; taskCycles?: number }} item */
  function deadlineStateLabel(item) {
    if (item.isOverdue) return strings.workspaceDeadlineStateOverdue || strings.workspaceDeadlineOverdue;
    if (!item.started) return strings.workspaceDeadlineStateUpcoming || strings.workspaceDeadlineStartsIn;
    return `${strings.pomodoroTaskRounds || "Task rounds"} x${Math.max(0, Number(item.taskCycles || 0))}`;
  }

  /** @param {boolean} value */
  function sectionToggleIcon(value) {
    return value ? "▸" : "▾";
  }

  /**
   * @param {KeyboardEvent} event
   * @param {string} id
   */
  function handleDeadlineKeydown(event, id) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDeadlineAction(id);
    }
  }
</script>

<div
  class="deadline-block"
  class:collapsed
  class:compact
  style={blockStyle}
>
  <div class="sidebar-block-head">
    <div class="block-title">{collapsed ? "•" : strings.workspaceDeadlineTitle}</div>
    {#if compact && !collapsed}
      <button
        type="button"
        class="section-toggle"
        onclick={() => onToggleSectionCollapsed()}
        aria-label={strings.workspaceDeadlineTitle}
      >
        {sectionToggleIcon(sectionCollapsed)}
      </button>
    {/if}
  </div>
  {#if !compact || !sectionCollapsed || collapsed}
    {#if collapsed}
      <div class="deadline-count">{focusDeadlines.length}</div>
    {:else if focusDeadlines.length === 0}
      <div class="deadline-empty">{strings.workspaceDeadlineEmpty}</div>
    {:else}
      <div class="deadline-list">
        {#each focusDeadlines as item (item.id)}
          <div
            role="button"
            tabindex="0"
            class="deadline-item"
            class:overdue={item.isOverdue}
            onclick={() => onDeadlineAction(item.id)}
            onkeydown={(event) => handleDeadlineKeydown(event, item.id)}
          >
            <div class="deadline-head">
              <div class="deadline-title">{item.title}</div>
              <span class="deadline-state" class:overdue={item.isOverdue}>
                {#if item.isOverdue}
                  <span class="deadline-alert-dot" aria-hidden="true"></span>
                {/if}
                {deadlineStateLabel(item)}
              </span>
            </div>
            <div class="deadline-meta">
              <span>{item.startTime} - {item.endTime}</span>
              <span>{deadlineLabel(item)}</span>
            </div>
            <div class="deadline-progress-row">
              <span>{strings.pomodoroTaskElapsed || "Elapsed"} {formatMinutesSummary(item.effectiveSeconds)} / {formatMinutesSummary(item.targetSeconds)}</span>
              <span>🍅 {item.donePomodoros}</span>
            </div>
            <div class="deadline-actions">
              <button
                type="button"
                class="deadline-action-btn"
                onclick={(event) => { event.stopPropagation(); onDeadlineAction(item.id, "snooze15"); }}
              >
                {strings.workspaceDeadlineActionSnooze15 || "+15m"}
              </button>
              <button
                type="button"
                class="deadline-action-btn"
                onclick={(event) => { event.stopPropagation(); onDeadlineAction(item.id, "snooze30"); }}
              >
                {strings.workspaceDeadlineActionSnooze30 || "+30m"}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .deadline-block {
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
  }

  .deadline-block.collapsed {
    padding: 6px 0;
  }

  .sidebar-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .block-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .section-toggle {
    border: 1px solid transparent;
    border-radius: 0;
    min-width: 22px;
    height: 22px;
    padding: 0;
    background: transparent;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }

  .deadline-empty {
    border: 1px solid transparent;
    border-radius: 0;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.45;
    padding: 8px;
  }

  .deadline-count {
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    color: var(--ws-text-strong, #0f172a);
    border: 1px solid transparent;
    border-radius: 0;
    padding: 6px 0;
  }

  .deadline-list {
    display: grid;
    align-content: start;
    grid-auto-rows: max-content;
    gap: 4px;
    min-height: 0;
    max-height: none;
    flex: 0 0 auto;
    overflow: visible;
    padding-right: 0;
    scrollbar-width: none;
  }

  .deadline-list::-webkit-scrollbar {
    display: none;
  }

  .deadline-item {
    border: 1px solid transparent;
    border-radius: 0;
    padding: 6px 0 6px 5px;
    background: transparent;
    min-width: 0;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      transform 0.16s ease;
  }

  .deadline-item:hover {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .deadline-item.overdue {
    border-color: transparent;
    background: color-mix(in srgb, #ef4444 8%, transparent);
    box-shadow: none;
  }

  .deadline-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-text, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .deadline-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .deadline-state {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 34%, transparent);
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 9px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    background: transparent;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .deadline-state.overdue {
    color: #b91c1c;
    border-color: color-mix(in srgb, #ef4444 42%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, #ef4444 6%, transparent);
  }

  .deadline-alert-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #ef4444;
    box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 55%, transparent);
    animation: deadline-overdue-pulse 1.8s ease infinite;
  }

  .deadline-meta {
    margin-top: 3px;
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 10px;
    color: var(--ws-muted, #64748b);
  }

  .deadline-progress-row {
    margin-top: 4px;
    display: flex;
    justify-content: flex-start;
    gap: 6px;
    font-size: 9px;
    color: var(--ws-muted, #64748b);
  }

  .deadline-actions {
    margin-top: 5px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }

  .deadline-action-btn {
    flex: 1;
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 11px;
    font-weight: 700;
    min-height: 22px;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .deadline-action-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .deadline-block.compact .deadline-item {
    padding: 6px;
  }

  .deadline-block.compact .deadline-actions {
    gap: 4px;
  }

  .deadline-block.compact .deadline-action-btn {
    min-height: 20px;
    font-size: 9px;
  }

  @keyframes deadline-overdue-pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 45%, transparent);
    }
    70% {
      box-shadow: 0 0 0 6px color-mix(in srgb, #ef4444 0%, transparent);
    }
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 0%, transparent);
    }
  }

  @container (max-width: 230px) {
    .deadline-block {
      padding: 0;
    }

    .deadline-title {
      font-size: 11px;
    }

    .deadline-meta,
    .deadline-progress-row {
      font-size: 10px;
    }

    .deadline-action-btn {
      min-height: 20px;
      font-size: 9px;
    }
  }
</style>
