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
  import WorkspaceWindowBar from "$lib/components/workspace/WorkspaceWindowBar.svelte";
  import WorkspaceSidebar from "$lib/components/workspace/WorkspaceSidebar.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";
  import WorkspaceNoteInspector from "$lib/components/workspace/WorkspaceNoteInspector.svelte";
  import WorkspaceThemeTransition from "$lib/components/workspace/WorkspaceThemeTransition.svelte";
  import { calcInspectorLayout, calcSidebarWidth } from "$lib/workspace/layout-resize.js";

  const NOTE_VIEW_MODES = ["active", "todo", "quadrant", "archived", "trash"];
  const SORT_MODES = ["custom", "newest", "oldest"];

  /** @type {any[]} */
  let notes = $state([]);
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
  let inspectorWidth = $state(430);
  let inspectorListCollapsed = $state(false);
  let isResizingInspector = $state(false);
  let resizePointerId = $state(-1);
  let sidebarWidth = $state(260);
  let isResizingSidebar = $state(false);
  let sidebarResizePointerId = $state(-1);
  let windowMaximized = $state(false);
  /** @type {HTMLDivElement | null} */
  let workbenchShellEl = $state(null);
  let suppressNotesReloadUntil = 0;
  let stickiesVisible = $state(true);
  let interactionDisabled = $state(false);
  let workspaceTheme = $state("light");
  let themeTransitionShape = $state("circle");
  let transitionActive = $state(false);
  let transitionX = $state(0);
  let transitionY = $state(0);
  let transitionTargetTheme = $state("light");
  let sidebarCollapsed = $derived(sidebarWidth <= 104);

  const strings = $derived(getStrings(locale));

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
      const p = await invoke("get_preferences");
      viewMode = p.viewMode || "active";
      sortMode = p.sortMode || "custom";
      locale = p.language || "en";
      workspaceTheme = p.workspaceTheme === "dark" ? "dark" : "light";
      themeTransitionShape = p.workspaceThemeTransitionShape === "heart" ? "heart" : "circle";
    } catch (e) {
      console.error("loadPrefs(workspace)", e);
    }
  }

  /** @param {any} updates */
  async function savePrefs(updates) {
    try {
      const p = await invoke("get_preferences");
      await invoke("set_preferences", { prefs: { ...p, ...updates } });
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

  function startInspectorEdit() {
    if (!inspectorNote) return;
    inspectorMode = "edit";
    inspectorDraftText = inspectorNote.text || "";
  }

  function cancelInspectorEdit() {
    if (!inspectorNote) return;
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
    } catch (e) {
      console.error("saveInspectorEdit(workspace)", e);
    }
  }

  /** @param {string} mode */
  async function setViewMode(mode) {
    viewMode = mode;
    await savePrefs({ viewMode: mode });
    await loadNotes();
  }

  /** @param {string} mode */
  async function setSortMode(mode) {
    sortMode = mode;
    await savePrefs({ sortMode: mode });
    await loadNotes();
  }

  async function toggleLanguage() {
    locale = locale === "en" ? "zh" : "en";
    await savePrefs({ language: locale });
  }

  async function switchToCompact() {
    await switchPanelWindow("compact", invoke);
  }

  async function hideWindow() {
    await getCurrentWindow().hide();
  }

  /** @param {Element} el */
  function isInteractiveTarget(el) {
    return !!el.closest(
      'button, input, select, textarea, a, [contenteditable="true"], .card, .actions, .note-text, .notes-list, .quadrant-list, [data-no-drag="true"]',
    );
  }

  /** @param {PointerEvent} e */
  async function startWorkspaceDragPointer(e) {
    if (e.button !== 0) return;
    const target = /** @type {Element | null} */ (e.target instanceof Element ? e.target : null);
    if (target && isInteractiveTarget(target)) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error("startDragging(workspace) failed", err);
    }
  }

  /** @param {MouseEvent | undefined} e */
  async function toggleTheme(e) {
    const nextTheme = workspaceTheme === "dark" ? "light" : "dark";
    const btn = /** @type {HTMLElement | null} */ (e?.currentTarget instanceof HTMLElement ? e.currentTarget : null);
    const rect = btn?.getBoundingClientRect();
    transitionX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    transitionY = rect ? rect.top + rect.height / 2 : 48;
    transitionTargetTheme = nextTheme;
    transitionActive = false;
    queueMicrotask(() => {
      transitionActive = true;
    });

    workspaceTheme = nextTheme;
    await savePrefs({ workspaceTheme });
    setTimeout(() => {
      transitionActive = false;
    }, 620);
  }

  /** @param {string} shape */
  async function changeThemeTransitionShape(shape) {
    themeTransitionShape = shape === "heart" ? "heart" : "circle";
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

  function endInspectorResize() {
    isResizingInspector = false;
    resizePointerId = -1;
  }

  function endSidebarResize() {
    isResizingSidebar = false;
    sidebarResizePointerId = -1;
  }

  /** @param {number} clientX */
  function applyInspectorResizeByClientX(clientX) {
    if (!workbenchShellEl) return;
    const rect = workbenchShellEl.getBoundingClientRect();
    const next = calcInspectorLayout({ clientX, rect, isCollapsed: inspectorListCollapsed });
    inspectorListCollapsed = next.collapsed;
    inspectorWidth = next.width;
  }

  /** @param {PointerEvent} e */
  function startInspectorResize(e) {
    if (e.button !== 0) return;
    if (!inspectorOpen) return;
    isResizingInspector = true;
    resizePointerId = e.pointerId;
    const target = /** @type {HTMLElement | null} */ (e.currentTarget);
    target?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  /** @param {number} clientX */
  function applySidebarResizeByClientX(clientX) {
    sidebarWidth = calcSidebarWidth(clientX);
  }

  /** @param {PointerEvent} e */
  function startSidebarResize(e) {
    if (e.button !== 0) return;
    isResizingSidebar = true;
    sidebarResizePointerId = e.pointerId;
    const target = /** @type {HTMLElement | null} */ (e.currentTarget);
    target?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  /** @param {PointerEvent} e */
  function onWindowPointerMove(e) {
    if (isResizingSidebar) {
      if (sidebarResizePointerId !== -1 && e.pointerId !== sidebarResizePointerId) return;
      applySidebarResizeByClientX(e.clientX);
      return;
    }
    if (isResizingInspector) {
      if (resizePointerId !== -1 && e.pointerId !== resizePointerId) return;
      applyInspectorResizeByClientX(e.clientX);
    }
  }

  /** @param {PointerEvent} e */
  function onWindowPointerUp(e) {
    if (isResizingSidebar) {
      if (sidebarResizePointerId !== -1 && e.pointerId !== sidebarResizePointerId) return;
      applySidebarResizeByClientX(e.clientX);
      if (sidebarWidth <= 120) sidebarWidth = 86;
      endSidebarResize();
      return;
    }
    if (isResizingInspector) {
      if (resizePointerId !== -1 && e.pointerId !== resizePointerId) return;
      applyInspectorResizeByClientX(e.clientX);
      endInspectorResize();
    }
  }

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
    viewModes={NOTE_VIEW_MODES}
    {viewMode}
    collapsed={sidebarCollapsed}
    onDragStart={startWorkspaceDragPointer}
    onSetViewMode={setViewMode}
    {stickiesVisible}
    onToggleLanguage={toggleLanguage}
    onToggleStickiesVisibility={toggleStickiesVisibility}
    onToggleInteraction={toggleInteraction}
    onHideWindow={hideWindow}
  />
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sidebar-splitter" onpointerdown={startSidebarResize} ondblclick={() => (sidebarWidth = 260)}></div>

  <main class="main">
    <WorkspaceWindowBar
      {strings}
      theme={workspaceTheme}
      isMaximized={windowMaximized}
      {themeTransitionShape}
      onDragStart={startWorkspaceDragPointer}
      onBackToCompact={switchToCompact}
      onHide={hideWindow}
      onToggleMaximize={toggleWindowMaximize}
      onToggleTheme={toggleTheme}
      onChangeThemeTransitionShape={changeThemeTransitionShape}
    />

    <WorkspaceToolbar
      {strings}
      bind:newNoteText
      bind:searchQuery
      {sortMode}
      sortModes={SORT_MODES}
      onSave={() => saveNote(false)}
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
        <div class="inspector-splitter" onpointerdown={startInspectorResize} ondblclick={() => (inspectorWidth = 430)}></div>
        <WorkspaceNoteInspector
          {strings}
          note={inspectorNote}
          mode={inspectorMode}
          bind:draftText={inspectorDraftText}
          {formatDate}
          onClose={closeInspector}
          onStartEdit={startInspectorEdit}
          onCancelEdit={cancelInspectorEdit}
          onSave={saveInspectorEdit}
        />
      {/if}
    </div>
  </main>
</div>

<WorkspaceThemeTransition
  active={transitionActive}
  shape={themeTransitionShape}
  x={transitionX}
  y={transitionY}
  targetTheme={transitionTargetTheme}
/>

<svelte:window
  onpointermove={onWindowPointerMove}
  onpointerup={onWindowPointerUp}
  onpointercancel={() => {
    endSidebarResize();
    endInspectorResize();
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
</style>
