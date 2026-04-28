<script>
  import {
    WORKSPACE_MAIN_TAB_NOTES,
    getWorkspaceMainTabDefs,
  } from "$lib/workspace/workspace-tabs.js";
  import WorkspaceSidebarDeadlines from "$lib/components/workspace/sidebar/WorkspaceSidebarDeadlines.svelte";
  import WorkspaceSidebarModules from "$lib/components/workspace/sidebar/WorkspaceSidebarModules.svelte";
  import WorkspaceSidebarNoteFilters from "$lib/components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte";
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
    isMac = false,
    mainTab = /** @type {string} */ (WORKSPACE_MAIN_TAB_NOTES),
    viewModes,
    viewMode,
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
    onSetSelectedTag = () => {},
    onSetInitialViewMode = () => {},
    stickiesVisible,
    globalControlDisabled = false,
    showMacTrafficLights = false,
    focusDeadlines = [],
    noteTags = [],
    selectedTag = "",
    taggedNoteCount = 0,
    onDeadlineAction = () => {},
    onToggleStickiesVisibility,
    onToggleGlobalControl,
  } = $props();

  const mainTabs = $derived(getWorkspaceMainTabDefs(strings));

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

  function globalControlLabel() {
    return globalControlDisabled ? strings.trayInteractionStateOff : strings.trayInteractionStateOn;
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
    {#if isMac}
      <span
        class="brand-pill"
        class:traffic-reserved={showMacTrafficLights}
        class:traffic-hidden={isMac && !showMacTrafficLights}
      >
        {strings.workspaceBrandTag}
      </span>
    {/if}
    <h1>{collapsed ? "WS" : strings.workspaceTitle}</h1>
    {#if !collapsed}
      <p>{strings.workspaceHint}</p>
    {/if}
  </div>

  <div class="sidebar-body" bind:this={sidebarBodyEl}>
    <div class="sidebar-block modules-block" style={manualTopBlockStyle} bind:this={modulesBlockEl}>
      <WorkspaceSidebarModules {strings} {collapsed} {mainTabs} {mainTab} {onSetMainTab} />
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
      <WorkspaceSidebarNoteFilters
        {strings}
        {collapsed}
        {compact}
        manualLayoutEnabled={manualLayoutEnabled}
        blockStyle={noteFiltersBlockStyle}
        sectionCollapsed={noteFiltersCollapsed}
        {viewModes}
        {viewMode}
        {initialViewMode}
        {noteViewCounts}
        {noteTags}
        {selectedTag}
        {taggedNoteCount}
        onToggleSectionCollapsed={() => (noteFiltersCollapsed = !noteFiltersCollapsed)}
        {onSetViewMode}
        {onSetSelectedTag}
        {onSetInitialViewMode}
      />
    {:else}
      <WorkspaceSidebarDeadlines
        {strings}
        {collapsed}
        {compact}
        manualLayoutEnabled={manualLayoutEnabled}
        blockStyle={deadlineBlockStyle}
        sectionCollapsed={deadlinesCollapsed}
        {focusDeadlines}
        onToggleSectionCollapsed={() => (deadlinesCollapsed = !deadlinesCollapsed)}
        {onDeadlineAction}
      />
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
      <div class="sidebar-toggle-row">
        {#if !collapsed}
          <div class="sidebar-toggle-text">{strings.overlay}</div>
        {/if}
        <label class="toggle-switch" title={stickiesVisible ? strings.trayStickiesClose : strings.trayStickiesShow}>
          <input type="checkbox" checked={stickiesVisible} onchange={onToggleStickiesVisibility} />
          <span class="slider round"></span>
        </label>
      </div>
      <div class="sidebar-toggle-row">
        {#if !collapsed}
          <div class="sidebar-toggle-text">{strings.overlayClickThrough}</div>
        {/if}
        <label class="toggle-switch" title={globalControlLabel()}>
          <input type="checkbox" checked={!globalControlDisabled} onchange={onToggleGlobalControl} />
          <span class="slider round"></span>
        </label>
      </div>
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

  .brand-pill.traffic-reserved {
    visibility: hidden;
    pointer-events: none;
  }

  .brand-pill.traffic-hidden {
    display: none;
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

  .sidebar.manual-layout .modules-block {
    min-height: 0;
    height: var(--manual-block-height, auto);
    max-height: var(--manual-block-height, none);
    flex: 0 0 auto;
  }

  .sidebar.manual-layout .modules-block {
    overflow: auto;
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

  .sidebar-actions {
    margin-top: 0;
    display: grid;
    gap: 6px;
    border-top: 1px dashed var(--ws-border-soft, #d8e2ef);
    padding-top: 12px;
    flex: 0 0 auto;
  }

  .sidebar-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fdfefe);
  }

  .sidebar.collapsed .sidebar-toggle-row {
    justify-content: center;
    padding: 6px 6px;
  }

  .sidebar-toggle-text {
    font-size: 12px;
    color: var(--ws-text, #334155);
    font-weight: 600;
    letter-spacing: 0.2px;
    user-select: none;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    transition: 0.2s;
    border-radius: 999px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.2s;
    border-radius: 999px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }

  input:checked + .slider {
    background-color: #3b82f6;
  }

  input:checked + .slider:before {
    transform: translateX(20px);
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
