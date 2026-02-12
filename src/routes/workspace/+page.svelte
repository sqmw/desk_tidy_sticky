<script>
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emit, listen } from "@tauri-apps/api/event";

  import { getStrings } from "$lib/strings.js";
  import { matchNote } from "$lib/note-search.js";
  import { renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import { createWindowSync } from "$lib/panel/use-window-sync.js";
  import { createNoteCommands } from "$lib/panel/use-note-commands.js";
  import { switchPanelWindow } from "$lib/panel/switch-panel-window.js";
  import { createWorkspaceInspectorActions } from "$lib/workspace/controllers/workspace-inspector-actions.js";
  import { createWorkspaceFocusActions } from "$lib/workspace/controllers/workspace-focus-actions.js";
  import { createWorkspaceRuntimeLifecycle } from "$lib/workspace/controllers/workspace-runtime-lifecycle.js";

  import WorkbenchSection from "$lib/components/panel/WorkbenchSection.svelte";
  import WorkspaceFocusHub from "$lib/components/workspace/WorkspaceFocusHub.svelte";
  import WorkspaceWindowBar from "$lib/components/workspace/WorkspaceWindowBar.svelte";
  import WorkspaceSidebar from "$lib/components/workspace/WorkspaceSidebar.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";
  import WorkspaceNoteInspector from "$lib/components/workspace/WorkspaceNoteInspector.svelte";
  import WorkspaceSettingsDialog from "$lib/components/workspace/WorkspaceSettingsDialog.svelte";
  import {
    loadWorkspacePreferences,
    normalizePomodoroConfig,
    normalizeWorkspaceFontSize,
    normalizeWorkspaceZoom,
    normalizeWorkspaceZoomMode,
    normalizeWorkspaceThemeTransitionShape,
    saveWorkspacePreferences,
  } from "$lib/workspace/preferences-service.js";
  import { tryStartWorkspaceWindowDrag } from "$lib/workspace/window-drag.js";
  import { runWorkspaceThemeTransition } from "$lib/workspace/theme-transition.js";
  import { createWorkspaceResizeController } from "$lib/workspace/resize-controller.js";
  import { getFocusDeadlinesForToday } from "$lib/workspace/focus/focus-deadlines.js";
  import { minutesToTime, timeToMinutes } from "$lib/workspace/focus/focus-model.js";
  import {
    WORKSPACE_NOTE_VIEW_MODES,
    WORKSPACE_MAIN_TAB_FOCUS,
    WORKSPACE_MAIN_TAB_NOTES,
    WORKSPACE_NOTE_VIEW_ACTIVE,
    WORKSPACE_NOTE_VIEW_ARCHIVED,
    WORKSPACE_NOTE_VIEW_QUADRANT,
    WORKSPACE_NOTE_VIEW_TODO,
    WORKSPACE_NOTE_VIEW_TRASH,
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
  let suppressNotesReloadUntil = 0;
  let stickiesVisible = $state(true);
  let interactionDisabled = $state(false);
  let showWorkspaceSettings = $state(false);
  let workspaceTheme = $state("light");
  let workspaceZoom = $state(1);
  let workspaceZoomMode = $state("manual");
  let workspaceFontSize = $state("medium");
  let themeTransitionShape = $state("circle");
  /** @type {any[]} */
  let focusTasks = $state([]);
  /** @type {Record<string, any>} */
  let focusStats = $state({});
  let focusSelectedTaskId = $state("");
  let focusCommand = $state({ nonce: 0, type: "select", taskId: "" });
  let deadlineNowTick = $state(Date.now());
  let viewportWidth = $state(1360);
  let viewportHeight = $state(860);
  let viewportDpr = $state(1);
  let pomodoroConfig = $state({
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
  });
  let sidebarCollapsed = $derived(sidebarWidth <= 104);
  const workspaceZoomOption = $derived(workspaceZoomMode === "auto" ? "auto" : String(workspaceZoom));
  const workspaceAdaptiveScale = $derived.by(() => {
    const safeWidth = Math.max(320, viewportWidth);
    const safeHeight = Math.max(320, viewportHeight);
    const sidebarReserved = Math.min(420, Math.max(180, sidebarWidth)) + 24;
    const windowChromeReserved = 42;
    const contentWidth = Math.max(640, safeWidth - sidebarReserved);
    const contentHeight = Math.max(540, safeHeight - windowChromeReserved);
    const widthRatio = contentWidth / 1180;
    const heightRatio = contentHeight / 860;
    const dprCompensation = viewportDpr >= 2 ? 1.07 : viewportDpr >= 1.5 ? 1.04 : viewportDpr >= 1.25 ? 1.02 : 1;
    const sidebarCompensation = sidebarCollapsed ? 1.02 : 1;
    const scale = Math.min(widthRatio, heightRatio) * dprCompensation * sidebarCompensation;
    return Math.max(0.88, Math.min(1.22, Number(scale.toFixed(2))));
  });
  const workspaceLayoutScale = $derived.by(() =>
    workspaceZoomMode === "auto" ? workspaceAdaptiveScale : normalizeWorkspaceZoom(workspaceZoom),
  );
  const workspaceFontPresetScale = $derived.by(() => {
    if (workspaceFontSize === "small") return 0.94;
    if (workspaceFontSize === "large") return 1.08;
    return 1;
  });
  const workspaceTextScale = $derived.by(() => Number(workspaceFontPresetScale.toFixed(3)));

  const strings = $derived(getStrings(locale));
  const deadlineTasks = $derived.by(() => {
    const now = new Date(deadlineNowTick);
    return getFocusDeadlinesForToday(focusTasks, focusStats, now);
  });
  const canQuadrantReorder = $derived(
    sortMode === "custom" && !searchQuery.trim() && viewMode === "quadrant",
  );

  /**
   * @param {any[]} source
   * @param {string} mode
   */
  function notesByView(source, mode) {
    if (mode === "active" || mode === "quadrant") {
      return source.filter((n) => !n.isArchived && !n.isDeleted);
    }
    if (mode === "todo") {
      return source.filter((n) => !n.isArchived && !n.isDeleted && !n.isDone);
    }
    if (mode === "archived") {
      return source.filter((n) => n.isArchived && !n.isDeleted);
    }
    return source.filter((n) => n.isDeleted);
  }

  /** @param {unknown} raw */
  function normalizeTag(raw) {
    return String(raw || "").trim().toLocaleLowerCase();
  }

  /**
   * @param {any} note
   * @param {string} tag
   */
  function noteHasTag(note, tag) {
    const needle = normalizeTag(tag);
    if (!needle || !Array.isArray(note?.tags)) return false;
    const tags = /** @type {any[]} */ (note.tags);
    return tags.some((/** @type {any} */ t) => normalizeTag(t) === needle);
  }

  /** @param {string} isoStr */
  function formatDate(isoStr) {
    const d = new Date(isoStr);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}-${day} ${h}:${min}`;
  }

  const visibleNotes = $derived.by(() => {
    let base = notesByView(notes, viewMode);

    if (selectedTag) {
      base = base.filter((n) => noteHasTag(n, selectedTag));
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.trim();
    return base
      .map((n) => {
        const tagText = Array.isArray(n.tags) ? n.tags.join(" ") : "";
        return { note: n, ...matchNote(q, `${n.text || ""}\n${tagText}`.trim()) };
      })
      .filter((x) => x.matched)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.note);
  });

  const noteTagEntries = $derived.by(() => {
    const scoped = notesByView(notes, viewMode);
    /** @type {Map<string, { tag: string; count: number }>} */
    const buckets = new Map();
    for (const note of scoped) {
      if (!Array.isArray(note?.tags)) continue;
      const seenInNote = new Set();
      for (const rawTag of note.tags) {
        const text = String(rawTag || "").trim();
        const key = normalizeTag(text);
        if (!key || seenInNote.has(key)) continue;
        seenInNote.add(key);
        const prev = buckets.get(key);
        if (prev) {
          prev.count += 1;
        } else {
          buckets.set(key, { tag: text, count: 1 });
        }
      }
    }
    return [...buckets.values()]
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag)))
      .slice(0, 24);
  });
  const noteTagOptions = $derived(noteTagEntries.map((x) => x.tag));

  const taggedNoteCount = $derived.by(() => {
    const scoped = notesByView(notes, viewMode);
    return scoped.filter((n) => {
      if (!Array.isArray(n?.tags)) return false;
      const tags = /** @type {any[]} */ (n.tags);
      return tags.some((/** @type {any} */ t) => String(t || "").trim());
    }).length;
  });

  const renderedNotes = $derived.by(() =>
    visibleNotes.map((n) => ({
      ...n,
      renderedHtml: renderNoteMarkdown(n.text || ""),
      priority: n.priority ?? null,
    })),
  );

  const noteViewCounts = $derived.by(() => {
    const activeNotes = notes.filter((n) => !n.isArchived && !n.isDeleted);
    return {
      [WORKSPACE_NOTE_VIEW_ACTIVE]: activeNotes.length,
      [WORKSPACE_NOTE_VIEW_TODO]: activeNotes.filter((n) => !n.isDone).length,
      [WORKSPACE_NOTE_VIEW_QUADRANT]: activeNotes.length,
      [WORKSPACE_NOTE_VIEW_ARCHIVED]: notes.filter((n) => n.isArchived && !n.isDeleted).length,
      [WORKSPACE_NOTE_VIEW_TRASH]: notes.filter((n) => n.isDeleted).length,
    };
  });

  const inspectorNote = $derived.by(() => {
    if (!inspectorNoteId) return null;
    return renderedNotes.find((n) => n.id === inspectorNoteId) ?? null;
  });

  const windowSync = createWindowSync({
    getNotes: () => notes,
    getStickiesVisible: () => stickiesVisible,
    invoke,
  });

  const {
    loadNotes,
    saveNote,
    togglePin,
    toggleZOrder,
    toggleDone,
    updatePriority,
    updateTags,
    toggleArchive,
    deleteNote,
    restoreNote,
    persistReorderedVisible,
  } = createNoteCommands({
    invoke,
    getSortMode: () => sortMode,
    getViewMode: () => viewMode,
    getHideAfterSave: () => false,
    getNewNoteText: () => newNoteText,
    setNewNoteText: (v) => {
      newNoteText = v;
    },
    getNewNotePriority: () => newNotePriority,
    setNewNotePriority: (v) => {
      newNotePriority = v;
    },
    getNewNoteTags: () => newNoteTags,
    setNewNoteTags: (v) => {
      newNoteTags = v;
    },
    getSelectedTag: () => selectedTag,
    getNotes: () => notes,
    setNotes: (v) => {
      notes = v;
    },
    suppressNotesReload: (ms) => {
      suppressNotesReloadUntil = Date.now() + ms;
    },
    syncWindows: windowSync.syncWindows,
    openNoteWindow: windowSync.openNoteWindow,
    closeNoteWindow: windowSync.closeNoteWindow,
    getCurrentWindow,
  });

  async function loadPrefs() {
    try {
      const next = await loadWorkspacePreferences(invoke);
      viewMode = normalizeWorkspaceViewMode(next.viewMode);
      initialViewMode = normalizeWorkspaceInitialViewMode(next.initialViewMode);
      sortMode = next.sortMode;
      locale = next.locale;
      mainTab = next.mainTab;
      stickiesVisible = next.overlayEnabled;
      workspaceTheme = next.workspaceTheme;
      workspaceZoom = next.workspaceZoom;
      workspaceZoomMode = next.workspaceZoomMode;
      workspaceFontSize = next.workspaceFontSize;
      themeTransitionShape = next.themeTransitionShape;
      focusTasks = next.focusTasks;
      focusStats = next.focusStats;
      pomodoroConfig = next.pomodoroConfig;
    } catch (e) {
      console.error("loadPrefs(workspace)", e);
    }
  }

  /** @param {any} updates */
  async function savePrefs(updates) {
    try {
      await saveWorkspacePreferences(invoke, updates);
    } catch (e) {
      console.error("savePrefs(workspace)", e);
    }
  }

  const inspectorActions = createWorkspaceInspectorActions({
    invoke,
    loadNotes,
    syncWindows: windowSync.syncWindows,
    getSortMode: () => sortMode,
    getLocale: () => locale,
    getMainTab: () => mainTab,
    setMainTab,
    notesTabKey: WORKSPACE_MAIN_TAB_NOTES,
    getNotes: () => notes,
    setNotes: (next) => {
      notes = next;
    },
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
  });

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

  const focusActions = createWorkspaceFocusActions({
    normalizePomodoroConfig,
    savePrefs,
    getFocusTasks: () => focusTasks,
    setFocusTasks: (next) => {
      focusTasks = next;
    },
    setFocusStats: (next) => {
      focusStats = next;
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
  });

  const {
    changePomodoroConfig,
    changeFocusTasks,
    changeFocusStats,
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

  /** @param {string} mode */
  async function setViewMode(mode) {
    const safeMode = normalizeWorkspaceViewMode(mode);
    viewMode = safeMode;
    if (safeMode === WORKSPACE_NOTE_VIEW_TRASH) {
      selectedTag = "";
    }
    await savePrefs({ viewMode: safeMode });
    await loadNotes();
  }

  /** @param {string} tag */
  function setSelectedTag(tag) {
    selectedTag = String(tag || "").trim();
  }

  /** @param {string} mode */
  async function setInitialViewMode(mode) {
    const safeMode = normalizeWorkspaceInitialViewMode(mode);
    initialViewMode = safeMode;
    await savePrefs({ workspaceInitialViewMode: safeMode });
    if (safeMode !== "last") {
      await setViewMode(safeMode);
    }
  }

  /** @param {string} tab */
  async function setMainTab(tab) {
    mainTab = normalizeWorkspaceMainTab(tab);
    if (mainTab !== WORKSPACE_MAIN_TAB_NOTES) {
      closeInspector();
    }
    await savePrefs({ workspaceMainTab: mainTab });
  }

  /** @param {string} mode */
  async function setSortMode(mode) {
    sortMode = mode;
    await savePrefs({ sortMode: mode });
    await loadNotes();
  }

  /** @param {string} nextLocale */
  async function setLanguage(nextLocale) {
    const safe = nextLocale === "zh" ? "zh" : "en";
    locale = safe;
    await savePrefs({ language: safe });
  }

  async function switchToCompact() {
    await switchPanelWindow("compact", invoke);
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
    const nextTheme = workspaceTheme === "dark" ? "light" : "dark";
    await runWorkspaceThemeTransition({
      doc: document,
      shape: themeTransitionShape,
      onApplyTheme: () => {
        workspaceTheme = nextTheme;
      },
    });
    workspaceTheme = nextTheme;
    await savePrefs({ workspaceTheme: nextTheme });
  }

  /**
   * @param {unknown} zoom
   * @param {{ persist?: boolean }} [options]
   */
  async function setWorkspaceZoom(zoom, options = {}) {
    const persist = options.persist ?? true;
    const nextZoom = normalizeWorkspaceZoom(zoom);
    workspaceZoom = nextZoom;
    workspaceZoomMode = "manual";
    if (persist) {
      await savePrefs({ workspaceZoom: nextZoom, workspaceZoomMode: "manual" });
    }
  }

  /** @param {string} option */
  async function setWorkspaceZoomOption(option) {
    const safeMode = normalizeWorkspaceZoomMode(option);
    if (option === "auto") {
      workspaceZoomMode = safeMode;
      await savePrefs({ workspaceZoomMode: "auto", workspaceZoom });
      return;
    }
    await setWorkspaceZoom(Number(option), { persist: true });
  }

  /** @param {string} size */
  async function setWorkspaceFontSize(size) {
    const safeSize = normalizeWorkspaceFontSize(size);
    workspaceFontSize = safeSize;
    await savePrefs({ workspaceFontSize: safeSize });
  }

  function refreshViewportMetrics() {
    viewportWidth = Math.max(1, window.innerWidth || 1);
    viewportHeight = Math.max(1, window.innerHeight || 1);
    viewportDpr = Math.max(1, window.devicePixelRatio || 1);
  }

  function onWindowResize() {
    refreshViewportMetrics();
  }

  /** @param {string} shape */
  async function changeThemeTransitionShape(shape) {
    themeTransitionShape = normalizeWorkspaceThemeTransitionShape(shape);
    await savePrefs({ workspaceThemeTransitionShape: themeTransitionShape });
  }

  async function toggleInteraction() {
    try {
      const newState = await invoke("toggle_overlay_interaction");
      interactionDisabled = /** @type {boolean} */ (newState);
    } catch (e) {
      console.error("toggleInteraction(workspace)", e);
    }
  }

  async function toggleStickiesVisibility() {
    try {
      stickiesVisible = !stickiesVisible;
      await savePrefs({ overlayEnabled: stickiesVisible });
      if (stickiesVisible) await loadNotes();
      await windowSync.syncWindows();
    } catch (e) {
      console.error("toggleStickiesVisibility(workspace)", e);
    }
  }

  async function toggleWindowMaximize() {
    try {
      const win = getCurrentWindow();
      await win.toggleMaximize();
      windowMaximized = await win.isMaximized();
    } catch (e) {
      console.error("toggleWindowMaximize(workspace)", e);
    }
  }

  async function hideWindow() {
    try {
      await getCurrentWindow().hide();
    } catch (e) {
      console.error("hideWindow(workspace)", e);
    }
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

  const resizeController = createWorkspaceResizeController({
    getWorkbenchShellRect: () => workbenchShellEl?.getBoundingClientRect() ?? null,
    getInspectorOpen: () => inspectorOpen,
    getInspectorListCollapsed: () => inspectorListCollapsed,
    setInspectorLayout: (next) => {
      inspectorListCollapsed = next.collapsed;
      inspectorWidth = next.width;
    },
    getSidebarWidth: () => sidebarWidth,
    setSidebarWidth: (nextWidth) => {
      sidebarWidth = nextWidth;
    },
  });

  onMount(() => {
    refreshViewportMetrics();
    runtimeLifecycle.bootstrap();
    runtimeLifecycle.syncWindowMaximizedState((next) => {
      windowMaximized = next;
    });
    runtimeLifecycle.syncOverlayInteractionState();
    let cleanup = /** @type {(() => void) | null} */ (null);
    runtimeLifecycle.mountRuntimeListeners().then((fn) => {
      cleanup = fn;
    });
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
      cleanup?.();
    };
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
    const exists = noteTagEntries.some((x) => normalizeTag(x.tag) === normalizeTag(selectedTag));
    if (!exists) {
      selectedTag = "";
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="workspace-viewport">
  <div
    class="workspace"
    class:theme-dark={workspaceTheme === "dark"}
    style={`--sidebar-width: ${sidebarWidth}px; --ws-ui-scale: ${workspaceLayoutScale}; --ws-layout-scale: 1; --ws-text-scale: ${workspaceTextScale};`}
  >
  <WorkspaceSidebar
    {strings}
    {mainTab}
    viewModes={WORKSPACE_NOTE_VIEW_MODES}
    {viewMode}
    collapsed={sidebarCollapsed}
    onDragStart={startWorkspaceDragPointer}
    onSetMainTab={setMainTab}
    onSetViewMode={setViewMode}
    onSetSortMode={setSortMode}
    onSetSelectedTag={setSelectedTag}
    onSetInitialViewMode={setInitialViewMode}
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
      theme={workspaceTheme}
      isMaximized={windowMaximized}
      {themeTransitionShape}
      onDragStart={startWorkspaceDragPointer}
      onBackToCompact={switchToCompact}
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
            {formatDate}
            {restoreNote}
            {toggleArchive}
            {deleteNote}
            openEdit={openInspectorEdit}
            openView={openInspectorView}
            {togglePin}
            {toggleZOrder}
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
            {formatDate}
            onClose={handleInspectorClose}
            onStartEdit={startInspectorEdit}
            onCancelEdit={cancelInspectorEdit}
            onSave={saveInspectorEdit}
            onChangePriority={handleInspectorPriorityChange}
            onChangeTags={handleInspectorTagsChange}
          />
        {/if}
      </div>
    {:else}
      <section class="focus-pane">
        <WorkspaceFocusHub
          {strings}
          tasks={focusTasks}
          stats={focusStats}
          selectedTaskId={focusSelectedTaskId}
          command={focusCommand}
          {pomodoroConfig}
          onTasksChange={changeFocusTasks}
          onStatsChange={changeFocusStats}
          onSelectedTaskIdChange={changeFocusSelectedTask}
          onPomodoroConfigChange={changePomodoroConfig}
        />
      </section>
    {/if}
  </main>
  </div>
</div>

<WorkspaceSettingsDialog
  {strings}
  bind:show={showWorkspaceSettings}
  {locale}
  zoomOption={workspaceZoomOption}
  fontSize={workspaceFontSize}
  onChangeLanguage={setLanguage}
  onChangeZoomOption={setWorkspaceZoomOption}
  onChangeFontSize={setWorkspaceFontSize}
/>

<svelte:window
  onpointermove={resizeController.onWindowPointerMove}
  onpointerup={resizeController.onWindowPointerUp}
  onpointercancel={() => {
    resizeController.cancelAllResizing();
  }}
/>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .workspace-viewport {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
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
    width: calc(100% / var(--ws-ui-scale, 1));
    height: calc(100% / var(--ws-ui-scale, 1));
    display: grid;
    grid-template-columns: var(--sidebar-width, 260px) 8px 1fr;
    background:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.09), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.08), transparent 32%),
      linear-gradient(165deg, #edf3ff 0%, #f7faff 46%, #fff8f1 100%);
    color: #111827;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    font-size: 14px;
    transform: scale(var(--ws-ui-scale, 1));
    transform-origin: top left;
    cursor: default;
    view-transition-name: workspace-root;
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
    background:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.12), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.12), transparent 32%),
      linear-gradient(165deg, #0d1728 0%, #0f1d31 46%, #122034 100%);
    color: #dbe7f7;
  }

  .workspace.theme-dark :global(input),
  .workspace.theme-dark :global(select),
  .workspace.theme-dark :global(textarea) {
    color: #dbe7f7;
    background: #12233a;
    border-color: #324561;
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
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 70%, transparent);
    cursor: col-resize;
    min-height: 0;
    position: relative;
  }

  .inspector-splitter::after {
    content: "";
    position: absolute;
    left: 2px;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    height: 60px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 46%, transparent);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .inspector-splitter:hover::after {
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
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 72%, transparent);
    cursor: col-resize;
    min-height: 0;
    position: relative;
  }

  .sidebar-splitter::after {
    content: "";
    position: absolute;
    top: 46%;
    left: 2px;
    right: 2px;
    height: 70px;
    transform: translateY(-50%);
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 45%, transparent);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .sidebar-splitter:hover::after {
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
