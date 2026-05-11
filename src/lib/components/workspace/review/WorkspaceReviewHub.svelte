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

  let selectedRecordId = $state("");
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
      completedLabel: formatReviewDateTime(record.completedAt),
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
  const selectedRecord = $derived.by(
    () => hydratedRecords.find((record) => record.id === selectedRecordId) || hydratedRecords[0] || null,
  );
  const calendarMonthCells = $derived.by(() => buildReviewCalendarMonth(doneLogs, calendarCursor));
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
    return selectedRecord?.title || strings.workspaceReviewLogInspectorTitle;
  });

  const inspectorBody = $derived.by(() => {
    if (selectedTab === REVIEW_TAB_CALENDAR) {
      return selectedCalendarRecords.length > 0
        ? strings.workspaceReviewCalendarInspectorSelectedBody
        : strings.workspaceReviewCalendarInspectorBody;
    }
    if (selectedTab === REVIEW_TAB_STATS) return strings.workspaceReviewStatsInspectorBody;
    return selectedRecord?.excerpt || strings.workspaceReviewLogInspectorBody;
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

  $effect(() => {
    const records = hydratedRecords;
    if (records.length === 0) {
      selectedRecordId = "";
      return;
    }
    if (!records.some((record) => record.id === selectedRecordId)) {
      selectedRecordId = records[0].id;
    }
  });

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
    <div class="summary-card">
      <span>{strings.workspaceReviewSummaryTodayFocus}</span>
      <strong>{todayFocusMinutes}m</strong>
    </div>
    <div class="summary-card">
      <span>{strings.workspaceReviewSummaryTodayDone}</span>
      <strong>{todayDoneCount}</strong>
    </div>
    <div class="summary-card">
      <span>{strings.workspaceReviewSummaryWeekDone}</span>
      <strong>{weekDoneCount}</strong>
    </div>
    <div class="summary-card">
      <span>{strings.workspaceReviewSummaryStreak}</span>
      <strong>{recordStreakDays}d</strong>
    </div>
  </header>

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
      matchedCount={hydratedRecords.length}
      onSelectRange={(/** @type {string} */ value) => (selectedRangeKey = value)}
      onSelectTag={(/** @type {string} */ value) => (selectedTag = value)}
      onChangeSearch={(/** @type {string} */ value) => (searchText = value)}
      onClear={clearFilters}
    />
  {/if}

  <div class="review-shell" class:stats-mode={selectedTab === REVIEW_TAB_STATS}>
    <section class="review-main-card">
      {#if selectedTab === REVIEW_TAB_LOG}
        <div class="review-log-stage">
          <div class="done-log-composer">
            <div class="composer-head">
              <div class="composer-copy">
                <div class="section-badge">{strings.workspaceReviewLogBadge}</div>
                <div>
                  <h3>{strings.workspaceReviewLogTitle}</h3>
                  <p>{strings.workspaceReviewLogBody}</p>
                </div>
              </div>
              <button type="button" class="composer-btn" onclick={() => startDoneLogDraft()}>
                {strings.workspaceReviewCreateAction}
              </button>
            </div>
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
            {selectedRecordId}
            onSelect={(/** @type {string} */ id) => (selectedRecordId = id)}
            {onOpenNote}
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

    {#if selectedTab !== REVIEW_TAB_STATS}
      <aside class="review-inspector-card">
        <div class="inspector-head">
          <span class="inspector-kicker">{strings.details}</span>
          <h3>{inspectorTitle}</h3>
        </div>
        {#if selectedTab === REVIEW_TAB_LOG && selectedRecord}
          <p>{inspectorBody}</p>
          <div class="inspector-record-meta">
            <span>{selectedRecord.dayLabel}</span>
            <span>{selectedRecord.completedLabel}</span>
          </div>
          {#if selectedRecord.tags.length > 0}
            <div class="inspector-tags">
              {#each selectedRecord.tags as tag (tag)}
                <span>{tag}</span>
              {/each}
            </div>
          {/if}
          <div class="inspector-actions">
            <button
              type="button"
              class="inspector-btn"
              onclick={() => openCalendarForDateKey(selectedRecord.dateKey)}
            >
              {strings.workspaceReviewOpenCalendarDay}
            </button>
            <button type="button" class="inspector-btn primary" onclick={() => onOpenNote(selectedRecord.note)}>
              {strings.workspaceReviewOpenSource}
            </button>
            <button type="button" class="inspector-btn" onclick={() => onToggleDone(selectedRecord.note)}>
              {strings.markUndone}
            </button>
          </div>
        {:else if selectedTab === REVIEW_TAB_LOG}
          <div class="inspector-empty-card">
            <p>{strings.workspaceReviewLogInspectorBody}</p>
          </div>
        {:else}
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
        {/if}
      </aside>
    {/if}
  </div>
</section>

<style>
  .review-hub {
    min-height: 0;
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .review-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .summary-card,
  .review-main-card,
  .review-inspector-card {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent), transparent 42%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.82)) 96%, transparent);
    backdrop-filter: blur(8px);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 72%, transparent),
      0 8px 22px color-mix(in srgb, #0f172a 8%, transparent);
  }

  .summary-card {
    padding: 12px 14px;
    display: grid;
    gap: 6px;
  }

  .summary-card span {
    font-size: 12px;
    color: var(--ws-muted, #64748b);
  }

  .summary-card strong {
    font-size: clamp(20px, 1.5vw, 26px);
    color: var(--ws-text-strong, #0f172a);
    line-height: 1;
  }

  .review-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .review-tab-btn {
    min-height: 38px;
    min-width: 92px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 76%, transparent),
      0 1px 2px color-mix(in srgb, #0f172a 4%, transparent);
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease,
      transform 0.16s ease;
  }

  .review-tab-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  .review-tab-btn.active {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 42%, var(--ws-border-active, #94a3b8));
    color: var(--ws-accent-strong, #163ea8);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 9%, #eef4ff) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 0 0 1px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent),
      0 10px 24px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .review-shell {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
    gap: 8px;
  }

  .review-shell.stats-mode {
    grid-template-columns: minmax(0, 1fr);
  }

  .review-main-card,
  .review-inspector-card {
    min-height: clamp(360px, 56vh, 720px);
    padding: 18px;
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

  .review-stats-head {
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .done-log-composer {
    display: grid;
    gap: 10px;
    padding: 0 0 6px;
  }

  .composer-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .composer-copy {
    display: grid;
    gap: 10px;
  }

  .composer-copy h3,
  .composer-copy p {
    margin: 0;
  }

  .composer-copy h3 {
    font-size: 19px;
    color: var(--ws-text-strong, #0f172a);
  }

  .composer-copy p {
    color: var(--ws-muted, #64748b);
    font-size: 13px;
    line-height: 1.6;
  }

  .done-log-draft-card {
    display: grid;
    gap: 10px;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 7%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 3%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 8px 20px color-mix(in srgb, var(--ws-accent, #1d4ed8) 7%, transparent);
  }

  .draft-card-head {
    display: grid;
    gap: 4px;
  }

  .draft-card-head strong {
    color: var(--ws-text-strong, #0f172a);
    font-size: 14px;
  }

  .draft-card-head span {
    color: var(--ws-muted, #64748b);
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
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    font-weight: 700;
  }

  .draft-field-main {
    min-width: 0;
  }

  .draft-textarea,
  .draft-datetime-input {
    width: 100%;
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 14px;
    padding: 12px 14px;
    outline: none;
    box-sizing: border-box;
  }

  .draft-textarea {
    min-height: 110px;
    resize: vertical;
  }

  .composer-btn {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, #fff);
    color: var(--ws-accent, #1d4ed8);
    font-size: 13px;
    font-weight: 800;
  }

  .draft-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  @media (max-width: 1080px) {
    .draft-card-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .composer-head {
      flex-direction: column;
      align-items: stretch;
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

  .section-badge {
    justify-self: start;
    border-radius: 999px;
    padding: 5px 10px;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 20%, var(--ws-border-soft, #d9e2ef));
    color: var(--ws-accent, #1d4ed8);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .review-inspector-card h3 {
    margin: 0;
    font-size: clamp(18px, 1.2vw, 24px);
    color: var(--ws-text-strong, #0f172a);
  }

  .review-stats-copy p,
  .review-inspector-card p,
  .inspector-kicker {
    margin: 0;
    color: var(--ws-muted, #64748b);
    line-height: 1.65;
    font-size: 13px;
  }

  .review-inspector-card {
    display: grid;
    align-content: start;
    gap: 14px;
  }

  .inspector-empty-card {
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 96%, transparent);
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

  .inspector-record-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
  }

  .inspector-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .inspector-tags span {
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-accent, #1d4ed8);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, var(--ws-border-soft, #d9e2ef));
  }

  .inspector-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .inspector-btn {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
  }

  .inspector-btn.primary {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    color: var(--ws-accent, #1d4ed8);
  }

  .calendar-inspector-list {
    display: grid;
    gap: 8px;
  }

  .calendar-record,
  .calendar-empty {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 12px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 96%, transparent);
    padding: 10px 12px;
  }

  .calendar-record {
    display: grid;
    gap: 4px;
    text-align: left;
  }

  .calendar-record strong {
    color: var(--ws-text-strong, #0f172a);
    font-size: 14px;
  }

  .calendar-record span,
  .calendar-empty {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 1100px) {
    .review-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
