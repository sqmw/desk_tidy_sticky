<script>
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emit, listen } from "@tauri-apps/api/event";

  import { getStrings } from "$lib/strings.js";
  import { matchNote } from "$lib/note-search.js";
  import { expandNoteCommands, renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import { createWindowSync } from "$lib/panel/use-window-sync.js";
  import { createNoteCommands } from "$lib/panel/use-note-commands.js";
  import { switchPanelWindow } from "$lib/panel/switch-panel-window.js";

  import WorkbenchSection from "$lib/components/panel/WorkbenchSection.svelte";
  import WorkspaceFocusHub from "$lib/components/workspace/WorkspaceFocusHub.svelte";
  import WorkspaceWindowBar from "$lib/components/workspace/WorkspaceWindowBar.svelte";
  import WorkspaceSidebar from "$lib/components/workspace/WorkspaceSidebar.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";
  import WorkspaceNoteInspector from "$lib/components/workspace/WorkspaceNoteInspector.svelte";
  import {
    loadWorkspacePreferences,
    normalizePomodoroConfig,
    normalizeWorkspaceThemeTransitionShape,
    saveWorkspacePreferences,
  } from "$lib/workspace/preferences-service.js";
  import { tryStartWorkspaceWindowDrag } from "$lib/workspace/window-drag.js";
  import { runWorkspaceThemeTransition } from "$lib/workspace/theme-transition.js";
  import { createWorkspaceResizeController } from "$lib/workspace/resize-controller.js";
  import { getFocusDeadlinesForToday } from "$lib/workspace/focus/focus-deadlines.js";
  import {
    WORKSPACE_NOTE_VIEW_MODES,
    WORKSPACE_MAIN_TAB_FOCUS,
    WORKSPACE_MAIN_TAB_NOTES,
    normalizeWorkspaceMainTab,
    normalizeWorkspaceViewMode,
  } from "$lib/workspace/workspace-tabs.js";

  const SORT_MODES = ["custom", "newest", "oldest"];

  /** @type {any[]} */
  let notes = $state([]);
  let mainTab = $state(WORKSPACE_MAIN_TAB_NOTES);
  let sortMode = $state("custom");
  let viewMode = $state("active");
  let searchQuery = $state("");
  /** @type {string} */
  let locale = $state("en");
  let newNoteText = $state("");

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
  let workspaceTheme = $state("light");
  let themeTransitionShape = $state("circle");
  /** @type {any[]} */
  let focusTasks = $state([]);
  /** @type {Record<string, any>} */
  let focusStats = $state({});
  let focusSelectedTaskId = $state("");
  let pomodoroConfig = $state({
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
  });
  let sidebarCollapsed = $derived(sidebarWidth <= 104);

  const strings = $derived(getStrings(locale));
  const deadlineTasks = $derived(getFocusDeadlinesForToday(focusTasks, focusStats));

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
    let base = notes;
    if (viewMode === "active") {
      base = base.filter((n) => !n.isArchived && !n.isDeleted);
    } else if (viewMode === "todo") {
      base = base
        .filter((n) => !n.isArchived && !n.isDeleted)
        .sort((a, b) => {
          if (!!a.isDone !== !!b.isDone) return a.isDone ? 1 : -1;
          return String(b.updatedAt).localeCompare(String(a.updatedAt));
        });
    } else if (viewMode === "quadrant") {
      base = base.filter((n) => !n.isArchived && !n.isDeleted);
    } else if (viewMode === "archived") {
      base = base.filter((n) => n.isArchived && !n.isDeleted);
    } else {
      base = base.filter((n) => n.isDeleted);
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.trim();
    return base
      .map((n) => ({ note: n, ...matchNote(q, n.text) }))
      .filter((x) => x.matched)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.note);
  });

  const renderedNotes = $derived.by(() =>
    visibleNotes.map((n) => ({
      ...n,
      renderedHtml: renderNoteMarkdown(n.text || ""),
      priority: Number(n.priority || 4),
    })),
  );
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
    toggleArchive,
    deleteNote,
    restoreNote,
  } = createNoteCommands({
    invoke,
    getSortMode: () => sortMode,
    getViewMode: () => viewMode,
    getHideAfterSave: () => false,
    getNewNoteText: () => newNoteText,
    setNewNoteText: (v) => {
      newNoteText = v;
    },
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
      sortMode = next.sortMode;
      locale = next.locale;
      mainTab = next.mainTab;
      stickiesVisible = next.overlayEnabled;
      workspaceTheme = next.workspaceTheme;
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

  /** @param {any} note */
  function openInspectorView(note) {
    inspectorOpen = true;
    inspectorNoteId = note.id;
    inspectorMode = "view";
    inspectorDraftText = note.text || "";
  }

  /** @param {any} note */
  function openInspectorEdit(note) {
    inspectorOpen = true;
    inspectorNoteId = note.id;
    inspectorMode = "edit";
    inspectorDraftText = note.text || "";
  }

  function closeInspector() {
    inspectorOpen = false;
    inspectorNoteId = null;
    inspectorMode = "view";
    inspectorDraftText = "";
    inspectorListCollapsed = false;
  }

  async function handleInspectorClose() {
    if (inspectorNote && pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
      await discardPendingLongDocDraft(String(inspectorNote.id));
      return;
    }
    closeInspector();
  }

  function startInspectorEdit() {
    if (!inspectorNote) return;
    inspectorMode = "edit";
    inspectorDraftText = inspectorNote.text || "";
  }

  /**
   * @param {string} noteId
   */
  async function discardPendingLongDocDraft(noteId) {
    try {
      await invoke("permanently_delete_note", { id: noteId });
      await loadNotes();
      await windowSync.syncWindows();
    } catch (e) {
      console.error("discardPendingLongDocDraft(workspace)", e);
    } finally {
      pendingLongDocDraft = null;
      closeInspector();
    }
  }

  async function cancelInspectorEdit() {
    if (!inspectorNote) return;
    if (pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
      await discardPendingLongDocDraft(String(inspectorNote.id));
      return;
    }
    inspectorMode = "view";
    inspectorDraftText = inspectorNote.text || "";
  }

  async function saveInspectorEdit() {
    const transformed = expandNoteCommands(inspectorDraftText.trim()).trim();
    if (!inspectorNote || !transformed) {
      return;
    }
    try {
      await invoke("update_note_text", {
        id: inspectorNote.id,
        text: transformed,
        sortMode,
      });
      await loadNotes();
      inspectorMode = "view";
      inspectorDraftText = transformed;
      if (pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
        pendingLongDocDraft = null;
      }
    } catch (e) {
      console.error("saveInspectorEdit(workspace)", e);
    }
  }

  /** @param {string} mode */
  async function setViewMode(mode) {
    const safeMode = normalizeWorkspaceViewMode(mode);
    viewMode = safeMode;
    await savePrefs({ viewMode: safeMode });
    await loadNotes();
  }

  /** @param {string} tab */
  async function setMainTab(tab) {
    mainTab = normalizeWorkspaceMainTab(tab);
    if (mainTab !== WORKSPACE_MAIN_TAB_NOTES) {
      closeInspector();
    }
    await savePrefs({ workspaceMainTab: mainTab });
  }

  /** @param {string} taskId */
  async function handleDeadlineAction(taskId) {
    focusSelectedTaskId = String(taskId || "");
    await setMainTab(WORKSPACE_MAIN_TAB_FOCUS);
  }

  /** @param {string} mode */
  async function setSortMode(mode) {
    sortMode = mode;
    await savePrefs({ sortMode: mode });
    await loadNotes();
  }

  async function createLongDocument() {
    const raw = newNoteText.trim();
    const text = raw || (locale === "zh" ? "# 新文档\n\n" : "# New document\n\n");
    const beforeIds = new Set(notes.map((n) => String(n.id)));
    try {
      const next = await invoke("add_note", { text, isPinned: false, sortMode });
      if (Array.isArray(next)) {
        notes = next;
      } else {
        await loadNotes();
      }
      await windowSync.syncWindows();
      const source = Array.isArray(next) ? next : notes;
      const created = [...source]
        .filter((n) => !beforeIds.has(String(n.id)))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
      if (created) {
        pendingLongDocDraft = { id: String(created.id) };
        openInspectorEdit(created);
      }
      newNoteText = "";
      if (mainTab !== WORKSPACE_MAIN_TAB_NOTES) {
        await setMainTab(WORKSPACE_MAIN_TAB_NOTES);
      }
    } catch (e) {
      console.error("createLongDocument(workspace)", e);
    }
  }

  async function toggleLanguage() {
    locale = locale === "en" ? "zh" : "en";
    await savePrefs({ language: locale });
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

  /** @param {string} shape */
  async function changeThemeTransitionShape(shape) {
    themeTransitionShape = normalizeWorkspaceThemeTransitionShape(shape);
    await savePrefs({ workspaceThemeTransitionShape: themeTransitionShape });
  }

  /** @param {{focusMinutes:number;shortBreakMinutes:number;longBreakMinutes:number;longBreakEvery:number}} next */
  async function changePomodoroConfig(next) {
    const safe = normalizePomodoroConfig(next);
    pomodoroConfig = safe;
    await savePrefs({
      pomodoroFocusMinutes: safe.focusMinutes,
      pomodoroShortBreakMinutes: safe.shortBreakMinutes,
      pomodoroLongBreakMinutes: safe.longBreakMinutes,
      pomodoroLongBreakEvery: safe.longBreakEvery,
    });
  }

  /** @param {any[]} next */
  async function changeFocusTasks(next) {
    focusTasks = Array.isArray(next) ? next : [];
    await savePrefs({ focusTasksJson: JSON.stringify(focusTasks) });
  }

  /** @param {Record<string, any>} next */
  async function changeFocusStats(next) {
    focusStats = next && typeof next === "object" ? next : {};
    await savePrefs({ focusStatsJson: JSON.stringify(focusStats) });
  }

  /** @param {string} nextTaskId */
  function changeFocusSelectedTask(nextTaskId) {
    focusSelectedTaskId = String(nextTaskId || "");
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
    loadPrefs().then(loadNotes).then(() => emit("workspace_ready", { label: "workspace" }));
    getCurrentWindow()
      .isMaximized()
      .then((v) => {
        windowMaximized = !!v;
      })
      .catch(() => {});

    invoke("get_overlay_interaction")
      .then((state) => {
        interactionDisabled = /** @type {boolean} */ (state);
      })
      .catch(() => {});

    /** @type {Array<Promise<() => void>>} */
    const unsubs = [];
    let notesChangedTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

    unsubs.push(
      listen("notes_changed", () => {
        if (Date.now() < suppressNotesReloadUntil) return;
        if (notesChangedTimer) clearTimeout(notesChangedTimer);
        notesChangedTimer = setTimeout(() => {
          if (Date.now() < suppressNotesReloadUntil) return;
          loadNotes();
        }, 80);
      }),
    );

    unsubs.push(
      listen("overlay_input_changed", (event) => {
        interactionDisabled = /** @type {boolean} */ (event.payload);
      }),
    );

    return () => {
      if (notesChangedTimer) clearTimeout(notesChangedTimer);
      for (const p of unsubs) {
        Promise.resolve(p)
          .then((u) => u())
          .catch(() => {});
      }
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="workspace"
  class:theme-dark={workspaceTheme === "dark"}
  style={`--sidebar-width: ${sidebarWidth}px;`}
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
    {stickiesVisible}
    {interactionDisabled}
    focusDeadlines={deadlineTasks}
    onDeadlineAction={handleDeadlineAction}
    onToggleLanguage={toggleLanguage}
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
      onHide={hideWindow}
      onChangeThemeTransitionShape={changeThemeTransitionShape}
    />

    {#if mainTab === WORKSPACE_MAIN_TAB_NOTES}
      <WorkspaceToolbar
        {strings}
        bind:newNoteText
        bind:searchQuery
        {sortMode}
        sortModes={SORT_MODES}
        onSave={() => saveNote(false)}
        onCreateLongDoc={createLongDocument}
        onSetSortMode={setSortMode}
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
    height: 100vh;
    display: grid;
    grid-template-columns: var(--sidebar-width, 260px) 8px 1fr;
    background:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.09), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.08), transparent 32%),
      linear-gradient(165deg, #edf3ff 0%, #f7faff 46%, #fff8f1 100%);
    color: #111827;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
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
