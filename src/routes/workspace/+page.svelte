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
  import EditDialog from "$lib/components/panel/EditDialog.svelte";
  import WorkspaceWindowBar from "$lib/components/workspace/WorkspaceWindowBar.svelte";
  import WorkspaceSidebar from "$lib/components/workspace/WorkspaceSidebar.svelte";
  import WorkspaceToolbar from "$lib/components/workspace/WorkspaceToolbar.svelte";

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

  let showEditDialog = $state(false);
  /** @type {any} */
  let editingNote = $state(null);
  let editText = $state("");
  let suppressNotesReloadUntil = 0;
  let stickiesVisible = $state(true);
  let interactionDisabled = $state(false);
  let workspaceTheme = $state("light");
  let sidebarCollapsed = $state(false);

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
      sidebarCollapsed = !!p.workspaceSidebarCollapsed;
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
  function openEdit(note) {
    editingNote = note;
    editText = note.text;
    showEditDialog = true;
  }

  async function submitEdit() {
    const transformed = expandNoteCommands(editText.trim()).trim();
    if (!editingNote || !transformed) {
      showEditDialog = false;
      return;
    }
    try {
      await invoke("update_note_text", {
        id: editingNote.id,
        text: transformed,
        sortMode,
      });
      await loadNotes();
    } catch (e) {
      console.error("submitEdit(workspace)", e);
    }
    showEditDialog = false;
    editingNote = null;
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

  /** @param {HTMLElement} el */
  function isInteractiveTarget(el) {
    return !!el.closest(
      'button, input, select, textarea, a, [contenteditable="true"], .card, .actions, .note-text, .notes-list, .quadrant-list, [data-no-drag="true"]',
    );
  }

  /** @param {PointerEvent} e */
  async function startWorkspaceDragPointer(e) {
    if (e.button !== 0) return;
    const target = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target : null);
    if (target && isInteractiveTarget(target)) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error("startDragging(workspace) failed", err);
    }
  }

  async function toggleTheme() {
    workspaceTheme = workspaceTheme === "dark" ? "light" : "dark";
    await savePrefs({ workspaceTheme });
  }

  async function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    await savePrefs({ workspaceSidebarCollapsed: sidebarCollapsed });
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

  onMount(() => {
    loadPrefs().then(loadNotes).then(() => emit("workspace_ready", { label: "workspace" }));

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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="workspace"
  class:theme-dark={workspaceTheme === "dark"}
  class:sidebar-collapsed={sidebarCollapsed}
  onpointerdown={startWorkspaceDragPointer}
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

  <main class="main">
    <WorkspaceWindowBar
      {strings}
      sidebarCollapsed={sidebarCollapsed}
      theme={workspaceTheme}
      onDragStart={startWorkspaceDragPointer}
      onBackToCompact={switchToCompact}
      onHide={hideWindow}
      onToggleSidebar={toggleSidebar}
      onToggleTheme={toggleTheme}
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

    <WorkbenchSection
      {strings}
      {viewMode}
      {renderedNotes}
      {formatDate}
      {restoreNote}
      {toggleArchive}
      {deleteNote}
      {openEdit}
      {togglePin}
      {toggleZOrder}
      {toggleDone}
      {updatePriority}
    />
  </main>
</div>

<EditDialog {strings} bind:showEditDialog bind:editText {submitEdit} />

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
    height: 100vh;
    display: grid;
    grid-template-columns: 260px 1fr;
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

  .workspace.sidebar-collapsed {
    grid-template-columns: 86px 1fr;
  }

  @media (max-width: 920px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>
