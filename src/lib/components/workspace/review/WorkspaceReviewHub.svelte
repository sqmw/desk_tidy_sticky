<script>
  import WorkspaceFocusStats from "$lib/components/workspace/pomodoro/WorkspaceFocusStats.svelte";
  import WorkspaceReviewCalendar from "$lib/components/workspace/review/WorkspaceReviewCalendar.svelte";
  import WorkspaceReviewFilters from "$lib/components/workspace/review/WorkspaceReviewFilters.svelte";
  import WorkspaceReviewLogList from "$lib/components/workspace/review/WorkspaceReviewLogList.svelte";
  import HelpTip from "$lib/components/workspace/ui/HelpTip.svelte";
  import {
    buildReviewCalendarMonth,
    formatReviewDateTime,
    formatReviewDayLabel,
    formatReviewMonthLabel,
    formatReviewTimelineDateTime,
    getDateKey,
    getReviewRecords,
  } from "$lib/workspace/review/review-records.js";
  import {
    buildReviewTagOptions,
    filterReviewRecords,
    REVIEW_RANGE_ALL,
    REVIEW_RANGE_LAST_30_DAYS,
    REVIEW_RANGE_LAST_7_DAYS,
    REVIEW_RANGE_THIS_MONTH,
    REVIEW_RANGE_TODAY,
  } from "$lib/workspace/review/review-record-selectors.js";

  const REVIEW_TAB_LOG = "log";
  const REVIEW_TAB_CALENDAR = "calendar";
  const REVIEW_TAB_STATS = "stats";

  let {
    strings,
    notes = [],
    focusSnapshot = {},
    onCreateDoneLog = () => {},
    onOpenNote = () => {},
    onToggleDone = () => {},
    selectedTab = $bindable(/** @type {"log" | "calendar" | "stats"} */ (REVIEW_TAB_LOG)),
  } = $props();

  let calendarCursor = $state(new Date());
  let selectedCalendarDateKey = $state(getDateKey(new Date()));
  let isCreatingDoneLog = $state(false);
  let draftDoneLogText = $state("");
  let draftDoneLogCompletedAt = $state("");
  let selectedRangeKey = $state(REVIEW_RANGE_ALL);
  let selectedTag = $state("");
  let searchText = $state("");

  const todayDateKey = $derived(getDateKey(new Date()));
  const weekDateKeys = $derived(getRecentDateKeys(new Date(), 7));
  const doneLogs = $derived.by(() => getReviewRecords(notes));
  const reviewTagOptions = $derived.by(() => buildReviewTagOptions(doneLogs));
  const filteredDoneLogs = $derived.by(() =>
    filterReviewRecords(doneLogs, {
      rangeKey: selectedRangeKey,
      tag: selectedTag,
      searchText,
    }),
  );
  const hydratedRecords = $derived.by(() =>
    filteredDoneLogs.map((record) => ({
      ...record,
      completedLabel: formatReviewTimelineDateTime(record.completedAt),
      completedExactLabel: formatReviewDateTime(record.completedAt),
      dayLabel: formatReviewDayLabel(record.completedAt),
    })),
  );
  const todayDoneCount = $derived.by(() =>
    doneLogs.filter((record) => record.dateKey === todayDateKey).length,
  );
  const weekDoneCount = $derived.by(() => {
    const keys = new Set(weekDateKeys);
    return doneLogs.filter((record) => keys.has(record.dateKey)).length;
  });
  const recordStreakDays = $derived.by(() => computeRecordStreakDays(doneLogs, todayDateKey));
  const todayFocusMinutes = $derived.by(() => Number(focusSnapshot?.todayFocusMinutes || 0));
  const calendarMonthCells = $derived.by(() => buildReviewCalendarMonth(filteredDoneLogs, calendarCursor));
  const calendarWeekdayLabels = $derived([
    strings.weekdaySun,
    strings.weekdayMon,
    strings.weekdayTue,
    strings.weekdayWed,
    strings.weekdayThu,
    strings.weekdayFri,
    strings.weekdaySat,
  ]);
  const calendarMonthLabel = $derived.by(() => formatReviewMonthLabel(calendarCursor));
  const selectedCalendarRecords = $derived.by(() =>
    hydratedRecords.filter((record) => record.dateKey === selectedCalendarDateKey),
  );
  const rangeOptions = $derived([
    { value: REVIEW_RANGE_ALL, label: strings.workspaceReviewFiltersRangeAll },
    { value: REVIEW_RANGE_TODAY, label: strings.workspaceReviewFiltersRangeToday },
    { value: REVIEW_RANGE_LAST_7_DAYS, label: strings.workspaceReviewFiltersRangeLast7Days },
    { value: REVIEW_RANGE_LAST_30_DAYS, label: strings.workspaceReviewFiltersRangeLast30Days },
    { value: REVIEW_RANGE_THIS_MONTH, label: strings.workspaceReviewFiltersRangeThisMonth },
  ]);
  const hasActiveFilters = $derived.by(
    () => selectedRangeKey !== REVIEW_RANGE_ALL || !!selectedTag || !!String(searchText || "").trim(),
  );
  const resultsSummary = $derived.by(() => `${hydratedRecords.length} ${strings.workspaceReviewFiltersResultCountSuffix}`);
  const selectedCalendarLabel = $derived.by(() => {
    if (selectedCalendarRecords.length > 0) {
      return selectedCalendarRecords[0].dayLabel;
    }
    if (!selectedCalendarDateKey) return strings.workspaceReviewCalendarInspectorEmptyTitle;
    return formatReviewDayLabel(`${selectedCalendarDateKey}T12:00:00`);
  });
  const reviewTabs = $derived([
    { key: REVIEW_TAB_LOG, label: strings.workspaceReviewTabLog },
    { key: REVIEW_TAB_CALENDAR, label: strings.workspaceReviewTabCalendar },
    { key: REVIEW_TAB_STATS, label: strings.workspaceReviewTabStats },
  ]);

  const inspectorTitle = $derived.by(() => {
    if (selectedTab === REVIEW_TAB_CALENDAR) {
      return selectedCalendarRecords.length > 0
        ? selectedCalendarLabel
        : strings.workspaceReviewCalendarInspectorEmptyTitle;
    }
    if (selectedTab === REVIEW_TAB_STATS) return strings.workspaceReviewStatsInspectorTitle;
    return strings.workspaceReviewCalendarInspectorTitle;
  });

  const inspectorBody = $derived.by(() => {
    if (selectedTab === REVIEW_TAB_CALENDAR) {
      return selectedCalendarRecords.length > 0
        ? strings.workspaceReviewCalendarInspectorSelectedBody
        : strings.workspaceReviewCalendarInspectorBody;
    }
    if (selectedTab === REVIEW_TAB_STATS) return strings.workspaceReviewStatsInspectorBody;
    return strings.workspaceReviewCalendarInspectorBody;
  });

  /**
   * @param {Date} date
   * @param {number} count
   */
  function getRecentDateKeys(date, count) {
    return Array.from({ length: count }, (_, index) => {
      const next = new Date(date);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() - index);
      return getDateKey(next);
    });
  }

  /**
   * @param {any[]} items
   * @param {string} todayKey
   */
  function computeRecordStreakDays(items, todayKey) {
    const dateKeys = new Set(items.map((item) => item.dateKey).filter(Boolean));
    if (!dateKeys.has(todayKey)) return 0;
    let streak = 0;
    const cursor = new Date(todayKey);
    while (true) {
      const key = getDateKey(cursor);
      if (!dateKeys.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /** @param {string} dateKey */
  function handleSelectCalendarDate(dateKey) {
    selectedCalendarDateKey = dateKey;
  }

  function showPreviousMonth() {
    const next = new Date(calendarCursor);
    next.setMonth(next.getMonth() - 1);
    calendarCursor = next;
  }

  function showNextMonth() {
    const next = new Date(calendarCursor);
    next.setMonth(next.getMonth() + 1);
    calendarCursor = next;
  }

  /** @param {string} dateKey */
  function openCalendarForDateKey(dateKey) {
    const safeKey = String(dateKey || "").trim();
    if (!safeKey) return;
    selectedCalendarDateKey = safeKey;
    calendarCursor = new Date(`${safeKey}T12:00:00`);
    selectedTab = REVIEW_TAB_CALENDAR;
  }

  function formatDateTimeLocalValue(date = new Date()) {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  function startDoneLogDraft() {
    isCreatingDoneLog = true;
    if (!String(draftDoneLogCompletedAt || "").trim()) {
      draftDoneLogCompletedAt = formatDateTimeLocalValue(new Date());
    }
  }

  function cancelDoneLogDraft() {
    isCreatingDoneLog = false;
    draftDoneLogText = "";
    draftDoneLogCompletedAt = "";
  }

  function normalizeDraftDoneLogCompletedAt() {
    const raw = String(draftDoneLogCompletedAt || "").trim();
    if (!raw) return null;
    const next = new Date(raw);
    if (Number.isNaN(next.getTime())) return null;
    return next.toISOString();
  }

  async function submitDoneLog() {
    const text = String(draftDoneLogText || "").trim();
    if (!text) return;
    const completedAt = normalizeDraftDoneLogCompletedAt();
    await onCreateDoneLog(text, [], completedAt);
    cancelDoneLogDraft();
  }

  function clearFilters() {
    selectedRangeKey = REVIEW_RANGE_ALL;
    selectedTag = "";
    searchText = "";
  }

  /** @param {string} tag */
  function handleSelectTagFromCard(tag) {
    const next = String(tag || "").trim();
    if (!next) return;
    selectedTag = selectedTag === next ? "" : next;
  }

  $effect(() => {
    const records = hydratedRecords;
    if (records.length === 0) {
      selectedCalendarDateKey = todayDateKey;
      return;
    }
    if (!records.some((record) => record.dateKey === selectedCalendarDateKey)) {
      const nextDateKey = records[0].dateKey;
      selectedCalendarDateKey = nextDateKey;
      calendarCursor = new Date(`${nextDateKey}T12:00:00`);
    }
  });
</script>

<section class="review-hub" data-no-drag="true">
  <header class="review-summary">
    <div class="summary-item">
      <span class="summary-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8.4"></circle>
          <path d="M12 7.6V12l3 1.8"></path>
        </svg>
      </span>
      <div class="summary-copy">
        <strong>{todayFocusMinutes}m</strong>
        <span>{strings.workspaceReviewSummaryTodayFocus}</span>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8.4"></circle>
          <path d="m8.6 12.2 2.3 2.3 4.5-4.7"></path>
        </svg>
      </span>
      <div class="summary-copy">
        <strong>{todayDoneCount}</strong>
        <span>{strings.workspaceReviewSummaryTodayDone}</span>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="5.5" width="16" height="14.5" rx="2.4"></rect>
          <path d="M4 10h16M8.6 3.6v3.4M15.4 3.6v3.4"></path>
          <path d="m9.6 14.6 1.8 1.8 3.4-3.5"></path>
        </svg>
      </span>
      <div class="summary-copy">
        <strong>{weekDoneCount}</strong>
        <span>{strings.workspaceReviewSummaryWeekDone}</span>
      </div>
    </div>
    <div class="summary-item">
      <span class="summary-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3.6c.8 2.6-.9 4-2.1 5.4-1.3 1.5-2.5 3-2.5 5.3A6.4 6.4 0 0 0 12 20.6a6.4 6.4 0 0 0 6.6-6.3c0-3.4-2.3-5.1-3.6-7-.6 1-.9 2.2-.6 3.4-1.5-1.5-2.6-4.2-2.4-7.1z"></path>
        </svg>
      </span>
      <div class="summary-copy">
        <strong>{recordStreakDays}d</strong>
        <span>{strings.workspaceReviewSummaryStreak}</span>
      </div>
    </div>
  </header>

  <div class="review-controls">
    <div class="review-tabs" role="tablist" aria-label={strings.workspaceTabReview}>
      {#each reviewTabs as tab (tab.key)}
        <button
          type="button"
          role="tab"
          class="review-tab-btn"
          class:active={selectedTab === tab.key}
          aria-selected={selectedTab === tab.key}
          onclick={() => (selectedTab = tab.key)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    {#if selectedTab !== REVIEW_TAB_STATS}
      <WorkspaceReviewFilters
        {strings}
        {rangeOptions}
        selectedRange={selectedRangeKey}
        {selectedTag}
        tagOptions={reviewTagOptions}
        {searchText}
        onSelectRange={(/** @type {string} */ value) => (selectedRangeKey = value)}
        onSelectTag={(/** @type {string} */ value) => (selectedTag = value)}
        onChangeSearch={(/** @type {string} */ value) => (searchText = value)}
        onClear={clearFilters}
      />
    {/if}
  </div>

  <div
    class="review-shell"
    class:single-pane={selectedTab === REVIEW_TAB_LOG || selectedTab === REVIEW_TAB_STATS}
  >
    <section class="review-main-card">
      {#if selectedTab === REVIEW_TAB_LOG}
        <div class="review-log-stage">
          <div class="log-head">
            <h3>{strings.workspaceReviewLogTitle}</h3>
            <span class="results-summary">{resultsSummary}</span>
            {#if hasActiveFilters}
              <span class="active-filter-chip">{strings.workspaceReviewFiltersActive}</span>
            {/if}
            <button type="button" class="composer-btn" onclick={() => startDoneLogDraft()}>
              {strings.workspaceReviewCreateAction}
            </button>
          </div>
          {#if isCreatingDoneLog}
            <div class="done-log-draft-card">
              <div class="draft-card-head">
                <strong>{strings.workspaceReviewDraftTitle}</strong>
                <span>{strings.workspaceReviewDraftHint}</span>
              </div>
              <div class="draft-card-grid">
                <label class="draft-field draft-field-main">
                  <span>{strings.workspaceReviewDraftContentLabel}</span>
                  <textarea
                    class="draft-textarea"
                    bind:value={draftDoneLogText}
                    placeholder={strings.workspaceReviewCreatePlaceholder}
                    rows="3"
                  ></textarea>
                </label>
                <label class="draft-field">
                  <span>{strings.workspaceReviewDraftCompletedAtLabel}</span>
                  <input
                    type="datetime-local"
                    class="draft-datetime-input"
                    bind:value={draftDoneLogCompletedAt}
                  />
                </label>
              </div>
              <div class="draft-card-actions">
                <button type="button" class="inspector-btn" onclick={() => cancelDoneLogDraft()}>
                  {strings.cancel}
                </button>
                <button type="button" class="inspector-btn primary" onclick={() => submitDoneLog()}>
                  {strings.workspaceReviewDraftSaveAction}
                </button>
              </div>
            </div>
          {/if}
          <WorkspaceReviewLogList
            {strings}
            records={hydratedRecords}
            isFiltered={hasActiveFilters}
            onOpenCalendarDay={openCalendarForDateKey}
            {onOpenNote}
            {onToggleDone}
            {selectedTag}
            onSelectTag={handleSelectTagFromCard}
          />
        </div>
      {:else if selectedTab === REVIEW_TAB_CALENDAR}
        <WorkspaceReviewCalendar
          {strings}
          monthLabel={calendarMonthLabel}
          weekdayLabels={calendarWeekdayLabels}
          cells={calendarMonthCells}
          {todayDateKey}
          selectedDateKey={selectedCalendarDateKey}
          onSelectDate={handleSelectCalendarDate}
          onPrevMonth={showPreviousMonth}
          onNextMonth={showNextMonth}
        />
      {:else}
        <div class="review-stats-panel">
          <div class="review-stats-head">
            <div class="review-stats-copy">
              <div class="review-stats-title-row">
                <h3>{strings.workspaceReviewStatsTitle}</h3>
                <HelpTip
                  text={strings.workspaceReviewStatsHelpTip}
                  ariaLabel={strings.workspaceReviewStatsInspectorTitle}
                />
              </div>
              <p>{strings.workspaceReviewStatsBody}</p>
            </div>
          </div>
          <WorkspaceFocusStats
            {strings}
            todayFocusMinutes={Number(focusSnapshot?.todayFocusMinutes || 0)}
            todayPomodoros={Number(focusSnapshot?.todayPomodoros || 0)}
            todayTaskCount={Number(focusSnapshot?.todayTaskCount || 0)}
            todayTaskCycles={Number(focusSnapshot?.todayTaskCycles || 0)}
            weekFocusMinutes={Number(focusSnapshot?.weekFocusMinutes || 0)}
            weekPomodoros={Number(focusSnapshot?.weekPomodoros || 0)}
            weekAverageMinutes={Number(focusSnapshot?.weekAverageMinutes || 0)}
            streakDays={Number(focusSnapshot?.streakDays || 0)}
            bestDayDateKey={String(focusSnapshot?.bestDayDateKey || "")}
            bestDayMinutes={Number(focusSnapshot?.bestDayMinutes || 0)}
            heatmapCells={Array.isArray(focusSnapshot?.heatmapCells) ? focusSnapshot.heatmapCells : []}
            taskDistribution={Array.isArray(focusSnapshot?.taskDistribution) ? focusSnapshot.taskDistribution : []}
            taskRollups={Array.isArray(focusSnapshot?.taskRollups) ? focusSnapshot.taskRollups : []}
            currentMinutes={Number(focusSnapshot?.currentMinutes || 0)}
          />
        </div>
      {/if}
    </section>

    {#if selectedTab === REVIEW_TAB_CALENDAR}
      <aside class="review-inspector-card">
        <div class="inspector-head">
          <span class="inspector-kicker">{strings.details}</span>
          <h3>{inspectorTitle}</h3>
        </div>
        <p>{inspectorBody}</p>
        <div class="calendar-inspector-list">
          {#if selectedCalendarRecords.length === 0}
            <div class="calendar-empty">{strings.workspaceReviewCalendarInspectorEmptyBody}</div>
          {:else}
            {#each selectedCalendarRecords as record (record.id)}
              <button type="button" class="calendar-record" onclick={() => onOpenNote(record.note)}>
                <strong>{record.title}</strong>
                <span>{record.completedLabel}</span>
              </button>
            {/each}
          {/if}
        </div>
      </aside>
    {/if}
  </div>
</section>

<style>
  .review-hub {
    min-height: 0;
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .review-summary,
  .review-main-card,
  .review-inspector-card {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 88%, transparent);
    border-radius: 14px;
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
  }

  /* One stat strip instead of four separate cards: cells divided by hairlines. */
  .review-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .summary-item {
    position: relative;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 16px;
  }

  .summary-item:not(:first-child)::before {
    content: "";
    position: absolute;
    left: 0;
    top: 22%;
    bottom: 22%;
    width: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 90%, transparent);
  }

  .summary-icon {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: inline-grid;
    place-items: center;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    color: var(--ws-accent, #2563eb);
  }

  .summary-copy {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .summary-copy strong {
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--ws-text-strong, #101828);
    line-height: 1.15;
  }

  .summary-copy span {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ws-muted, #71809b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .review-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .review-controls :global(.review-filters) {
    flex: 1 1 320px;
    min-width: 0;
  }

  @media (max-width: 1100px) {
    .review-controls :global(.review-filters) {
      flex-basis: 100%;
    }
  }

  .review-tabs {
    flex: 0 0 auto;
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 12%, transparent);
  }

  .review-tab-btn {
    min-height: 30px;
    min-width: 76px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--ws-text, #3a4557);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease;
  }

  .review-tab-btn:hover {
    color: var(--ws-text-strong, #101828);
  }

  .review-tab-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .review-tab-btn.active {
    background: var(--ws-card-bg, #ffffff);
    color: var(--ws-text-strong, #101828);
    font-weight: 700;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.05));
  }

  .review-shell {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
    gap: 8px;
  }

  .review-shell.single-pane {
    grid-template-columns: minmax(0, 1fr);
  }

  .review-main-card,
  .review-inspector-card {
    min-height: clamp(360px, 56vh, 720px);
    padding: 16px 18px;
    border-radius: 16px;
  }

  .review-main-card {
    display: flex;
  }

  .review-stats-panel,
  .review-log-stage,
  .review-main-card :global(.log-list),
  .review-main-card :global(.calendar-shell) {
    width: 100%;
    display: grid;
    gap: 12px;
    min-height: 0;
  }

  .review-log-stage {
    align-content: start;
  }

  .review-stats-head {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .log-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 80%, transparent);
  }

  .log-head h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ws-text-strong, #101828);
  }

  .results-summary {
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .active-filter-chip {
    min-height: 22px;
    padding: 0 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    color: var(--ws-accent, #2563eb);
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
  }

  .composer-btn {
    margin-left: auto;
    min-height: 32px;
    padding: 0 14px;
    border-radius: var(--ws-radius-sm, 8px);
    border: none;
    background: var(--ws-accent, #2563eb);
    color: #fff;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06));
    transition: background 0.16s ease, transform 0.12s ease;
  }

  .composer-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  .composer-btn:active {
    transform: scale(0.98);
  }

  .composer-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  :global(.workspace.theme-dark) .composer-btn {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  :global(.workspace.theme-dark) .composer-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 32%, transparent);
  }

  .done-log-draft-card {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: var(--ws-radius-md, 12px);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #2563eb) 22%, var(--ws-border-soft, #e7ecf5));
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 4%, var(--ws-card-bg, #ffffff));
  }

  .draft-card-head {
    display: grid;
    gap: 4px;
  }

  .draft-card-head strong {
    color: var(--ws-text-strong, #101828);
    font-size: 14px;
  }

  .draft-card-head span {
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    line-height: 1.5;
  }

  .draft-card-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
    gap: 12px;
    align-items: start;
  }

  .draft-field {
    display: grid;
    gap: 6px;
  }

  .draft-field span {
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    font-weight: 600;
  }

  .draft-field-main {
    min-width: 0;
  }

  .draft-textarea,
  .draft-datetime-input {
    width: 100%;
    min-height: 40px;
    border-radius: 10px;
    border: 1px solid var(--ws-input-border, #dfe6f0);
    background: var(--ws-input-bg, #ffffff);
    color: var(--ws-input-text, #101828);
    font-size: 13.5px;
    padding: 10px 12px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .draft-textarea:focus,
  .draft-datetime-input:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-input-border, #dfe6f0));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .draft-textarea {
    min-height: 100px;
    resize: vertical;
  }

  .draft-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  @media (max-width: 1080px) {
    .draft-card-grid {
      grid-template-columns: 1fr;
    }
  }

  .review-stats-copy {
    display: grid;
    gap: 8px;
  }

  .review-stats-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .review-stats-title-row h3,
  .review-inspector-card h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ws-text-strong, #101828);
  }

  .review-stats-copy p,
  .review-inspector-card p,
  .inspector-kicker {
    margin: 0;
    color: var(--ws-muted, #71809b);
    line-height: 1.65;
    font-size: 13px;
  }

  .review-inspector-card {
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .inspector-head {
    display: grid;
    gap: 6px;
  }

  .inspector-kicker {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 11px;
    font-weight: 700;
  }

  .inspector-btn {
    min-height: 32px;
    padding: 0 14px;
    border-radius: var(--ws-radius-sm, 8px);
    border: 1px solid var(--ws-border, #e3e9f2);
    background: transparent;
    color: var(--ws-text, #3a4557);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }

  .inspector-btn:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 8%, transparent);
    color: var(--ws-text-strong, #101828);
  }

  .inspector-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .inspector-btn.primary {
    border: none;
    background: var(--ws-accent, #2563eb);
    color: #fff;
    font-weight: 700;
  }

  .inspector-btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  :global(.workspace.theme-dark) .inspector-btn.primary {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  :global(.workspace.theme-dark) .inspector-btn.primary:hover {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 32%, transparent);
  }

  .calendar-inspector-list {
    display: grid;
    gap: 8px;
  }

  .calendar-record,
  .calendar-empty {
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 88%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 5%, transparent);
    padding: 10px 12px;
  }

  .calendar-record {
    display: grid;
    gap: 4px;
    text-align: left;
    cursor: pointer;
    transition: background 0.16s ease, border-color 0.16s ease;
  }

  .calendar-record:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 8%, transparent);
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 24%, transparent);
  }

  .calendar-record:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .calendar-record strong {
    color: var(--ws-text-strong, #101828);
    font-size: 13.5px;
  }

  .calendar-record span,
  .calendar-empty {
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 1100px) {
    .review-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .summary-item:not(:first-child)::before {
      display: none;
    }

    .summary-item:nth-child(even)::before {
      display: block;
    }

    .summary-item:nth-child(n + 3) {
      border-top: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 90%, transparent);
    }

    .review-shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .review-main-card,
    .review-inspector-card {
      min-height: auto;
    }
  }
</style>
