<script>
  import {
    WORKSPACE_INITIAL_VIEW_MODES,
    WORKSPACE_MAIN_TAB_NOTES,
    WORKSPACE_NOTE_VIEW_ACTIVE,
    WORKSPACE_NOTE_VIEW_ARCHIVED,
    WORKSPACE_NOTE_VIEW_QUADRANT,
    WORKSPACE_NOTE_VIEW_TODO,
    WORKSPACE_NOTE_VIEW_TRASH,
    getWorkspaceInitialViewModeLabel,
    getWorkspaceMainTabDefs,
    getWorkspaceViewModeLabel,
  } from "$lib/workspace/workspace-tabs.js";
  import {
    calcSidebarManualSplitRatioFromPointer,
    DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT,
    DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO,
    DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT,
    resolveSidebarManualSplitHeights,
  } from "$lib/workspace/sidebar/manual-split-layout.js";
  const MANUAL_BOTTOM_CARD_GAP = 8;

  let {
    strings,
    mainTab = /** @type {string} */ (WORKSPACE_MAIN_TAB_NOTES),
    viewModes,
    viewMode,
    sortMode = "custom",
    sortModes = [],
    initialViewMode = "last",
    noteViewCounts = {},
    collapsed = false,
    compact = false,
    sidebarLayoutMode = "auto",
    sidebarManualSplitRatio = 0.42,
    viewSectionMaxHeight = 240,
    deadlineSectionMaxHeight = 320,
    onSidebarManualSplitRatioInput = () => {},
    onSidebarManualSplitRatioCommit = () => {},
    onDragStart,
    onSetMainTab,
    onSetViewMode,
    onSetSortMode = () => {},
    onSetSelectedTag = () => {},
    onSetInitialViewMode = () => {},
    stickiesVisible,
    interactionDisabled = false,
    focusDeadlines = [],
    noteTags = [],
    selectedTag = "",
    taggedNoteCount = 0,
    onDeadlineAction = () => {},
    onToggleStickiesVisibility,
    onToggleInteraction,
  } = $props();

  const mainTabs = $derived(getWorkspaceMainTabDefs(strings));

  const PRIMARY_VIEW_MODES = [WORKSPACE_NOTE_VIEW_ACTIVE, WORKSPACE_NOTE_VIEW_TODO, WORKSPACE_NOTE_VIEW_QUADRANT];
  const SECONDARY_VIEW_MODES = [WORKSPACE_NOTE_VIEW_ARCHIVED, WORKSPACE_NOTE_VIEW_TRASH];
  const primaryViewModes = $derived(
    viewModes.filter((/** @type {string} */ mode) => PRIMARY_VIEW_MODES.includes(mode)),
  );
  const secondaryViewModes = $derived(
    viewModes.filter((/** @type {string} */ mode) => SECONDARY_VIEW_MODES.includes(mode)),
  );
  let noteFiltersCollapsed = $state(false);
  let deadlinesCollapsed = $state(false);
  let settingsCollapsed = $state(false);
  let modulesBlockEl = $state(/** @type {HTMLDivElement | null} */ (null));
  let modulesNaturalHeight = $state(0);
  let sidebarBodyEl = $state(/** @type {HTMLDivElement | null} */ (null));
  let sidebarBodyHeight = $state(0);
  let manualResizePointerId = $state(-1);
  let manualResizeDragging = $state(false);

  const manualLayoutEnabled = $derived(sidebarLayoutMode === "manual" && !collapsed);
  const manualResolvedRatio = $derived.by(() => {
    const savedRatio = Number(sidebarManualSplitRatio || DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO);
    const safeSavedRatio = Number.isFinite(savedRatio) ? savedRatio : DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO;
    const isDefaultRatio = Math.abs(safeSavedRatio - DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO) <= 0.0005;
    if (!manualLayoutEnabled || !isDefaultRatio) return safeSavedRatio;
    const trackHeight = Math.max(0, sidebarBodyHeight - DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT);
    if (trackHeight <= 0) return safeSavedRatio;
    const fallbackTop = DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT;
    const contentTop = modulesNaturalHeight > 0 ? modulesNaturalHeight : fallbackTop;
    const clampedTop = Math.max(
      DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT,
      Math.min(trackHeight - DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT, contentTop),
    );
    if (clampedTop <= 0) return safeSavedRatio;
    return Number((clampedTop / trackHeight).toFixed(4));
  });
  const manualSplit = $derived.by(() =>
    resolveSidebarManualSplitHeights({
      bodyHeight: sidebarBodyHeight,
      ratio: manualResolvedRatio,
      splitterHeight: DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT,
      minSectionHeight: DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT,
    }),
  );
  const manualTopBlockStyle = $derived.by(() =>
    manualLayoutEnabled ? `--manual-block-height:${manualSplit.topHeight}px;` : "",
  );
  const manualBottomBlockHeight = $derived.by(() =>
    manualLayoutEnabled ? manualSplit.bottomHeight : 0,
  );
  const manualBottomCardHeight = $derived.by(() =>
    manualLayoutEnabled ? Math.max(0, manualBottomBlockHeight - MANUAL_BOTTOM_CARD_GAP) : 0,
  );
  const manualSectionMaxHeight = $derived.by(() =>
    manualLayoutEnabled ? Math.max(40, Math.round(manualBottomCardHeight - 56)) : 0,
  );
  const noteFiltersBlockStyle = $derived.by(() =>
    manualLayoutEnabled
      ? `--section-max-height:${manualSectionMaxHeight}px;--manual-block-height:${manualBottomCardHeight}px;`
      : `--section-max-height:${viewSectionMaxHeight}px;`,
  );
  const deadlineBlockStyle = $derived.by(() =>
    manualLayoutEnabled
      ? `--section-max-height:${manualSectionMaxHeight}px;--manual-block-height:${manualBottomCardHeight}px;`
      : `--section-max-height:${deadlineSectionMaxHeight}px;`,
  );

  function interactionLabel() {
    return interactionDisabled ? strings.trayInteractionStateOff : strings.trayInteractionStateOn;
  }

  /** @param {PointerEvent} event */
  function resolveManualRatioFromPointer(event) {
    if (!sidebarBodyEl) return Number(sidebarManualSplitRatio || 0.42);
    const rect = sidebarBodyEl.getBoundingClientRect();
    return calcSidebarManualSplitRatioFromPointer({
      clientY: event.clientY,
      bodyTop: rect.top,
      bodyHeight: rect.height,
      splitterHeight: DEFAULT_SIDEBAR_MANUAL_SPLITTER_HEIGHT,
      minSectionHeight: DEFAULT_SIDEBAR_MANUAL_MIN_SECTION_HEIGHT,
    });
  }

  function clearManualResizeState() {
    manualResizeDragging = false;
    manualResizePointerId = -1;
  }

  /** @param {PointerEvent} event */
  function startManualSectionResize(event) {
    if (!manualLayoutEnabled) return;
    if (event.button !== 0) return;
    manualResizeDragging = true;
    manualResizePointerId = event.pointerId;
    const handle = /** @type {HTMLElement | null} */ (event.currentTarget);
    handle?.setPointerCapture?.(event.pointerId);
    onSidebarManualSplitRatioInput(resolveManualRatioFromPointer(event));
    event.preventDefault();
  }

  /** @param {PointerEvent} event */
  function moveManualSectionResize(event) {
    if (!manualResizeDragging) return;
    if (manualResizePointerId !== -1 && event.pointerId !== manualResizePointerId) return;
    onSidebarManualSplitRatioInput(resolveManualRatioFromPointer(event));
  }

  /** @param {PointerEvent} event */
  function endManualSectionResize(event) {
    if (!manualResizeDragging) return;
    if (manualResizePointerId !== -1 && event.pointerId !== manualResizePointerId) return;
    const next = resolveManualRatioFromPointer(event);
    onSidebarManualSplitRatioInput(next);
    onSidebarManualSplitRatioCommit(next);
    clearManualResizeState();
  }

  /** @param {PointerEvent} event */
  function cancelManualSectionResize(event) {
    if (!manualResizeDragging) return;
    if (manualResizePointerId !== -1 && event.pointerId !== manualResizePointerId) return;
    clearManualResizeState();
  }

  $effect(() => {
    if (!modulesBlockEl) {
      modulesNaturalHeight = 0;
      return;
    }
    const updateNaturalHeight = () => {
      if (manualLayoutEnabled) return;
      modulesNaturalHeight = Math.max(0, Math.round(modulesBlockEl?.clientHeight || 0));
    };
    updateNaturalHeight();
    const observer = new ResizeObserver(updateNaturalHeight);
    observer.observe(modulesBlockEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!sidebarBodyEl) {
      sidebarBodyHeight = 0;
      return;
    }
    const updateBodyHeight = () => {
      sidebarBodyHeight = Math.max(0, Math.round(sidebarBodyEl?.clientHeight || 0));
    };
    updateBodyHeight();
    const observer = new ResizeObserver(updateBodyHeight);
    observer.observe(sidebarBodyEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (manualLayoutEnabled) return;
    if (!manualResizeDragging && manualResizePointerId === -1) return;
    clearManualResizeState();
  });

  /** @param {{ isOverdue: boolean; minutesLeft: number; started?: boolean; minutesUntilStart?: number }} item */
  function deadlineLabel(item) {
    if (item.isOverdue) return `${strings.workspaceDeadlineOverdue} ${Math.abs(item.minutesLeft)}m`;
    if (!item.started) return `${strings.workspaceDeadlineStartsIn} ${Math.max(0, item.minutesUntilStart ?? 0)}m`;
    return `${strings.workspaceDeadlineDueIn} ${Math.max(0, item.minutesLeft)}m`;
  }

  /** @param {{ isOverdue: boolean; started?: boolean }} item */
  function deadlineStateLabel(item) {
    if (item.isOverdue) return strings.workspaceDeadlineStateOverdue || strings.workspaceDeadlineOverdue;
    if (!item.started) return strings.workspaceDeadlineStateUpcoming || strings.workspaceDeadlineStartsIn;
    return strings.workspaceDeadlineStateRunning || strings.workspaceDeadlineDueIn;
  }

  /** @param {string} mode */
  function viewCount(mode) {
    const value = Number(noteViewCounts?.[mode] ?? 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.trunc(value));
  }

  /** @param {boolean} value */
  function sectionToggleIcon(value) {
    return value ? "▸" : "▾";
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<aside
  class="sidebar"
  class:collapsed
  class:compact
  class:auto-priority={sidebarLayoutMode === "auto"}
  class:manual-layout={manualLayoutEnabled}
  class:manual-resizing={manualResizeDragging}
>
  <div class="brand" data-drag-handle="workspace" onpointerdown={onDragStart}>
    <span class="brand-pill">{strings.workspaceBrandTag}</span>
    <h1>{collapsed ? "WS" : strings.workspaceTitle}</h1>
    {#if !collapsed}
      <p>{strings.workspaceHint}</p>
    {/if}
  </div>

  <div class="sidebar-body" bind:this={sidebarBodyEl}>
    <div class="sidebar-block modules-block" style={manualTopBlockStyle} bind:this={modulesBlockEl}>
      <div class="block-title">{collapsed ? "•" : strings.workspaceModules}</div>
      <div class="main-tabs">
        {#each mainTabs as tab (tab.key)}
          <button
            type="button"
            class="main-tab-btn"
            class:active={mainTab === tab.key}
            onclick={() => onSetMainTab(tab.key)}
            title={tab.label}
          >
            {collapsed ? tab.label.slice(0, 1) : tab.label}
          </button>
        {/each}
      </div>
    </div>
    {#if manualLayoutEnabled}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="section-height-splitter"
        title={strings.workspaceSidebarManualResizeHint || "Drag to resize sidebar sections"}
        onpointerdown={startManualSectionResize}
        onpointermove={moveManualSectionResize}
        onpointerup={endManualSectionResize}
        onpointercancel={cancelManualSectionResize}
      ></div>
    {/if}

    {#if mainTab === WORKSPACE_MAIN_TAB_NOTES}
      <div class="sidebar-block note-filters-block" style={noteFiltersBlockStyle}>
        <div class="sidebar-block-head">
          <div class="block-title">{collapsed ? "•" : strings.workspaceNoteFilters}</div>
          {#if compact && !collapsed}
            <button
              type="button"
              class="section-toggle"
              onclick={() => (noteFiltersCollapsed = !noteFiltersCollapsed)}
              aria-label={strings.workspaceNoteFilters}
            >
              {sectionToggleIcon(noteFiltersCollapsed)}
            </button>
          {/if}
        </div>
        {#if !compact || !noteFiltersCollapsed || collapsed}
          <div class="view-sections">
            <div class="view-list">
              {#each primaryViewModes as mode}
                <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
                  {#if collapsed}
                    <span title={getWorkspaceViewModeLabel(strings, mode)}>{getWorkspaceViewModeLabel(strings, mode).slice(0, 1)}</span>
                  {:else}
                    <span>{getWorkspaceViewModeLabel(strings, mode)}</span>
                    <span class="view-count">{viewCount(mode)}</span>
                  {/if}
                </button>
              {/each}
            </div>
            <div class="view-separator"></div>
            <div class="view-list view-list-secondary">
              {#each secondaryViewModes as mode}
                <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
                  {#if collapsed}
                    <span title={getWorkspaceViewModeLabel(strings, mode)}>{getWorkspaceViewModeLabel(strings, mode).slice(0, 1)}</span>
                  {:else}
                    <span>{getWorkspaceViewModeLabel(strings, mode)}</span>
                    <span class="view-count">{viewCount(mode)}</span>
                  {/if}
                </button>
              {/each}
            </div>
            {#if !collapsed}
              <div class="view-separator"></div>
              <div class="initial-view">
                <label class="initial-view-label" for="workspace-initial-view">{strings.workspaceInitialView}</label>
                <select
                  id="workspace-initial-view"
                  class="initial-view-select"
                  value={initialViewMode}
                  onchange={(e) => onSetInitialViewMode(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
                >
                  {#each WORKSPACE_INITIAL_VIEW_MODES as mode (mode)}
                    <option value={mode}>{getWorkspaceInitialViewModeLabel(strings, mode)}</option>
                  {/each}
                </select>
              </div>
              <div class="sort-control">
                <label class="initial-view-label" for="workspace-sort-mode">{strings.sortMode}</label>
                <select
                  id="workspace-sort-mode"
                  class="initial-view-select"
                  value={sortMode}
                  onchange={(e) => onSetSortMode(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
                >
                  {#each sortModes as mode (mode)}
                    <option value={mode}>
                      {mode === "newest" ? strings.sortByNewest : mode === "oldest" ? strings.sortByOldest : strings.sortByCustom}
                    </option>
                  {/each}
                </select>
              </div>
              <div class="view-separator"></div>
              <div class="tag-filter">
                <div class="initial-view-label">{strings.workspaceTagsFilter}</div>
                {#if noteTags.length === 0}
                  <div class="tag-empty">{strings.workspaceTagsEmpty}</div>
                {:else}
                  <div class="tag-list">
                    <button
                      type="button"
                      class="tag-filter-btn"
                      class:active={selectedTag === ""}
                      onclick={() => onSetSelectedTag("")}
                    >
                      <span>{strings.workspaceTagsAll}</span>
                      <span class="view-count">{taggedNoteCount}</span>
                    </button>
                    {#each noteTags as item (item.tag)}
                      <button
                        type="button"
                        class="tag-filter-btn"
                        class:active={selectedTag === item.tag}
                        onclick={() => onSetSelectedTag(item.tag)}
                        title={`#${item.tag}`}
                      >
                        <span class="tag-name">#{item.tag}</span>
                        <span class="view-count">{item.count}</span>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="sidebar-block deadline-block" style={deadlineBlockStyle}>
        <div class="sidebar-block-head">
          <div class="block-title">{collapsed ? "•" : strings.workspaceDeadlineTitle}</div>
          {#if compact && !collapsed}
            <button
              type="button"
              class="section-toggle"
              onclick={() => (deadlinesCollapsed = !deadlinesCollapsed)}
              aria-label={strings.workspaceDeadlineTitle}
            >
              {sectionToggleIcon(deadlinesCollapsed)}
            </button>
          {/if}
        </div>
        {#if !compact || !deadlinesCollapsed || collapsed}
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
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onDeadlineAction(item.id);
                    }
                  }}
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
                    <span>🍅 {item.donePomodoros}/{item.targetPomodoros}</span>
                    <span>{Math.min(100, Math.round((item.donePomodoros / Math.max(1, item.targetPomodoros)) * 100))}%</span>
                  </div>
                  <div class="deadline-progress">
                    <span style={`width:${Math.min(100, Math.round((item.donePomodoros / Math.max(1, item.targetPomodoros)) * 100))}%`}></span>
                  </div>
                  <div class="deadline-actions">
                    <button type="button" class="deadline-action-btn" onclick={(e) => { e.stopPropagation(); onDeadlineAction(item.id, "select"); }}>
                      {strings.workspaceDeadlineActionView || strings.details}
                    </button>
                    <button
                      type="button"
                      class="deadline-action-btn primary"
                      onclick={(e) => { e.stopPropagation(); onDeadlineAction(item.id, "start"); }}
                    >
                      {strings.workspaceDeadlineActionStart || strings.pomodoroStart || strings.pomodoroResume}
                    </button>
                    <button
                      type="button"
                      class="deadline-action-btn"
                      onclick={(e) => { e.stopPropagation(); onDeadlineAction(item.id, "snooze15"); }}
                    >
                      {strings.workspaceDeadlineActionSnooze15 || "+15m"}
                    </button>
                    <button
                      type="button"
                      class="deadline-action-btn"
                      onclick={(e) => { e.stopPropagation(); onDeadlineAction(item.id, "snooze30"); }}
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
    {/if}
  </div>

  <div class="sidebar-actions">
    <div class="sidebar-block-head">
      <div class="block-title">{collapsed ? "•" : strings.settings}</div>
      {#if compact && !collapsed}
        <button
          type="button"
          class="section-toggle"
          onclick={() => (settingsCollapsed = !settingsCollapsed)}
          aria-label={strings.settings}
        >
          {sectionToggleIcon(settingsCollapsed)}
        </button>
      {/if}
    </div>
    {#if !compact || !settingsCollapsed || collapsed}
      <button type="button" class="ghost-btn" onclick={onToggleStickiesVisibility}>
        {collapsed ? "贴" : stickiesVisible ? strings.trayStickiesClose : strings.trayStickiesShow}
      </button>
      <button type="button" class="ghost-btn" onclick={onToggleInteraction}>{collapsed ? "交" : interactionLabel()}</button>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    border-right: 1px solid #dbe4f2;
    background: var(--ws-panel-bg, rgba(255, 255, 255, 0.86));
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    padding: 16px 14px;
    gap: 14px;
    position: relative;
    color: var(--ws-text, #111827);
    cursor: default;
    min-height: 0;
    overflow: hidden;
    container-type: inline-size;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .sidebar::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  .sidebar::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 78%, transparent);
    border-radius: 999px;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 78%, transparent);
  }

  .sidebar::-webkit-scrollbar-thumb:hover {
    background: var(--ws-scrollbar-thumb-hover, rgba(51, 65, 85, 0.62));
  }

  .sidebar.collapsed {
    padding: 14px 8px;
    gap: 10px;
  }

  .sidebar.compact {
    gap: 10px;
    padding: 12px 10px;
  }

  .sidebar-body {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: auto;
    padding-right: 2px;
    align-items: stretch;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .sidebar:not(.manual-layout) .sidebar-body > .sidebar-block:last-child {
    margin-bottom: 8px;
    overflow: hidden;
  }

  .sidebar.manual-layout .sidebar-body {
    gap: 0;
    overflow: hidden;
  }

  .sidebar.manual-layout .section-height-splitter {
    margin: 10px 0;
  }

  .sidebar.manual-resizing {
    user-select: none;
  }

  .sidebar-body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .sidebar-body::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 76%, transparent);
    border-radius: 999px;
  }

  .sidebar-body::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .brand-pill {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ws-accent, #1d4ed8);
    background: var(--ws-badge-bg, #e8f0ff);
    border: 1px solid var(--ws-badge-border, #d7e5ff);
    padding: 4px 8px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .brand h1 {
    margin: 0;
    font-size: clamp(24px, 2.3vw, 34px);
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--ws-text-strong, #0f172a);
  }

  .sidebar.collapsed .brand h1 {
    font-size: 18px;
    text-align: center;
  }

  .sidebar.collapsed .brand-pill {
    width: 100%;
    text-align: center;
    padding: 4px 2px;
    font-size: 9px;
  }

  .brand p {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--ws-muted, #64748b);
  }

  .sidebar-block {
    border: 1px solid var(--ws-border, #dce5f3);
    border-radius: 12px;
    background: var(--ws-card-bg, #fdfefe);
    padding: 10px;
    min-height: 0;
    flex: 0 0 auto;
  }

  .modules-block {
    min-height: 0;
  }

  .section-height-splitter {
    position: relative;
    height: 8px;
    border-radius: 999px;
    cursor: row-resize;
    flex: 0 0 auto;
    touch-action: none;
  }

  .section-height-splitter::before {
    content: "";
    position: absolute;
    left: 16%;
    right: 16%;
    top: 3px;
    height: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 88%, transparent);
    transition: background 0.16s ease;
  }

  .section-height-splitter:hover::before,
  .sidebar.manual-resizing .section-height-splitter::before {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 48%, var(--ws-border-soft, #d9e2ef));
  }

  .sidebar.manual-layout .modules-block,
  .sidebar.manual-layout .note-filters-block,
  .sidebar.manual-layout .deadline-block {
    min-height: 0;
    height: var(--manual-block-height, auto);
    max-height: var(--manual-block-height, none);
    flex: 0 0 auto;
  }

  .sidebar.manual-layout .modules-block {
    overflow: auto;
  }

  .sidebar.manual-layout .note-filters-block,
  .sidebar.manual-layout .deadline-block {
    overflow: hidden;
  }

  .sidebar.collapsed .sidebar-block {
    padding: 8px 6px;
  }

  .sidebar-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
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

  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .view-list {
    display: grid;
    gap: 6px;
  }

  .view-sections {
    display: grid;
    gap: 8px;
  }

  .note-filters-block {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    min-height: 0;
  }

  .note-filters-block .view-sections {
    min-height: 0;
    max-height: var(--section-max-height, 240px);
    overflow: auto;
    padding-right: 2px;
    scrollbar-width: thin;
  }

  .sidebar.manual-layout .note-filters-block .view-sections {
    height: var(--section-max-height, 240px);
  }

  .view-separator {
    height: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 90%, transparent);
  }

  .view-list-secondary .view-btn {
    opacity: 0.95;
  }

  .tag-filter {
    display: grid;
    gap: 6px;
  }

  .tag-empty {
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 9px;
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    line-height: 1.4;
    padding: 8px;
  }

  .tag-list {
    display: grid;
    gap: 5px;
    max-height: 160px;
    overflow: auto;
    padding-right: 3px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .tag-list::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .tag-list::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 80%, transparent);
    border-radius: 999px;
  }

  .tag-list::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .tag-filter-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tag-filter-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .tag-filter-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .tag-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .initial-view {
    display: grid;
    gap: 6px;
  }

  .sort-control {
    display: grid;
    gap: 6px;
  }

  .initial-view-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    font-weight: 600;
  }

  .initial-view-select {
    width: 100%;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    min-height: 32px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.14s ease;
  }

  .initial-view-select:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
  }

  .main-tabs {
    display: grid;
    gap: 6px;
  }

  .main-tab-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 9px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    transition: all 0.16s ease;
  }

  .main-tab-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateX(2px);
  }

  .main-tab-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .sidebar.collapsed .main-tab-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .view-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .sidebar.collapsed .view-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .view-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateX(2px);
  }

  .view-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .view-count {
    display: inline-flex;
    min-width: 22px;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-card-bg, #fdfefe);
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    font-weight: 700;
    justify-content: center;
    line-height: 1.1;
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

  .deadline-block {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 0 0 auto;
  }

  .sidebar.auto-priority .deadline-block {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1 1 auto;
  }

  .sidebar.manual-layout .deadline-block {
    flex: 0 0 auto;
  }

  .deadline-list {
    display: grid;
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

  .sidebar.manual-layout .deadline-list {
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
    justify-content: space-between;
    gap: 6px;
    font-size: 10px;
    color: var(--ws-muted, #64748b);
  }

  .deadline-progress {
    margin-top: 4px;
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 62%, transparent);
    overflow: hidden;
  }

  .deadline-progress > span {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 65%, #60a5fa) 0%, var(--ws-accent, #1d4ed8) 100%);
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

  .deadline-action-btn.primary {
    border-color: var(--ws-border-active, #94a3b8);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
    color: var(--ws-text-strong, #0f172a);
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

  .sidebar-actions {
    margin-top: 0;
    display: grid;
    gap: 6px;
    border-top: 1px dashed var(--ws-border-soft, #d8e2ef);
    padding-top: 12px;
    flex: 0 0 auto;
  }

  .ghost-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--ws-btn-bg, #fdfefe);
    color: var(--ws-text, #334155);
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    transition: all 0.16s ease;
  }

  .sidebar.collapsed .ghost-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .ghost-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .sidebar.compact .brand h1 {
    font-size: 24px;
  }

  .sidebar.compact .brand p {
    font-size: 11px;
    margin-top: 5px;
  }

  .sidebar.compact .block-title {
    font-size: 10px;
    margin-bottom: 6px;
  }

  .sidebar.compact .main-tab-btn {
    padding: 8px 10px;
    font-size: 12px;
  }

  .sidebar.compact .view-btn {
    padding: 8px 10px;
    font-size: 12px;
    gap: 8px;
  }

  @container (max-width: 230px) {
    .sidebar {
      padding: 10px 8px;
      gap: 8px;
    }

    .brand p {
      font-size: 11px;
      margin-top: 4px;
    }

    .sidebar-block {
      padding: 8px;
    }

    .main-tab-btn,
    .view-btn,
    .ghost-btn {
      font-size: 12px;
      padding: 7px 9px;
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

  .sidebar.compact .initial-view-select {
    min-height: 30px;
    font-size: 11px;
    padding: 4px 8px;
  }

  .sidebar.compact .deadline-item {
    padding: 7px;
  }

  .sidebar.compact .deadline-actions {
    gap: 5px;
  }

  .sidebar.compact .deadline-action-btn {
    min-height: 24px;
    font-size: 10px;
  }

  @media (max-width: 920px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid #dce3ef;
    }

    .sidebar-body {
      max-height: min(56vh, 360px);
    }
  }
</style>
