<script>
  let {
    strings,
    collapsed = false,
    compact = false,
    manualLayoutEnabled = false,
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
  class:manual-layout={manualLayoutEnabled}
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
    border: 1px solid var(--ws-border, #dce5f3);
    border-radius: 12px;
    background: var(--ws-card-bg, #fdfefe);
    padding: 10px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
  }

  .deadline-block.manual-layout {
    height: var(--manual-block-height, auto);
    max-height: var(--manual-block-height, none);
    overflow: hidden;
  }

  .deadline-block.collapsed {
    padding: 8px 6px;
  }

  .sidebar-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .section-toggle {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 8px;
    min-width: 22px;
    height: 22px;
    padding: 0;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }

  .deadline-empty {
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.45;
    padding: 10px;
  }

  .deadline-count {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    color: var(--ws-text-strong, #0f172a);
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px 0;
  }

  .deadline-list {
    display: grid;
    align-content: start;
    grid-auto-rows: max-content;
    gap: 6px;
    min-height: 0;
    max-height: var(--section-max-height, 320px);
    flex: 0 0 auto;
    overflow: auto;
    padding-right: 4px;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .deadline-block.manual-layout .deadline-list {
    height: var(--section-max-height, 320px);
  }

  .deadline-list::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .deadline-list::-webkit-scrollbar-button {
    width: 0;
    height: 0;
    display: none;
  }

  .deadline-list::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 70%, transparent);
    border-radius: 999px;
  }

  .deadline-list::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 80%, transparent);
  }

  .deadline-list::-webkit-scrollbar-thumb:hover {
    background: var(--ws-scrollbar-thumb-hover, rgba(51, 65, 85, 0.62));
  }

  .deadline-item {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px;
    background: var(--ws-btn-bg, #fbfdff);
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
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  .deadline-item.overdue {
    border-color: color-mix(in srgb, #ef4444 45%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, #ef4444 10%, var(--ws-btn-bg, #fbfdff));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #ef4444 24%, transparent);
  }

  .deadline-title {
    font-size: 12px;
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
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 999px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    background: var(--ws-card-bg, #fdfefe);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .deadline-state.overdue {
    color: #b91c1c;
    border-color: color-mix(in srgb, #ef4444 55%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, #ef4444 12%, var(--ws-card-bg, #fdfefe));
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
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .deadline-progress-row {
    margin-top: 6px;
    display: flex;
    justify-content: flex-start;
    gap: 6px;
    font-size: 10px;
    color: var(--ws-muted, #64748b);
  }

  .deadline-actions {
    margin-top: 7px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .deadline-action-btn {
    flex: 1;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 8px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 11px;
    font-weight: 700;
    min-height: 26px;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .deadline-action-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .deadline-block.compact .deadline-item {
    padding: 7px;
  }

  .deadline-block.compact .deadline-actions {
    gap: 5px;
  }

  .deadline-block.compact .deadline-action-btn {
    min-height: 24px;
    font-size: 10px;
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
      padding: 8px;
    }

    .deadline-title {
      font-size: 11px;
    }

    .deadline-meta,
    .deadline-progress-row {
      font-size: 10px;
    }

    .deadline-action-btn {
      min-height: 24px;
      font-size: 10px;
    }
  }
</style>
