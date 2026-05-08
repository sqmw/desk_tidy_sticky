<script>
  import WorkspaceFocusStats from "$lib/components/workspace/pomodoro/WorkspaceFocusStats.svelte";

  const REVIEW_TAB_LOG = "log";
  const REVIEW_TAB_CALENDAR = "calendar";
  const REVIEW_TAB_STATS = "stats";

  let {
    strings,
    notes = [],
    focusSnapshot = {},
    selectedTab = $bindable(/** @type {"log" | "calendar" | "stats"} */ (REVIEW_TAB_LOG)),
  } = $props();

  const todayDateKey = $derived(getDateKey(new Date()));
  const weekDateKeys = $derived(getRecentDateKeys(new Date(), 7));
  const doneLogs = $derived.by(() =>
    (Array.isArray(notes) ? notes : []).filter((note) => resolveRecordKind(note) === "done_log"),
  );
  const todayDoneCount = $derived.by(() =>
    doneLogs.filter((note) => getRecordDateKey(note) === todayDateKey).length,
  );
  const weekDoneCount = $derived.by(() => {
    const keys = new Set(weekDateKeys);
    return doneLogs.filter((note) => keys.has(getRecordDateKey(note))).length;
  });
  const recordStreakDays = $derived.by(() => computeRecordStreakDays(doneLogs, todayDateKey));
  const todayFocusMinutes = $derived.by(() => Number(focusSnapshot?.todayFocusMinutes || 0));

  const reviewTabs = $derived([
    { key: REVIEW_TAB_LOG, label: strings.workspaceReviewTabLog },
    { key: REVIEW_TAB_CALENDAR, label: strings.workspaceReviewTabCalendar },
    { key: REVIEW_TAB_STATS, label: strings.workspaceReviewTabStats },
  ]);

  const inspectorTitle = $derived.by(() => {
    if (selectedTab === REVIEW_TAB_CALENDAR) return strings.workspaceReviewCalendarInspectorTitle;
    if (selectedTab === REVIEW_TAB_STATS) return strings.workspaceReviewStatsInspectorTitle;
    return strings.workspaceReviewLogInspectorTitle;
  });

  const inspectorBody = $derived.by(() => {
    if (selectedTab === REVIEW_TAB_CALENDAR) return strings.workspaceReviewCalendarInspectorBody;
    if (selectedTab === REVIEW_TAB_STATS) return strings.workspaceReviewStatsInspectorBody;
    return strings.workspaceReviewLogInspectorBody;
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

  /** @param {Date} date */
  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /** @param {any} note */
  function resolveRecordKind(note) {
    return String(note?.recordKind || note?.record_kind || "note");
  }

  /** @param {any} note */
  function getRecordDateKey(note) {
    const raw = String(note?.completedAt || note?.completed_at || "").trim();
    if (raw.length >= 10) return raw.slice(0, 10);
    return "";
  }

  /**
   * @param {any[]} items
   * @param {string} todayKey
   */
  function computeRecordStreakDays(items, todayKey) {
    const dateKeys = new Set(items.map(getRecordDateKey).filter(Boolean));
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

  <div class="review-shell">
    <section class="review-main-card">
      {#if selectedTab === REVIEW_TAB_LOG}
        <div class="review-placeholder">
          <div class="placeholder-badge">{strings.workspaceReviewStageBadge}</div>
          <h3>{strings.workspaceReviewLogTitle}</h3>
          <p>{strings.workspaceReviewLogBody}</p>
        </div>
      {:else if selectedTab === REVIEW_TAB_CALENDAR}
        <div class="review-placeholder">
          <div class="placeholder-badge">{strings.workspaceReviewStageBadge}</div>
          <h3>{strings.workspaceReviewCalendarTitle}</h3>
          <p>{strings.workspaceReviewCalendarBody}</p>
        </div>
      {:else}
        <div class="review-stats-panel">
          <div class="review-stats-head">
            <div class="placeholder-badge">{strings.workspaceReviewStageBadge}</div>
            <div class="review-stats-copy">
              <h3>{strings.workspaceReviewStatsTitle}</h3>
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

    <aside class="review-inspector-card">
      <div class="inspector-head">
        <span class="inspector-kicker">{strings.details}</span>
        <h3>{inspectorTitle}</h3>
      </div>
      <p>{inspectorBody}</p>
      <div class="inspector-phase">
        <strong>{strings.workspaceReviewCurrentPhase}</strong>
        <span>{strings.workspaceReviewCurrentPhaseBody}</span>
      </div>
    </aside>
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
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 13px;
    font-weight: 700;
    transition: all 0.16s ease;
  }

  .review-tab-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .review-tab-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .review-shell {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
    gap: 8px;
  }

  .review-main-card,
  .review-inspector-card {
    min-height: clamp(360px, 56vh, 720px);
    padding: 18px;
  }

  .review-main-card {
    display: flex;
  }

  .review-stats-panel {
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

  .review-stats-copy {
    display: grid;
    gap: 8px;
  }

  .review-placeholder {
    width: 100%;
    border: 1px dashed color-mix(in srgb, var(--ws-border-active, #94a3b8) 52%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--ws-card-bg, #fff) 90%, transparent);
    display: grid;
    align-content: start;
    gap: 12px;
    padding: 22px;
  }

  .placeholder-badge {
    justify-self: start;
    border-radius: 999px;
    padding: 5px 10px;
    background: var(--ws-badge-bg, #e8f0ff);
    border: 1px solid var(--ws-badge-border, #d7e5ff);
    color: var(--ws-accent, #1d4ed8);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .review-placeholder h3,
  .review-inspector-card h3 {
    margin: 0;
    font-size: clamp(18px, 1.2vw, 24px);
    color: var(--ws-text-strong, #0f172a);
  }

  .review-placeholder p,
  .review-inspector-card p,
  .inspector-phase span,
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

  .inspector-phase {
    display: grid;
    gap: 8px;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-card-bg, #fff);
  }

  .inspector-phase strong {
    font-size: 13px;
    color: var(--ws-text-strong, #0f172a);
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
