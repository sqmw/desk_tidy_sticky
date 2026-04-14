<script>
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emit, listen } from "@tauri-apps/api/event";
  import {
    enable as autostartEnable,
    disable as autostartDisable,
    isEnabled as autostartIsEnabled,
  } from "@tauri-apps/plugin-autostart";

  import { getStrings } from "$lib/strings.js";
  import { broadcastPreferencesChanged, listenPreferencesChanged } from "$lib/preferences/preferences-sync.js";
  import { createWindowSync } from "$lib/panel/use-window-sync.js";
  import { createNoteCommands } from "$lib/panel/use-note-commands.js";
  import { createWorkspaceInspectorActions } from "$lib/workspace/controllers/workspace-inspector-actions.js";
  import { createWorkspaceFocusActions } from "$lib/workspace/controllers/workspace-focus-actions.js";
  import { createWorkspaceNoteViewActions } from "$lib/workspace/controllers/workspace-note-view-actions.js";
  import { createWorkspacePreferenceSync } from "$lib/workspace/controllers/workspace-preference-sync.js";
  import { createWorkspaceRouteNoteBridge } from "$lib/workspace/controllers/workspace-route-note-bridge.js";
  import { createWorkspaceRoutePreferences } from "$lib/workspace/controllers/workspace-route-preferences.js";
  import { createWorkspaceRouteResizeBridge } from "$lib/workspace/controllers/workspace-route-resize-bridge.js";
  import { createWorkspaceRouteWorkspaceBridge } from "$lib/workspace/controllers/workspace-route-workspace-bridge.js";
  import { createWorkspaceRuntimeLifecycle } from "$lib/workspace/controllers/workspace-runtime-lifecycle.js";
  import { createWorkspaceSettingsActions } from "$lib/workspace/controllers/workspace-settings-actions.js";
  import { createWorkspaceStartupActions } from "$lib/workspace/controllers/workspace-startup-actions.js";
  import { createWorkspaceWindowActions } from "$lib/workspace/controllers/workspace-window-actions.js";

  import WorkbenchSection from "$lib/components/panel/WorkbenchSection.svelte";
  import WorkspaceFocusHub from "$lib/components/workspace/WorkspaceFocusHub.svelte";
  import WorkspaceMacTrafficLights from "$lib/components/workspace/WorkspaceMacTrafficLights.svelte";
  import WorkspaceWindowBar from "$lib/components/workspace/WorkspaceWindowBar.svelte";
  import WorkspaceSidebar from "$lib/components/workspace/WorkspaceSidebar.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";
  import WorkspaceNoteInspector from "$lib/components/workspace/WorkspaceNoteInspector.svelte";
  import WorkspaceSettingsDialog from "$lib/components/workspace/WorkspaceSettingsDialog.svelte";
  import {
    normalizePomodoroConfig,
  } from "$lib/workspace/preferences-service.js";
  import {
    buildWorkspaceThemeVarStyle,
    getWorkspaceThemePresetOptions,
    isWorkspaceThemeDark,
  } from "$lib/workspace/theme/theme-presets.js";
  import { tryStartWorkspaceWindowDrag } from "$lib/workspace/window-drag.js";
  import { createWorkspaceResizeController } from "$lib/workspace/resize-controller.js";
  import { resolveWorkspaceViewportLayout } from "$lib/workspace/layout/workspace-viewport-layout.js";
  import { getFocusDeadlinesForToday } from "$lib/workspace/pomodoro/focus-deadlines.js";
  import { minutesToTime, timeToMinutes } from "$lib/workspace/pomodoro/focus-model.js";
  import {
    countTaggedWorkspaceNotes,
    formatWorkspaceNoteDate,
    getRenderedWorkspaceNotes,
    getVisibleWorkspaceNotes,
    getWorkspaceInspectorNote,
    getWorkspaceNoteTagEntries,
    getWorkspaceNoteViewCounts,
    normalizeWorkspaceNoteTag,
  } from "$lib/workspace/note/workspace-note-selectors.js";
  import {
    WORKSPACE_NOTE_VIEW_MODES,
    WORKSPACE_MAIN_TAB_FOCUS,
    WORKSPACE_MAIN_TAB_NOTES,
    WORKSPACE_NOTE_VIEW_ACTIVE,
    WORKSPACE_NOTE_VIEW_ARCHIVED,
    WORKSPACE_NOTE_VIEW_QUADRANT,
    WORKSPACE_NOTE_VIEW_TODO,
    normalizeWorkspaceInitialViewMode,
    normalizeWorkspaceMainTab,
    normalizeWorkspaceViewMode,
  } from "$lib/workspace/workspace-tabs.js";

  const SORT_MODES = ["custom", "newest", "oldest"];

  /** @type {any[]} */
  let notes = $state([]);
  let mainTab = $state(WORKSPACE_MAIN_TAB_NOTES);
  let sortMode = $state("custom");
  let viewMode = $state("active");
  let initialViewMode = $state("last");
  let searchQuery = $state("");
  let selectedTag = $state("");
  /** @type {string} */
  let locale = $state("en");
  let newNoteText = $state("");
  let newNotePriority = $state(/** @type {number | null} */ (null));
  let newNoteTags = $state(/** @type {string[]} */ ([]));

  let inspectorOpen = $state(false);
  /** @type {string | null} */
  let inspectorNoteId = $state(null);
  let inspectorMode = $state("view");
  let inspectorDraftText = $state("");
  /** @type {{ id: string } | null} */
  let pendingLongDocDraft = $state(null);
  let inspectorWidth = $state(430);
  let inspectorListCollapsed = $state(false);
  let sidebarWidth = $state(260);
  let windowMaximized = $state(false);
  /** @type {HTMLDivElement | null} */
  let workbenchShellEl = $state(null);
  /** @type {HTMLDivElement | null} */
  let workspaceViewportEl = $state(null);
  let suppressNotesReloadUntil = 0;
  let stickiesVisible = $state(true);
  let interactionDisabled = $state(false);
  let showWorkspaceSettings = $state(false);
  let workspaceTheme = $state("light");
  let workspaceCustomCss = $state("");
  let workspaceZoom = $state(1);
  let workspaceZoomMode = $state("manual");
  let workspaceFontSize = $state("medium");
  let workspaceSidebarLayoutMode = $state("auto");
  let workspaceSidebarManualSplitRatio = $state(0.42);
  let themeTransitionShape = $state("circle");
  let isAutostartEnabled = $state(false);
  let showPanelOnStartup = $state(false);
  /** @type {any[]} */
  let focusTasks = $state([]);
  /** @type {Record<string, any>} */
  let focusStats = $state({});
  let focusSelectedTaskId = $state("");
  let focusCommand = $state({ nonce: 0, type: "select", taskId: "" });
  let focusBreakSession = $state({
    mode: "none",
    untilTs: 0,
    scope: "global",
    taskId: "",
    taskTitle: "",
  });
  let deadlineNowTick = $state(Date.now());
  let viewportWidth = $state(1360);
  let viewportHeight = $state(860);
  let viewportDpr = $state(1);
  let pomodoroConfig = $state({
    breakReminderEnabled: true,
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    miniBreakEveryMinutes: 10,
    miniBreakDurationSeconds: 20,
    longBreakEveryMinutes: 30,
    longBreakDurationMinutes: 5,
    breakNotifyBeforeSeconds: 10,
    taskStartReminderEnabled: false,
    taskStartReminderLeadMinutes: 10,
    miniBreakPostponeMinutes: 5,
    longBreakPostponeMinutes: 10,
    breakPostponeLimit: 3,
    breakStrictMode: false,
    breakReminderMode: "panel",
    independentMiniBreakEveryMinutes: 10,
    independentLongBreakEveryMinutes: 30,
  });
  let sidebarCollapsed = $derived(sidebarWidth <= 104);
  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(String(navigator.userAgent || navigator.platform || ""));
  const showMacTrafficLights = $derived(isMac && !windowMaximized);
  const workspaceZoomOption = $derived(workspaceZoomMode === "auto" ? "auto" : String(workspaceZoom));
  const viewportLayout = $derived.by(() =>
    resolveWorkspaceViewportLayout({
      viewportWidth,
      viewportHeight,
      viewportDpr,
      sidebarWidth,
      sidebarCollapsed,
      workspaceZoom,
      workspaceZoomMode,
      workspaceFontSize,
    }),
  );
  const workspaceLayoutScale = $derived(viewportLayout.layoutScale);
  const workspaceTextScale = $derived(viewportLayout.textScale);
  const stageLayout = $derived(viewportLayout.stageLayout);
  const sidebarLayout = $derived(viewportLayout.sidebarLayout);
  const sidebarCompact = $derived(viewportLayout.sidebarCompact);
  const workspaceThemeDark = $derived.by(() => isWorkspaceThemeDark(workspaceTheme));
  const workspaceThemeVarStyle = $derived.by(() => buildWorkspaceThemeVarStyle(workspaceTheme));
  const workspaceCustomCssStyle = $derived.by(() => String(workspaceCustomCss || ""));

  const strings = $derived(getStrings(locale));
  const workspaceThemePresetOptions = $derived.by(() => getWorkspaceThemePresetOptions(strings));
  const deadlineTasks = $derived.by(() => {
    const now = new Date(deadlineNowTick);
    return getFocusDeadlinesForToday(focusTasks, focusStats, now);
  });
  const canQuadrantReorder = $derived(
    sortMode === "custom" && !searchQuery.trim() && viewMode === "quadrant",
  );

  const visibleNotes = $derived.by(() =>
    getVisibleWorkspaceNotes({ notes, viewMode, selectedTag, searchQuery }),
  );

  const noteTagEntries = $derived.by(() => getWorkspaceNoteTagEntries(notes, viewMode));
  const noteTagOptions = $derived(noteTagEntries.map((x) => x.tag));

  const taggedNoteCount = $derived.by(() => countTaggedWorkspaceNotes(notes, viewMode));

  const renderedNotes = $derived.by(() => getRenderedWorkspaceNotes(visibleNotes));

  const noteViewCounts = $derived.by(() => getWorkspaceNoteViewCounts(notes));

  const inspectorNote = $derived.by(() => getWorkspaceInspectorNote(renderedNotes, inspectorNoteId));

  const windowSync = createWindowSync({
    getNotes: () => notes,
    getStickiesVisible: () => stickiesVisible,
    invoke,
  });

  const routeNoteBridge = createWorkspaceRouteNoteBridge({
    invoke,
    getSortMode: () => sortMode,
    getViewMode: () => viewMode,
    getLocale: () => locale,
    getMainTab: () => mainTab,
    setMainTab,
    notesTabKey: WORKSPACE_MAIN_TAB_NOTES,
    getNewNoteText: () => newNoteText,
    setNewNoteText: (text) => {
      newNoteText = text;
    },
    getNewNotePriority: () => newNotePriority,
    setNewNotePriority: (next) => {
      newNotePriority = next;
    },
    getNewNoteTags: () => newNoteTags,
    setNewNoteTags: (next) => {
      newNoteTags = next;
    },
    getSelectedTag: () => selectedTag,
    getNotes: () => notes,
    setNotes: (next) => {
      notes = next;
    },
    suppressNotesReload: (ms) => {
      suppressNotesReloadUntil = Date.now() + ms;
    },
    syncWindows: windowSync.syncWindows,
    openNoteWindow: windowSync.openNoteWindow,
    closeNoteWindow: windowSync.closeNoteWindow,
    getCurrentWindow,
    getInspectorNote: () => inspectorNote,
    getPendingLongDocDraft: () => pendingLongDocDraft,
    setPendingLongDocDraft: (next) => {
      pendingLongDocDraft = next;
    },
    setInspectorOpen: (open) => {
      inspectorOpen = open;
    },
    setInspectorNoteId: (id) => {
      inspectorNoteId = id;
    },
    setInspectorMode: (mode) => {
      inspectorMode = mode;
    },
    getInspectorDraftText: () => inspectorDraftText,
    setInspectorDraftText: (text) => {
      inspectorDraftText = text;
    },
    setInspectorListCollapsed: (collapsed) => {
      inspectorListCollapsed = collapsed;
    },
    loadNotes: () => loadNotes(),
    savePrefs: (updates) => savePrefs(updates),
    setViewModeState: (next) => {
      viewMode = next;
    },
    setInitialViewModeState: (next) => {
      initialViewMode = next;
    },
    setSelectedTagState: (next) => {
      selectedTag = next;
    },
    setSortModeState: (next) => {
      sortMode = next;
    },
    setLocaleState: (next) => {
      locale = next;
    },
  });

  const {
    loadNotes,
    saveNote,
    togglePin,
    toggleZOrder,
    toggleWallpaperLayer,
    toggleDone,
    updatePriority,
    updateTags,
    toggleArchive,
    deleteNote,
    restoreNote,
    persistReorderedVisible,
  } = createNoteCommands(routeNoteBridge.createNoteCommandsConfig());

  /** @param {Record<string, any>} patch */
  function setWorkspaceRouteState(patch) {
    if ("viewMode" in patch) viewMode = normalizeWorkspaceViewMode(patch.viewMode);
    if ("initialViewMode" in patch) {
      initialViewMode = normalizeWorkspaceInitialViewMode(patch.initialViewMode);
    }
    if ("sortMode" in patch) sortMode = patch.sortMode;
    if ("locale" in patch) locale = patch.locale;
    if ("mainTab" in patch) mainTab = patch.mainTab;
    if ("stickiesVisible" in patch) stickiesVisible = patch.stickiesVisible;
    if ("showPanelOnStartup" in patch) showPanelOnStartup = patch.showPanelOnStartup;
    if ("workspaceTheme" in patch) workspaceTheme = patch.workspaceTheme;
    if ("workspaceCustomCss" in patch) workspaceCustomCss = patch.workspaceCustomCss;
    if ("workspaceZoom" in patch) workspaceZoom = patch.workspaceZoom;
    if ("workspaceZoomMode" in patch) workspaceZoomMode = patch.workspaceZoomMode;
    if ("workspaceFontSize" in patch) workspaceFontSize = patch.workspaceFontSize;
    if ("workspaceSidebarLayoutMode" in patch) {
      workspaceSidebarLayoutMode = patch.workspaceSidebarLayoutMode;
    }
    if ("workspaceSidebarManualSplitRatio" in patch) {
      workspaceSidebarManualSplitRatio = patch.workspaceSidebarManualSplitRatio;
    }
    if ("themeTransitionShape" in patch) themeTransitionShape = patch.themeTransitionShape;
    if ("focusTasks" in patch) focusTasks = patch.focusTasks;
    if ("focusStats" in patch) focusStats = patch.focusStats;
    if ("focusBreakSession" in patch) focusBreakSession = patch.focusBreakSession;
    if ("pomodoroConfig" in patch) pomodoroConfig = patch.pomodoroConfig;
  }

  const routePreferences = createWorkspaceRoutePreferences({
    invoke,
    setState: setWorkspaceRouteState,
  });
  const { loadPrefs, savePrefs } = routePreferences;

  const inspectorActions = createWorkspaceInspectorActions(routeNoteBridge.createInspectorActionsConfig());

  const {
    openInspectorView,
    openInspectorEdit,
    closeInspector,
    handleInspectorClose,
    startInspectorEdit,
    cancelInspectorEdit,
    saveInspectorEdit,
    createLongDocument,
  } = inspectorActions;

  const routeWorkspaceBridge = createWorkspaceRouteWorkspaceBridge({
    normalizePomodoroConfig,
    savePrefs: (updates) => savePrefs(updates),
    invoke,
    getCurrentWindow,
    loadNotes: () => loadNotes(),
    syncWindows: windowSync.syncWindows,
    syncWindowMaximizedState: (setWindowMaximized, options) =>
      runtimeLifecycle.syncWindowMaximizedState(setWindowMaximized, options),
    getIsMac: () => isMac,
    getStickiesVisible: () => stickiesVisible,
    setStickiesVisible: (next) => {
      stickiesVisible = next;
    },
    setInteractionDisabled: (next) => {
      interactionDisabled = next;
    },
    setWindowMaximized: (next) => {
      windowMaximized = next;
    },
    setViewportMetrics: (next) => {
      viewportWidth = next.width;
      viewportHeight = next.height;
      viewportDpr = next.dpr;
    },
    getFocusTasks: () => focusTasks,
    setFocusTasks: (next) => {
      focusTasks = next;
    },
    setFocusStats: (next) => {
      focusStats = next;
    },
    setFocusBreakSession: (next) => {
      focusBreakSession = {
        mode: String(next?.mode || "none"),
        untilTs: Number.isFinite(Number(next?.untilTs)) ? Math.max(0, Math.round(Number(next.untilTs))) : 0,
        scope: String(next?.scope || "global"),
        taskId: String(next?.taskId || ""),
        taskTitle: String(next?.taskTitle || ""),
      };
    },
    setFocusSelectedTaskId: (nextTaskId) => {
      focusSelectedTaskId = nextTaskId;
    },
    setFocusCommand: (next) => {
      focusCommand = next;
    },
    setPomodoroConfig: (next) => {
      pomodoroConfig = next;
    },
    setMainTab,
    focusTabKey: WORKSPACE_MAIN_TAB_FOCUS,
    timeToMinutes,
    minutesToTime,
    getWorkspaceTheme: () => workspaceTheme,
    setWorkspaceTheme: (next) => {
      workspaceTheme = next;
    },
    getThemeTransitionShape: () => themeTransitionShape,
    setThemeTransitionShape: (next) => {
      themeTransitionShape = next;
    },
    getStrings: () => strings,
    getWorkspaceCustomCss: () => workspaceCustomCss,
    setWorkspaceCustomCssState: (next) => {
      workspaceCustomCss = next;
    },
    getWorkspaceZoom: () => workspaceZoom,
    setWorkspaceZoomState: (next) => {
      workspaceZoom = next;
    },
    getWorkspaceZoomMode: () => workspaceZoomMode,
    setWorkspaceZoomMode: (next) => {
      workspaceZoomMode = next;
    },
    setWorkspaceFontSize: (next) => {
      workspaceFontSize = next;
    },
    setWorkspaceSidebarLayoutModeState: (next) => {
      workspaceSidebarLayoutMode = next;
    },
    setWorkspaceSidebarManualSplitRatioState: (next) => {
      workspaceSidebarManualSplitRatio = next;
    },
  });

  const focusActions = createWorkspaceFocusActions(routeWorkspaceBridge.createFocusActionsConfig());

  const {
    changePomodoroConfig,
    changeFocusTasks,
    changeFocusStats,
    changeFocusBreakSession,
    changeFocusSelectedTask,
    handleDeadlineAction,
  } = focusActions;

  const runtimeLifecycle = createWorkspaceRuntimeLifecycle({
    emit,
    listen,
    invoke,
    loadPrefs,
    loadNotes,
    getCurrentWindow,
    suppressNotesReloadUntilRef: () => suppressNotesReloadUntil,
    setInteractionDisabled: (next) => {
      interactionDisabled = next;
    },
    updateDeadlineTick: () => {
      deadlineNowTick = Date.now();
    },
  });

  const workspaceSettingsActions = createWorkspaceSettingsActions(
    routeWorkspaceBridge.createSettingsActionsConfig(),
  );

  const {
    clearWorkspaceCustomCssPersistTimer,
    setWorkspaceCustomCss,
    resetWorkspaceCustomCss,
    handleWorkspaceThemePresetChange,
    exportWorkspaceThemeCss,
    copyWorkspaceDefaultThemeTemplate,
    importWorkspaceThemeCss,
    setWorkspaceZoomOption,
    setWorkspaceFontSize,
    setWorkspaceSidebarLayoutMode,
    handleSidebarManualSplitRatioInput,
    handleSidebarManualSplitRatioCommit,
    changeThemeTransitionShape,
  } = workspaceSettingsActions;

  const startupActions = createWorkspaceStartupActions({
    autostartEnable,
    autostartDisable,
    autostartIsEnabled,
    setAutostartEnabled: (next) => {
      isAutostartEnabled = next;
    },
    broadcastPreferencesChanged,
  });

  const { initAutostart, toggleAutostart } = startupActions;

  const workspaceWindowActions = createWorkspaceWindowActions(
    routeWorkspaceBridge.createWindowActionsConfig(),
  );

  const {
    switchToCompact,
    refreshViewportMetrics,
    onWindowResize,
    toggleInteraction,
    toggleStickiesVisibility,
    toggleWindowMaximize,
    syncWindowPresentationState,
    minimizeWindow,
    hideWindow,
  } = workspaceWindowActions;

  const workspaceNoteViewActions = createWorkspaceNoteViewActions(routeNoteBridge.createNoteViewActionsConfig());

  const { setViewMode, setSelectedTag, setInitialViewMode, setSortMode, setLanguage } =
    workspaceNoteViewActions;

  /** @param {string} tab */
  async function setMainTab(tab) {
    mainTab = normalizeWorkspaceMainTab(tab);
    if (mainTab !== WORKSPACE_MAIN_TAB_NOTES) {
      closeInspector();
    }
    await savePrefs({ workspaceMainTab: mainTab });
  }

  /** @param {PointerEvent} e */
  async function startWorkspaceDragPointer(e) {
    try {
      await tryStartWorkspaceWindowDrag(e, getCurrentWindow);
    } catch (err) {
      console.error("startDragging(workspace) failed", err);
    }
  }

  async function toggleTheme() {
    await workspaceSettingsActions.toggleTheme();
  }

  /** @param {number | null} priority */
  async function handleInspectorPriorityChange(priority) {
    if (!inspectorNote) return;
    await updatePriority(inspectorNote, priority);
  }

  /** @param {string[]} tags */
  async function handleInspectorTagsChange(tags) {
    if (!inspectorNote) return;
    await updateTags(inspectorNote, tags);
  }

  const workspacePreferenceSync = createWorkspacePreferenceSync({
    listenPreferencesChanged,
    setShowPanelOnStartup: (next) => {
      showPanelOnStartup = next;
    },
    setAutostartEnabled: (next) => {
      isAutostartEnabled = next;
    },
  });

  const routeResizeBridge = createWorkspaceRouteResizeBridge({
    getWorkbenchShellRect: () => workbenchShellEl?.getBoundingClientRect() ?? null,
    getWorkspaceViewportRect: () => workspaceViewportEl?.getBoundingClientRect() ?? null,
    getWorkspaceLayoutScale: () => workspaceLayoutScale,
    getInspectorOpen: () => inspectorOpen,
    getInspectorListCollapsed: () => inspectorListCollapsed,
    setInspectorLayoutState: (next) => {
      inspectorListCollapsed = next.collapsed;
      inspectorWidth = next.width;
    },
    getInspectorWidth: () => inspectorWidth,
    getSidebarWidth: () => sidebarWidth,
    getSidebarMaxWidth: () => stageLayout.sidebarMaxWidth,
    setSidebarWidthState: (nextWidth) => {
      sidebarWidth = nextWidth;
    },
  });

  const resizeController = createWorkspaceResizeController(routeResizeBridge);

  onMount(() => {
    refreshViewportMetrics();
    runtimeLifecycle.bootstrap();
    syncWindowPresentationState();
    runtimeLifecycle.syncOverlayInteractionState();
    initAutostart();
    let cleanup = /** @type {(() => void) | null} */ (null);
    let unlistenPrefs = /** @type {(() => void) | null} */ (null);
    runtimeLifecycle.mountRuntimeListeners().then((fn) => {
      cleanup = fn;
    });
    workspacePreferenceSync.mountPreferenceSync().then((fn) => {
      unlistenPrefs = fn;
    });
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      clearWorkspaceCustomCssPersistTimer();
      unlistenPrefs?.();
      cleanup?.();
    };
  });

  $effect(() => {
    const next = stageLayout.recommendedSidebarWidth;
    if (Math.abs(next - sidebarWidth) < 1) return;
    sidebarWidth = next;
  });

  $effect(() => {
    if (!inspectorOpen || !inspectorNoteId) return;
    if (!inspectorNote) {
      closeInspector();
      return;
    }
    if (inspectorMode === "view") {
      inspectorDraftText = inspectorNote.text || "";
    }
  });

  $effect(() => {
    if (inspectorOpen) return;
    inspectorListCollapsed = false;
  });

  $effect(() => {
    if (mainTab !== WORKSPACE_MAIN_TAB_NOTES) return;
    if (viewMode === WORKSPACE_NOTE_VIEW_QUADRANT) {
      if (newNotePriority == null) {
        newNotePriority = 2;
      }
      return;
    }
    newNotePriority = null;
  });

  $effect(() => {
    if (!selectedTag) return;
    const exists = noteTagEntries.some((x) => normalizeWorkspaceNoteTag(x.tag) === normalizeWorkspaceNoteTag(selectedTag));
    if (!exists) {
      selectedTag = "";
    }
  });
</script>

<svelte:head>
  {#if workspaceCustomCssStyle}
    <style id="workspace-custom-theme-style">{workspaceCustomCssStyle}</style>
  {/if}
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="workspace-viewport"
  class:mac-windowed={isMac && !windowMaximized}
  bind:this={workspaceViewportEl}
>
  {#if showMacTrafficLights}
    <WorkspaceMacTrafficLights
      {strings}
      isMaximized={windowMaximized}
      onMinimize={minimizeWindow}
      onToggleMaximize={toggleWindowMaximize}
      onHide={hideWindow}
    />
  {/if}
  <div
    class="workspace"
    class:theme-dark={workspaceThemeDark}
    class:mac-windowed={isMac && !windowMaximized}
    style={`--sidebar-width: ${sidebarWidth}px; --ws-ui-scale: ${workspaceLayoutScale}; --ws-layout-scale: 1; --ws-text-scale: ${workspaceTextScale}; ${workspaceThemeVarStyle}`}
  >
  <WorkspaceSidebar
    {strings}
    {isMac}
    {mainTab}
    viewModes={WORKSPACE_NOTE_VIEW_MODES}
    {viewMode}
    collapsed={sidebarCollapsed}
    compact={sidebarCompact}
    sidebarLayoutMode={workspaceSidebarLayoutMode}
    sidebarManualSplitRatio={workspaceSidebarManualSplitRatio}
    viewSectionMaxHeight={sidebarLayout.viewSectionMaxHeight}
    deadlineSectionMaxHeight={sidebarLayout.deadlineSectionMaxHeight}
    onSidebarManualSplitRatioInput={handleSidebarManualSplitRatioInput}
    onSidebarManualSplitRatioCommit={handleSidebarManualSplitRatioCommit}
    onDragStart={startWorkspaceDragPointer}
    onSetMainTab={setMainTab}
    onSetViewMode={setViewMode}
    onSetSortMode={setSortMode}
    onSetSelectedTag={setSelectedTag}
    onSetInitialViewMode={setInitialViewMode}
    {showMacTrafficLights}
    {sortMode}
    sortModes={SORT_MODES}
    {noteViewCounts}
    noteTags={noteTagEntries}
    {selectedTag}
    taggedNoteCount={taggedNoteCount}
    {initialViewMode}
    {stickiesVisible}
    {interactionDisabled}
    focusDeadlines={deadlineTasks}
    onDeadlineAction={handleDeadlineAction}
    onToggleStickiesVisibility={toggleStickiesVisibility}
    onToggleInteraction={toggleInteraction}
  />
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sidebar-splitter" onpointerdown={resizeController.startSidebarResize} ondblclick={() => (sidebarWidth = 260)}></div>

  <main class="main">
    <WorkspaceWindowBar
      {strings}
      theme={workspaceThemeDark ? "dark" : "light"}
      isMaximized={windowMaximized}
      {themeTransitionShape}
      compact={stageLayout.windowBarCompact}
      showWindowControls={!isMac}
      onDragStart={startWorkspaceDragPointer}
      onBackToCompact={switchToCompact}
      onMinimize={minimizeWindow}
      onToggleMaximize={toggleWindowMaximize}
      onToggleTheme={toggleTheme}
      onOpenSettings={() => (showWorkspaceSettings = true)}
      onHide={hideWindow}
      onChangeThemeTransitionShape={changeThemeTransitionShape}
    />

    {#if mainTab === WORKSPACE_MAIN_TAB_NOTES}
      <WorkspaceToolbar
        {strings}
        {viewMode}
        compact={stageLayout.toolbarCompact}
        bind:newNoteText
        bind:newNotePriority
        bind:newNoteTags
        {noteTagOptions}
        bind:searchQuery
        onSave={() => saveNote(false)}
        onCreateLongDoc={createLongDocument}
      />

      <div
        class="workbench-shell"
        class:inspector-open={inspectorOpen}
        class:list-collapsed={inspectorListCollapsed}
        bind:this={workbenchShellEl}
        style={`--inspector-width: ${inspectorWidth}px;`}
      >
        <div class="workbench-pane">
          <WorkbenchSection
            {strings}
            {viewMode}
            {renderedNotes}
            {canQuadrantReorder}
            formatDate={formatWorkspaceNoteDate}
            {restoreNote}
            {toggleArchive}
            {deleteNote}
            openEdit={openInspectorEdit}
            openView={openInspectorView}
            {togglePin}
            {toggleZOrder}
            {toggleWallpaperLayer}
            {toggleDone}
            {updatePriority}
            {updateTags}
            {persistReorderedVisible}
          />
        </div>
        {#if inspectorOpen && inspectorNote}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="inspector-splitter"
            onpointerdown={resizeController.startInspectorResize}
            ondblclick={() => (inspectorWidth = 430)}
          ></div>
          <WorkspaceNoteInspector
            {strings}
            note={inspectorNote}
            mode={inspectorMode}
            bind:draftText={inspectorDraftText}
            tagSuggestions={noteTagOptions}
            formatDate={formatWorkspaceNoteDate}
            onClose={handleInspectorClose}
            onStartEdit={startInspectorEdit}
            onCancelEdit={cancelInspectorEdit}
            onSave={saveInspectorEdit}
            onChangePriority={handleInspectorPriorityChange}
            onChangeTags={handleInspectorTagsChange}
          />
        {/if}
      </div>
    {/if}

    <section class="focus-pane" class:hidden={mainTab !== WORKSPACE_MAIN_TAB_FOCUS}>
      <WorkspaceFocusHub
        {strings}
        compact={stageLayout.focusCompact}
        tasks={focusTasks}
        stats={focusStats}
        selectedTaskId={focusSelectedTaskId}
        command={focusCommand}
        breakSession={focusBreakSession}
        {pomodoroConfig}
        onTasksChange={changeFocusTasks}
        onStatsChange={changeFocusStats}
        onBreakSessionChange={changeFocusBreakSession}
        onSelectedTaskIdChange={changeFocusSelectedTask}
        onPomodoroConfigChange={changePomodoroConfig}
      />
    </section>
  </main>
  </div>
</div>

<WorkspaceSettingsDialog
  {strings}
  bind:show={showWorkspaceSettings}
  {locale}
  {isAutostartEnabled}
  bind:showPanelOnStartup
  themePreset={workspaceTheme}
  themePresetOptions={workspaceThemePresetOptions}
  themeCustomCss={workspaceCustomCss}
  zoomOption={workspaceZoomOption}
  fontSize={workspaceFontSize}
  sidebarLayoutMode={workspaceSidebarLayoutMode}
  onChangeLanguage={setLanguage}
  {toggleAutostart}
  onSavePrefs={savePrefs}
  onChangeThemePreset={handleWorkspaceThemePresetChange}
  onExportThemeCss={exportWorkspaceThemeCss}
  onImportThemeCss={importWorkspaceThemeCss}
  onCopyDefaultThemeTemplate={copyWorkspaceDefaultThemeTemplate}
  onChangeThemeCustomCss={setWorkspaceCustomCss}
  onResetThemeCustomCss={resetWorkspaceCustomCss}
  onChangeZoomOption={setWorkspaceZoomOption}
  onChangeFontSize={setWorkspaceFontSize}
  onChangeSidebarLayoutMode={setWorkspaceSidebarLayoutMode}
/>

<svelte:window
  onpointermove={resizeController.onWindowPointerMove}
  onpointerup={resizeController.onWindowPointerUp}
  onpointercancel={() => {
    resizeController.cancelAllResizing();
  }}
/>

<style>
  .workspace-viewport {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .workspace-viewport.mac-windowed {
    border-radius: 18px;
    isolation: isolate;
  }

  .workspace {
    --ws-text-strong: #0f172a;
    --ws-text: #334155;
    --ws-muted: #64748b;
    --ws-accent: #1d4ed8;
    --ws-panel-bg: rgba(255, 255, 255, 0.86);
    --ws-card-bg: #fdfefe;
    --ws-btn-bg: #fbfdff;
    --ws-btn-hover: #f4f8ff;
    --ws-btn-active: linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%);
    --ws-badge-bg: #e8f0ff;
    --ws-badge-border: #d7e5ff;
    --ws-border: #dce5f3;
    --ws-border-soft: #d9e2ef;
    --ws-border-hover: #c6d5e8;
    --ws-border-active: #94a3b8;
    --ws-scrollbar-track: rgba(148, 163, 184, 0.14);
    --ws-scrollbar-thumb: rgba(71, 85, 105, 0.45);
    --ws-scrollbar-thumb-hover: rgba(51, 65, 85, 0.62);
    --ws-input-bg: #fbfdff;
    --ws-input-border: #d9e2ef;
    --ws-input-text: #0f172a;
    --ws-workspace-bg:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.09), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.08), transparent 32%),
      linear-gradient(165deg, #edf3ff 0%, #f7faff 46%, #fff8f1 100%);
    width: calc(100% / var(--ws-ui-scale, 1));
    height: calc(100% / var(--ws-ui-scale, 1));
    display: grid;
    grid-template-columns: var(--sidebar-width, 260px) 8px 1fr;
    background: var(--ws-workspace-bg);
    color: var(--ws-text-strong, #111827);
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    transform: scale(var(--ws-ui-scale, 1));
    transform-origin: top left;
    cursor: default;
    view-transition-name: workspace-root;
  }

  .workspace.mac-windowed {
    overflow: hidden;
    border-radius: 18px;
    background-clip: padding-box;
  }

  .workspace.theme-dark {
    --ws-text-strong: #e5ecf7;
    --ws-text: #c6d0dd;
    --ws-muted: #94a3b8;
    --ws-accent: #7aa2ff;
    --ws-panel-bg: rgba(16, 23, 36, 0.85);
    --ws-card-bg: #152033;
    --ws-btn-bg: #1a2740;
    --ws-btn-hover: #233454;
    --ws-btn-active: linear-gradient(180deg, #1d2f50 0%, #263a5a 100%);
    --ws-badge-bg: #1a2c49;
    --ws-badge-border: #2f4a75;
    --ws-border: #2b3a54;
    --ws-border-soft: #31445f;
    --ws-border-hover: #415981;
    --ws-border-active: #6389c9;
    --ws-scrollbar-track: rgba(148, 163, 184, 0.14);
    --ws-scrollbar-thumb: rgba(148, 163, 184, 0.42);
    --ws-scrollbar-thumb-hover: rgba(186, 201, 224, 0.58);
    --ws-input-bg: #12233a;
    --ws-input-border: #324561;
    --ws-input-text: #dbe7f7;
    --ws-workspace-bg:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.12), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.12), transparent 32%),
      linear-gradient(165deg, #0d1728 0%, #0f1d31 46%, #122034 100%);
  }

  .workspace :global(input),
  .workspace :global(select),
  .workspace :global(textarea) {
    color: var(--ws-input-text, var(--ws-text-strong, #0f172a));
    background: var(--ws-input-bg, var(--ws-btn-bg, #fbfdff));
    border-color: var(--ws-input-border, var(--ws-border-soft, #d9e2ef));
  }

  .main {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    cursor: default;
  }

  .focus-pane {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding-right: 1px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .focus-pane.hidden {
    display: none;
  }

  .focus-pane::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .focus-pane::-webkit-scrollbar-track {
    background: var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
    border-radius: 999px;
  }

  .focus-pane::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .workbench-shell {
    min-height: 0;
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .workbench-shell.inspector-open {
    grid-template-columns: minmax(0, 1fr) 8px minmax(340px, var(--inspector-width, 430px));
  }

  .workbench-shell.inspector-open.list-collapsed {
    grid-template-columns: 0 8px minmax(340px, 1fr);
  }

  .inspector-splitter {
    --inspector-splitter-hit-width: 30px;
    --inspector-splitter-visual-width: 8px;
    width: var(--inspector-splitter-hit-width);
    justify-self: center;
    border-radius: 999px;
    background: transparent;
    cursor: col-resize;
    min-height: 0;
    position: relative;
    touch-action: none;
    z-index: 3;
  }

  .inspector-splitter::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(15, 23, 42, 0.001);
  }

  .inspector-splitter::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--inspector-splitter-visual-width);
    transform: translate(-50%, -50%);
    height: 60px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 70%, transparent);
    opacity: 0.92;
    transition: background 0.15s ease, opacity 0.15s ease;
    pointer-events: none;
  }

  .inspector-splitter:hover::after {
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 46%, transparent);
    opacity: 1;
  }

  .workbench-pane {
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .workspace :global(button),
  .workspace :global([role="button"]) {
    cursor: pointer;
  }

  .workspace :global(.sidebar .block-title),
  .workspace :global(.sidebar .main-tab-btn),
  .workspace :global(.sidebar .view-btn),
  .workspace :global(.sidebar .tag-filter-btn),
  .workspace :global(.sidebar .initial-view-label),
  .workspace :global(.sidebar .initial-view-select),
  .workspace :global(.sidebar .ghost-btn),
  .workspace :global(.window-bar .title),
  .workspace :global(.window-bar .bar-btn),
  .workspace :global(.toolbar .add-input),
  .workspace :global(.toolbar .search),
  .workspace :global(.toolbar .primary-btn),
  .workspace :global(.toolbar .ghost-btn) {
    font-size: calc(1em * var(--ws-text-scale, 1)) !important;
  }

  .workspace :global(.window-bar) {
    padding: calc(8px * var(--ws-layout-scale, 1)) calc(10px * var(--ws-layout-scale, 1));
    gap: calc(8px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.window-bar .window-actions),
  .workspace :global(.window-bar .action-cluster) {
    gap: calc(6px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.window-bar .bar-btn) {
    min-height: calc(36px * var(--ws-layout-scale, 1));
    padding: 0 calc(10px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.window-bar .bar-btn.icon-btn) {
    width: calc(36px * var(--ws-layout-scale, 1));
    min-width: calc(36px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.toolbar) {
    padding: calc(10px * var(--ws-layout-scale, 1));
    gap: calc(8px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.toolbar .add-input),
  .workspace :global(.toolbar .search) {
    min-height: calc(40px * var(--ws-layout-scale, 1));
    padding: calc(9px * var(--ws-layout-scale, 1)) calc(10px * var(--ws-layout-scale, 1));
    border-radius: calc(12px * var(--ws-layout-scale, 1));
  }

  .workspace :global(.toolbar .primary-btn),
  .workspace :global(.toolbar .ghost-btn) {
    min-height: calc(38px * var(--ws-layout-scale, 1));
    padding: 0 calc(14px * var(--ws-layout-scale, 1));
  }

  .workspace :global(input),
  .workspace :global(textarea) {
    cursor: text;
  }

  .workspace :global(select) {
    cursor: pointer;
  }

  .sidebar-splitter {
    --splitter-hit-width: 30px;
    --splitter-visual-width: 8px;
    width: var(--splitter-hit-width);
    justify-self: center;
    border-radius: 999px;
    background: transparent;
    cursor: ew-resize;
    cursor: col-resize;
    min-height: 0;
    position: relative;
    touch-action: none;
    z-index: 3;
  }

  .sidebar-splitter::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(15, 23, 42, 0.001);
  }

  .sidebar-splitter::after {
    content: "";
    position: absolute;
    top: 46%;
    left: 50%;
    width: var(--splitter-visual-width);
    height: 70px;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 72%, transparent);
    opacity: 0.92;
    transition: background 0.15s ease, opacity 0.15s ease;
    pointer-events: none;
    cursor: inherit;
  }

  .sidebar-splitter:hover::after {
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 45%, transparent);
    opacity: 1;
  }

  @media (max-width: 920px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .sidebar-splitter {
      display: none;
    }

    .workbench-shell.inspector-open {
      grid-template-columns: minmax(0, 1fr);
    }

    .inspector-splitter {
      display: none;
    }
  }

  :global(html.ws-vt-running::view-transition) {
    background: transparent;
  }

  :global(html.ws-vt-running::view-transition-group(root)) {
    animation: none;
  }

  :global(html.ws-vt-running::view-transition-old(root)),
  :global(html.ws-vt-running::view-transition-new(root)) {
    animation: none;
    opacity: 0;
  }

  :global(html.ws-vt-running::view-transition-group(workspace-root)) {
    animation-duration: 760ms;
  }

  :global(html.ws-vt-running::view-transition-old(workspace-root)),
  :global(html.ws-vt-running::view-transition-new(workspace-root)) {
    animation: none;
    mix-blend-mode: normal;
  }

  :global(html.ws-vt-running[data-ws-vt-shape="circle"]::view-transition-new(workspace-root)) {
    clip-path: circle(0 at var(--ws-vt-x) var(--ws-vt-y));
    animation: ws-vt-circle-in 760ms cubic-bezier(0.22, 0.78, 0.17, 1) forwards;
  }

  :global(html.ws-vt-running[data-ws-vt-shape="heart"]::view-transition-new(workspace-root)) {
    --ws-heart-size: 0px;
    clip-path: polygon(
      var(--ws-vt-x) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.52)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.12)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.40)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.30)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.22)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.45)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.02)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.48)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.18)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.38)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.33)),
      calc(var(--ws-vt-x) - (var(--ws-heart-size) * 0.20)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.36)),
      var(--ws-vt-x) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.22)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.20)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.36)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.38)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.33)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.48)) calc(var(--ws-vt-y) - (var(--ws-heart-size) * 0.18)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.45)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.02)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.30)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.22)),
      calc(var(--ws-vt-x) + (var(--ws-heart-size) * 0.12)) calc(var(--ws-vt-y) + (var(--ws-heart-size) * 0.40))
    );
    animation: ws-vt-heart-in 820ms cubic-bezier(0.2, 0.78, 0.18, 1) forwards;
  }

  :global(html.ws-vt-running[data-ws-vt-shape="circle"]::view-transition-old(workspace-root)) {
    animation: ws-vt-old-fade 760ms ease forwards;
  }

  :global(html.ws-vt-running[data-ws-vt-shape="heart"]::view-transition-old(workspace-root)) {
    animation: ws-vt-old-fade-heart 760ms ease forwards;
  }

  @keyframes ws-vt-circle-in {
    to {
      clip-path: circle(180vmax at var(--ws-vt-x) var(--ws-vt-y));
    }
  }

  @property --ws-heart-size {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
  }

  @keyframes ws-vt-heart-in {
    0% {
      --ws-heart-size: 0px;
    }
    68% {
      --ws-heart-size: 206vmax;
    }
    100% {
      --ws-heart-size: 188vmax;
    }
  }

  @keyframes ws-vt-old-fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0.88;
    }
  }

  @keyframes ws-vt-old-fade-heart {
    0% {
      opacity: 1;
      filter: saturate(1);
    }
    100% {
      opacity: 0.84;
      filter: saturate(0.92);
    }
  }
</style>
