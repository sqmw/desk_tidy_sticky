<script>
  import { onMount, tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    enable as autostartEnable,
    disable as autostartDisable,
    isEnabled as autostartIsEnabled,
  } from "@tauri-apps/plugin-autostart";
  import { listen } from "@tauri-apps/api/event";

  import { getStrings } from "$lib/strings.js";
  import { matchNote } from "$lib/note-search.js";
  import { expandNoteCommands, renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import { createWindowSync } from "$lib/panel/use-window-sync.js";
  import { createNoteCommands } from "$lib/panel/use-note-commands.js";
  import { createDragReorder } from "$lib/panel/use-drag-reorder.js";
  import { switchPanelWindow } from "$lib/panel/switch-panel-window.js";
  import { getPreferences, updatePreferences } from "$lib/preferences/preferences-store.js";
  import PanelHeader from "$lib/components/panel/PanelHeader.svelte";
  import NotesSection from "$lib/components/panel/NotesSection.svelte";
  import EditDialog from "$lib/components/panel/EditDialog.svelte";
  import SettingsDialog from "$lib/components/panel/SettingsDialog.svelte";

  const NOTE_VIEW_MODES = ["active", "todo", "quadrant", "archived", "trash"];

  /** @type {any[]} */
  let notes = $state([]);
  let sortMode = $state("custom");
  let viewMode = $state("active");
  let searchQuery = $state("");
  let hideAfterSave = $state(true);
  let windowPinned = $state(false);
  let glassOpacity = $state(0.18);
  /** @type {string} */
  let locale = $state("en");
  let newNoteText = $state("");
  let showEditDialog = $state(false);
  /** @type {any} */
  let editingNote = $state(null);
  let editText = $state("");
  let showSettings = $state(false);
  let isAutostartEnabled = $state(false);
  let showPanelOnStartup = $state(false);

  /** @type {HTMLDivElement | null} */
  let notesListEl = $state(null);
  /** @type {HTMLInputElement | null} */
  let noteInputEl = $state(null);

  let interactionDisabled = $state(false);
  let stickiesVisible = $state(true);
  let isSortMenuOpen = $state(false);
  let suppressNotesReloadUntil = 0;

  let drag = $state({
    draggedNoteId: /** @type {string | null} */ (null),
    dragTargetIndex: /** @type {number | null} */ (null),
    dragPreviewNotes: /** @type {any[] | null} */ (null),
    dragGhostTop: 0,
    dragGhostLeft: 0,
    dragGhostWidth: 0,
    dragPointerOffsetY: 0,
    verticalDragStartY: /** @type {number | null} */ (null),
  });

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

  const canReorder = $derived(
    sortMode === "custom" && viewMode === "active" && !searchQuery.trim(),
  );
  const renderedNotes = $derived.by(() =>
    (drag.dragPreviewNotes ?? visibleNotes).map((n) => ({
      ...n,
      renderedHtml: renderNoteMarkdown(n.text || ""),
      priority: n.priority ?? null,
    })),
  );
  const draggedNote = $derived.by(() => {
    if (!drag.draggedNoteId) return null;
    return renderedNotes.find((n) => n.id === drag.draggedNoteId) ?? null;
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
    emptyTrash,
    persistReorderedVisible,
  } = createNoteCommands({
    invoke,
    getSortMode: () => sortMode,
    getViewMode: () => viewMode,
    getHideAfterSave: () => hideAfterSave,
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

  const {
    createVerticalDragStartHandler,
    createVerticalDragMoveHandler,
    createVerticalDragEndHandler,
    handleWindowPointerUp,
    handleWindowPointerCancel,
  } = createDragReorder({
    drag,
    getCanReorder: () => canReorder,
    getVisibleNotes: () => visibleNotes,
    getNotesListEl: () => notesListEl,
    persistReorderedVisible,
  });

  async function loadPrefs() {
    try {
      const p = await getPreferences(invoke);
      hideAfterSave = p.hideAfterSave ?? true;
      viewMode = p.viewMode || "active";
      sortMode = p.sortMode || "custom";
      glassOpacity = p.glassOpacity ?? 0.18;
      locale = p.language || "en";
      showPanelOnStartup = p.showPanelOnStartup ?? false;
      stickiesVisible = p.overlayEnabled ?? true;
    } catch (e) {
      console.error("loadPrefs", e);
    }
  }

  /** @param {any} updates */
  async function savePrefs(updates) {
    try {
      await updatePreferences(invoke, updates);
    } catch (e) {
      console.error("savePrefs", e);
    }
  }

  async function initAutostart() {
    try {
      isAutostartEnabled = await autostartIsEnabled();
    } catch (e) {
      console.error("initAutostart", e);
    }
  }

  /** @param {boolean} enabled */
  async function toggleAutostart(enabled) {
    try {
      if (enabled) {
        await autostartEnable();
      } else {
        await autostartDisable();
      }
      isAutostartEnabled = await autostartIsEnabled();
    } catch (e) {
      console.error("toggleAutostart", e);
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
      console.error("submitEdit", e);
    }
    showEditDialog = false;
    editingNote = null;
  }

  async function toggleWindowPinned() {
    windowPinned = !windowPinned;
    const win = getCurrentWindow();
    await win.setAlwaysOnTop(windowPinned);
  }

  async function toggleLanguage() {
    locale = locale === "en" ? "zh" : "en";
    await savePrefs({ language: locale });
    updateTrayMenu();
  }

  async function updateTrayMenu() {
    try {
      await invoke("update_tray_texts", { texts: strings });
    } catch (e) {
      console.error("updateTrayMenu", e);
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

  /** @param {number} delta */
  async function adjustGlass(delta) {
    const next = Math.max(0.05, Math.min(1, glassOpacity + delta));
    glassOpacity = next;
    await savePrefs({ glassOpacity: next });
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === "Escape") {
      newNoteText = "";
      getCurrentWindow().hide();
    } else if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      saveNote(true);
    }
  }

  async function focusNewNoteInput() {
    await tick();
    noteInputEl?.focus();
    noteInputEl?.select();
  }

  /** @param {MouseEvent} e */
  async function startWindowDrag(e) {
    if (e.button !== 0) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error("startDragging failed", err);
    }
  }

  /** @param {PointerEvent} e */
  async function startWindowDragPointer(e) {
    // @ts-ignore
    await startWindowDrag(e);
  }

  async function toggleInteraction() {
    try {
      const newState = await invoke("toggle_overlay_interaction");
      interactionDisabled = /** @type {boolean} */ (newState);
    } catch (e) {
      console.error("toggleInteraction", e);
    }
  }

  async function toggleStickiesVisibility() {
    try {
      stickiesVisible = !stickiesVisible;
      await savePrefs({ overlayEnabled: stickiesVisible });
      if (stickiesVisible) {
        await loadNotes();
      }
      await windowSync.syncWindows();
    } catch (e) {
      console.error("toggleStickiesVisibility", e);
    }
  }

  async function hideWindow() {
    await getCurrentWindow().hide();
  }

  async function switchToWorkspace() {
    await switchPanelWindow("workspace", invoke);
  }

  $effect(() => {
    loadPrefs().then(() => {
      loadNotes();
      updateTrayMenu();
    });
  });

  $effect(() => {
    if (showSettings) initAutostart();
  });

  onMount(() => {
    invoke("get_overlay_interaction")
      .then((state) => {
        interactionDisabled = /** @type {boolean} */ (state);
      })
      .catch((e) => console.error("get_overlay_interaction", e));

    /** @type {Array<Promise<() => void>>} */
    const unsubs = [];

    unsubs.push(
      listen("tray_new_note", async () => {
        newNoteText = "";
        await focusNewNoteInput();
      }),
    );

    unsubs.push(
      listen("tray_overlay_toggle", async () => {
        await toggleStickiesVisibility();
      }),
    );

    unsubs.push(
      listen("overlay_input_changed", (event) => {
        interactionDisabled = /** @type {boolean} */ (event.payload);
      }),
    );

    let notesChangedTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
    unsubs.push(
      listen("notes_changed", () => {
        if (Date.now() < suppressNotesReloadUntil) {
          return;
        }
        if (notesChangedTimer) clearTimeout(notesChangedTimer);
        notesChangedTimer = setTimeout(() => {
          if (Date.now() < suppressNotesReloadUntil) {
            return;
          }
          loadNotes();
        }, 80);
      }),
    );

    return () => {
      if (notesChangedTimer) {
        clearTimeout(notesChangedTimer);
      }
      for (const p of unsubs) {
        Promise.resolve(p)
          .then((u) => u())
          .catch(() => {});
      }
    };
  });
</script>

<svelte:window
  onkeydown={handleKeydown}
  onpointerup={handleWindowPointerUp}
  onpointercancel={handleWindowPointerCancel}
/>

<div class="panel" style="--glass-opacity: {glassOpacity}">
  <div class="glass-container">
    <PanelHeader
      {strings}
      {NOTE_VIEW_MODES}
      {windowPinned}
      bind:showSettings
      {glassOpacity}
      bind:newNoteText
      bind:noteInputEl
      {viewMode}
      {sortMode}
      bind:isSortMenuOpen
      bind:searchQuery
      bind:hideAfterSave
      {stickiesVisible}
      {interactionDisabled}
      {startWindowDragPointer}
      {toggleWindowPinned}
      {toggleLanguage}
      {adjustGlass}
      {hideWindow}
      {switchToWorkspace}
      {saveNote}
      {setViewMode}
      {setSortMode}
      {emptyTrash}
      {toggleStickiesVisibility}
      {toggleInteraction}
      onHideAfterSaveChange={() => savePrefs({ hideAfterSave })}
    />

    <NotesSection
      {strings}
      {viewMode}
      {renderedNotes}
      draggedNoteId={drag.draggedNoteId}
      dragTargetIndex={drag.dragTargetIndex}
      {canReorder}
      {draggedNote}
      dragGhostTop={drag.dragGhostTop}
      dragGhostLeft={drag.dragGhostLeft}
      dragGhostWidth={drag.dragGhostWidth}
      {formatDate}
      bind:notesListEl
      {restoreNote}
      {toggleArchive}
      {deleteNote}
      {openEdit}
      {togglePin}
      {toggleZOrder}
      {toggleDone}
      {updatePriority}
      {createVerticalDragStartHandler}
      {createVerticalDragMoveHandler}
      {createVerticalDragEndHandler}
    />
  </div>
</div>

<EditDialog {strings} bind:showEditDialog bind:editText {submitEdit} />

<SettingsDialog
  {strings}
  bind:showSettings
  {isAutostartEnabled}
  bind:showPanelOnStartup
  {toggleAutostart}
  {savePrefs}
/>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100%;
    width: 100%;
  }

  :global(*),
  :global(*::before),
  :global(*::after) {
    box-sizing: border-box;
  }

  :global(:root) {
    --primary: #546e7a;
    --accent: #f6c344;
    --neutral: #303133;
    --surface: #f5f7fa;
    --card: #fff;
    --divider: #e4e7ed;
  }

  .panel {
    width: 100%;
    height: 100vh;
    background: transparent;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  }

  .glass-container {
    background: rgba(255, 255, 255, var(--glass-opacity, 0.18));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
