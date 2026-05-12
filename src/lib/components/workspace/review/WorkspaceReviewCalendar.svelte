<script>
  let hoveredDateKey = $state("");

  let {
    strings,
    monthLabel = "",
    weekdayLabels = [],
    cells = [],
    todayDateKey = "",
    selectedDateKey = "",
    onSelectDate = () => {},
    onPrevMonth = () => {},
    onNextMonth = () => {},
  } = $props();

  const hoveredCell = $derived.by(
    () => cells.find((cell) => cell.dateKey === hoveredDateKey && cell.count > 0) || null,
  );
</script>

<section class="calendar-shell">
  <header class="calendar-head">
    <div class="calendar-copy">
      <div class="calendar-badge">{strings.workspaceReviewCalendarBadge}</div>
      <h3>{monthLabel}</h3>
      <p>{strings.workspaceReviewCalendarBody}</p>
    </div>
    <div class="calendar-actions">
      <button type="button" class="nav-btn" onclick={() => onPrevMonth()}>{strings.workspaceReviewCalendarPrev}</button>
      <button type="button" class="nav-btn" onclick={() => onNextMonth()}>{strings.workspaceReviewCalendarNext}</button>
    </div>
  </header>

  <div class="weekday-row">
    {#each weekdayLabels as label (label)}
      <span>{label}</span>
    {/each}
  </div>

  <div class="calendar-grid">
    {#each cells as cell (cell.dateKey)}
      <button
        type="button"
        class="day-cell"
        class:muted={!cell.inCurrentMonth}
        class:today={todayDateKey === cell.dateKey}
        class:selected={selectedDateKey === cell.dateKey}
        class:active={cell.count > 0}
        class:future={cell.dateKey > todayDateKey}
        class:weekend={cell.date.getDay() === 0 || cell.date.getDay() === 6}
        class:heat-1={cell.heatLevel === 1}
        class:heat-2={cell.heatLevel === 2}
        class:heat-3={cell.heatLevel === 3}
        class:heat-4={cell.heatLevel === 4}
        class:hovered={hoveredDateKey === cell.dateKey}
        class:tooltip-up={cell.weekIndex >= 3}
        class:tooltip-left={cell.columnIndex >= 5}
        class:tooltip-right={cell.columnIndex <= 1}
        onclick={() => onSelectDate(cell.dateKey)}
        onmouseenter={() => (hoveredDateKey = cell.count > 0 ? cell.dateKey : "")}
        onmouseleave={() => (hoveredDateKey = "")}
        onfocus={() => (hoveredDateKey = cell.count > 0 ? cell.dateKey : "")}
        onblur={() => (hoveredDateKey = "")}
      >
        <div class="day-head">
          <span class="day-number">{cell.dayNumber}</span>
          {#if todayDateKey === cell.dateKey}
            <span class="today-chip">{strings.workspaceReviewCalendarToday}</span>
          {/if}
        </div>
        {#if cell.count > 0}
          <span class="day-count">{cell.count} {strings.workspaceReviewCalendarCountSuffix}</span>
        {/if}
        {#if cell.previewTitle}
          <span class="day-preview">{cell.previewTitle}</span>
        {/if}
        {#if hoveredCell && hoveredCell.dateKey === cell.dateKey}
          <span class="day-tooltip">
            <strong>{hoveredCell.count} {strings.workspaceReviewCalendarCountSuffix}</strong>
            {#each hoveredCell.records.slice(0, 3) as record (record.id)}
              <span>{record.title}</span>
            {/each}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .calendar-shell {
    display: grid;
    gap: 10px;
  }

  .calendar-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .calendar-copy {
    display: grid;
    gap: 4px;
  }

  .calendar-copy h3 {
    margin: 0;
    font-size: 20px;
    color: var(--ws-text-strong, #0f172a);
  }

  .calendar-copy p {
    margin: 0;
    color: var(--ws-muted, #64748b);
    font-size: 13px;
    line-height: 1.6;
    max-width: 680px;
  }

  .calendar-badge {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    font-weight: 700;
  }

  .calendar-actions {
    display: flex;
    gap: 8px;
  }

  .nav-btn {
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
  }

  .weekday-row,
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
  }

  .weekday-row span {
    text-align: center;
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .day-cell {
    position: relative;
    z-index: 0;
    min-height: 88px;
    border-radius: 16px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 98%, transparent);
    padding: 10px;
    display: grid;
    align-content: space-between;
    text-align: left;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 76%, transparent),
      0 1px 2px color-mix(in srgb, #0f172a 4%, transparent);
    transition:
      border-color 0.16s ease,
      transform 0.16s ease,
      background 0.16s ease,
      box-shadow 0.16s ease;
  }

  .day-cell.weekend:not(.selected):not(.today) {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 94%, #f5f8fd) 0%,
        color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 98%, transparent) 100%
      );
  }

  .day-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .day-cell.active:hover,
  .day-cell:hover {
    transform: translateY(-1px);
    border-color: var(--ws-border-hover, #c6d5e8);
  }

  .day-cell.hovered {
    z-index: 8;
  }

  .day-cell.muted {
    opacity: 0.5;
  }

  .day-cell.future:not(.today) .day-number,
  .day-cell.future:not(.today) .day-count,
  .day-cell.future:not(.today) .day-preview {
    opacity: 0.42;
  }

  .day-cell.future:not(.today) {
    border-style: dashed;
  }

  .day-cell:not(.active) {
    min-height: 58px;
    padding-block: 8px;
    align-content: start;
  }

  .day-cell.active {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, var(--ws-border-soft, #d9e2ef));
  }

  .day-cell.heat-1:not(.selected):not(.today) {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 2.5%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
  }

  .day-cell.heat-2:not(.selected):not(.today) {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 4.5%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
  }

  .day-cell.heat-3:not(.selected):not(.today) {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent),
      0 4px 10px color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .day-cell.heat-4:not(.selected):not(.today) {
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 82%, transparent),
      0 6px 12px color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, transparent);
  }

  .day-cell.today {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-soft, #d9e2ef));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 7%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 3%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 0 0 1px color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, transparent),
      0 8px 18px color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .day-cell.selected {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 44%, var(--ws-border-soft, #d9e2ef));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, #eef4ff) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 0 0 1px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent),
      0 12px 24px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .day-number {
    color: var(--ws-text-strong, #0f172a);
    font-size: 16px;
    font-weight: 800;
  }

  .today-chip {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #ffffff);
    color: color-mix(in srgb, var(--ws-accent-strong, #163ea8) 72%, var(--ws-muted, #64748b));
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .day-cell.selected .day-number {
    color: var(--ws-accent-strong, #163ea8);
  }

  .day-cell.selected .today-chip {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, #ffffff);
    color: var(--ws-accent-strong, #163ea8);
  }

  .day-count {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.3;
    font-weight: 700;
  }

  .day-preview {
    display: block;
    margin-top: 6px;
    color: var(--ws-text, #334155);
    font-size: 11px;
    line-height: 1.45;
    font-weight: 600;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-wrap: pretty;
  }

  .day-tooltip {
    position: absolute;
    left: 50%;
    top: calc(100% + 8px);
    z-index: 12;
    width: min(220px, calc(100vw - 48px));
    transform: translateX(-50%);
    pointer-events: none;
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, var(--ws-border-soft, #d9e2ef));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.94)) 98%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 5%, var(--ws-panel-bg, rgba(255, 255, 255, 0.94))) 100%
      );
    color: var(--ws-text, #334155);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 86%, transparent),
      0 14px 28px color-mix(in srgb, #0f172a 12%, transparent);
    backdrop-filter: blur(10px);
  }

  .day-cell.tooltip-up .day-tooltip {
    top: auto;
    bottom: calc(100% + 8px);
  }

  .day-cell.tooltip-left .day-tooltip {
    left: auto;
    right: 0;
    transform: none;
  }

  .day-cell.tooltip-right .day-tooltip {
    left: 0;
    right: auto;
    transform: none;
  }

  .day-tooltip strong {
    color: var(--ws-accent-strong, #163ea8);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .day-tooltip span {
    color: var(--ws-text, #334155);
    font-size: 11px;
    line-height: 1.45;
    font-weight: 600;
  }

  .day-cell.selected .day-count {
    color: color-mix(in srgb, var(--ws-accent-strong, #163ea8) 74%, var(--ws-muted, #64748b));
    font-weight: 700;
  }

  .day-cell.selected .day-preview,
  .day-cell.today .day-preview {
    color: color-mix(in srgb, var(--ws-accent-strong, #163ea8) 84%, var(--ws-text, #334155));
  }
</style>
