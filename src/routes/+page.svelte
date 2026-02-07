<script>
  import { onMount, tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    enable as autostartEnable,
    disable as autostartDisable,
    isEnabled as autostartIsEnabled,
  } from "@tauri-apps/plugin-autostart";
  import { getStrings } from "$lib/strings.js";
  import { matchNote } from "$lib/note-search.js";
  import Dismissible from "$lib/Dismissible.svelte";
  import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { listen } from "@tauri-apps/api/event";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";

  import { openUrl } from "@tauri-apps/plugin-opener";

  const NOTE_VIEW_MODES = ["active", "archived", "trash"];
  const NOTE_SORT_MODES = ["custom", "newest", "oldest"];

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
  /** @type {string | null} */
  let draggedNoteId = $state(null);
  /** @type {number | null} */
  let dragTargetIndex = $state(null);
  /** @type {any[] | null} */
  let dragPreviewNotes = $state(null);
  let dragGhostTop = $state(0);
  let dragGhostLeft = $state(0);
  let dragGhostWidth = $state(0);
  let dragPointerOffsetY = $state(0);
  /** @type {HTMLDivElement | null} */
  let notesListEl = $state(null);
  /** @type {HTMLInputElement | null} */
  let noteInputEl = $state(null);

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
    if (viewMode === "active")
      base = base.filter((n) => !n.isArchived && !n.isDeleted);
    else if (viewMode === "archived")
      base = base.filter((n) => n.isArchived && !n.isDeleted);
    else base = base.filter((n) => n.isDeleted);

    if (!searchQuery.trim()) return base;
    const q = searchQuery.trim();
    const scored = base
      .map((n) => ({ note: n, ...matchNote(q, n.text) }))
      .filter((x) => x.matched)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.note);
    return scored;
  });

  const canReorder = $derived(
    sortMode === "custom" && viewMode !== "trash" && !searchQuery.trim(),
  );
  const renderedNotes = $derived(dragPreviewNotes ?? visibleNotes);
  const draggedNote = $derived.by(() => {
    if (!draggedNoteId) return null;
    return (
      (dragPreviewNotes ?? visibleNotes).find((n) => n.id === draggedNoteId) ??
      null
    );
  });

  async function loadNotes() {
    try {
      notes = await invoke("load_notes", { sortMode });
      syncWindows();
    } catch (e) {
      console.error("loadNotes", e);
    }
  }

  async function syncWindows() {
    // If stickies are hidden, ensure no windows are open and return
    if (!stickiesVisible) {
      const wins = await WebviewWindow.getAll();
      for (const w of wins) {
        if (w.label.startsWith("note-")) {
          await w.close();
        }
      }
      return;
    }

    // For each pinned note, ensure a window is open. Also close windows that should not exist.
    /** @type {Set<string>} */
    const shouldExist = new Set(
      notes
        .filter((n) => n.isPinned && !n.isArchived && !n.isDeleted)
        .map((n) => `note-${n.id}`),
    );

    // Close stale note windows
    try {
      const all = await WebviewWindow.getAll();
      for (const w of all) {
        if (w.label?.startsWith("note-") && !shouldExist.has(w.label)) {
          await w.close();
        }
      }
    } catch (e) {
      console.error("syncWindows(close)", e);
    }

    // Ensure missing windows are created
    for (const n of notes) {
      if (n.isPinned && !n.isArchived && !n.isDeleted) {
        const label = `note-${n.id}`;
        // Check if window exists (WebviewWindow.getByLabel returns null/undefined if not found)
        const exists = await WebviewWindow.getByLabel(label);
        if (!exists) {
          openNoteWindow(n);
        }
      }
    }
  }

  async function loadPrefs() {
    try {
      const p = await invoke("get_preferences");
      hideAfterSave = p.hideAfterSave ?? true;
      viewMode = p.viewMode || "active";
      sortMode = p.sortMode || "custom";
      glassOpacity = p.glassOpacity ?? 0.18;
      locale = p.language || "en";
      showPanelOnStartup = p.showPanelOnStartup ?? false;
    } catch (e) {
      console.error("loadPrefs", e);
    }
  }

  /** @param {any} updates */
  async function savePrefs(updates) {
    try {
      const p = await invoke("get_preferences");
      await invoke("set_preferences", { prefs: { ...p, ...updates } });
    } catch (e) {
      console.error("savePrefs", e);
    }
  }

  async function saveNote(pin = false) {
    const text = newNoteText.trim();
    if (!text) return;
    try {
      await invoke("add_note", { text, isPinned: pin, sortMode });
      newNoteText = "";
      await loadNotes();
      if (hideAfterSave) {
        const win = getCurrentWindow();
        await win.hide();
      }
    } catch (e) {
      console.error("saveNote", e);
    }
  }

  /** @param {any} note */
  async function openNoteWindow(note) {
    const noteId = note?.id;
    if (!noteId) return;

    const label = `note-${noteId}`;
    const webview = new WebviewWindow(label, {
      url: `/note/${noteId}`,
      title: "Sticky Note",
      width: 300,
      height: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: !!note?.isAlwaysOnTop,
      skipTaskbar: true,
    });
    webview.once("tauri://created", function () {
      // webview window successfully created
    });
    webview.once("tauri://error", async function (e) {
      // an error happened creating the webview window
      console.error(e);
      // If key already exists, maybe focus it?
      const w = await WebviewWindow.getByLabel(label);
      if (w) await w.setFocus();
    });
  }

  /** @param {string | number} noteId */
  async function closeNoteWindow(noteId) {
    const label = `note-${noteId}`;
    const w = await WebviewWindow.getByLabel(label);
    if (w) {
      await w.close();
    }
  }

  /** @param {any} note */
  async function togglePin(note) {
    try {
      await invoke("toggle_pin", { id: note.id, sortMode });
      await loadNotes();

      // Check new state
      const updated = notes.find((n) => n.id === note.id);
      if (updated) {
        if (updated.isPinned) {
          openNoteWindow(updated);
        } else {
          closeNoteWindow(updated.id);
        }
      }
    } catch (e) {
      console.error("togglePin", e);
    }
  }

  /** @param {any} note */
  async function toggleZOrder(note) {
    try {
      await invoke("toggle_z_order", { id: note.id, sortMode });
      await loadNotes();
    } catch (e) {
      console.error("toggleZOrder", e);
    }
  }

  /** @param {any} note */
  async function toggleDone(note) {
    try {
      await invoke("toggle_done", { id: note.id, sortMode });
      await loadNotes();
    } catch (e) {
      console.error("toggleDone", e);
    }
  }

  /** @param {any} note */
  async function toggleArchive(note) {
    try {
      await invoke("toggle_archive", { id: note.id, sortMode });
      await loadNotes();
    } catch (e) {
      console.error("toggleArchive", e);
    }
  }

  /** @param {any} note */
  async function deleteNote(note) {
    try {
      if (viewMode === "trash") {
        await invoke("permanently_delete_note", { id: note.id });
      } else {
        await invoke("delete_note", { id: note.id, sortMode });
      }
      await loadNotes();
    } catch (e) {
      console.error("deleteNote", e);
    }
  }

  /** @param {any} note */
  async function restoreNote(note) {
    try {
      await invoke("restore_note", { id: note.id, sortMode });
      await loadNotes();
    } catch (e) {
      console.error("restoreNote", e);
    }
  }

  async function emptyTrash() {
    try {
      await invoke("empty_trash");
      await loadNotes();
    } catch (e) {
      console.error("emptyTrash", e);
    }
  }

  /**
   * @param {any[]} reorderedVisible
   */
  async function persistReorderedVisible(reorderedVisible) {
    const reordered = reorderedVisible.map((n, i) => ({ id: n.id, order: i }));

    /** @param {any} n */
    const inCurrentView = (n) => {
      if (viewMode === "active") return !n.isArchived && !n.isDeleted;
      if (viewMode === "archived") return n.isArchived && !n.isDeleted;
      return n.isDeleted;
    };

    const iter = reorderedVisible[Symbol.iterator]();
    notes = notes.map((n) => {
      if (!inCurrentView(n)) return n;
      const next = iter.next();
      return next.done ? n : next.value;
    });

    try {
      await invoke("reorder_notes", {
        reordered,
        isArchivedView: viewMode === "archived",
      });
    } catch (e) {
      console.error("reorderNotes", e);
      await loadNotes();
    }
  }

  /** @type {number | null} */
  let verticalDragStartY = $state(null);

  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function getEventClientY(e) {
    // @ts-ignore
    return e.touches ? e.touches[0].clientY : e.clientY;
  }

  /** @param {number} pointerY */
  function findDropIndexByPointer(pointerY) {
    if (!notesListEl || !draggedNoteId) return 0;
    const wrappers = notesListEl.querySelectorAll(".note-wrapper");
    const len = wrappers.length;
    if (len <= 1) return 0;

    const activeList = dragPreviewNotes ?? visibleNotes;
    const currentIndex = activeList.findIndex((n) => n.id === draggedNoteId);
    if (currentIndex < 0) return 0;

    // Compute insertion slot by counting how many item midlines are above pointer.
    // Then map insertion slot back to index in list-with-dragged-item.
    let insertionIndex = 0;
    for (let i = 0; i < len; i += 1) {
      const rect = wrappers[i].getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      if (pointerY > centerY) insertionIndex = i + 1;
    }

    let targetIndex = insertionIndex;
    if (insertionIndex > currentIndex) {
      targetIndex = insertionIndex - 1;
    }

    return Math.max(
      0,
      Math.min(len - 1, targetIndex),
    );
  }

  /** @param {number} pointerY */
  function autoScrollNotesList(pointerY) {
    if (!notesListEl) return;
    const rect = notesListEl.getBoundingClientRect();
    const edge = 36;
    const maxSpeed = 14;
    if (pointerY < rect.top + edge) {
      const ratio = (rect.top + edge - pointerY) / edge;
      notesListEl.scrollTop -= Math.max(2, Math.round(maxSpeed * ratio));
    } else if (pointerY > rect.bottom - edge) {
      const ratio = (pointerY - (rect.bottom - edge)) / edge;
      notesListEl.scrollTop += Math.max(2, Math.round(maxSpeed * ratio));
    }
  }

  /**
   * @param {PointerEvent | TouchEvent | MouseEvent} e
   * @param {number} index
   */
  function handleVerticalDragStart(e, index) {
    if (!canReorder) return;
    const startList = [...visibleNotes];
    const current = startList[index];
    if (!current) return;
    const clientY = getEventClientY(e);
    const target = /** @type {HTMLElement | null} */ (e.target);
    const wrapper = target?.closest(".note-wrapper");
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      dragGhostTop = rect.top;
      dragGhostLeft = rect.left;
      dragGhostWidth = rect.width;
      dragPointerOffsetY = Math.max(0, clientY - rect.top);
    } else {
      dragPointerOffsetY = 18;
    }
    draggedNoteId = current.id;
    dragTargetIndex = index;
    verticalDragStartY = clientY;
    dragPreviewNotes = startList;
  }

  /**
   * @param {PointerEvent | TouchEvent | MouseEvent} e
   * @param {number} deltaY
   */
  function handleVerticalDragMove(e, deltaY) {
    if (!canReorder || !draggedNoteId) return;
    const clientY =
      verticalDragStartY === null
        ? getEventClientY(e)
        : verticalDragStartY + deltaY;
    dragGhostTop = clientY - dragPointerOffsetY;
    autoScrollNotesList(clientY);
    const nextTarget = findDropIndexByPointer(clientY);
    dragTargetIndex = nextTarget;

    if (!dragPreviewNotes) return;
    const from = dragPreviewNotes.findIndex((n) => n.id === draggedNoteId);
    if (from < 0 || from === nextTarget) return;
    const next = [...dragPreviewNotes];
    const [item] = next.splice(from, 1);
    next.splice(nextTarget, 0, item);
    dragPreviewNotes = next;
  }

  async function finalizeVerticalDrag() {
    if (!canReorder || !draggedNoteId) return;
    const draggedId = draggedNoteId;
    const originIndex = visibleNotes.findIndex((n) => n.id === draggedNoteId);
    const finalIndex = (dragPreviewNotes ?? visibleNotes).findIndex(
      (n) => n.id === draggedNoteId,
    );
    const finalVisible = dragPreviewNotes ?? visibleNotes;
    const shouldPersist =
      originIndex >= 0 && finalIndex >= 0 && originIndex !== finalIndex;

    // Clear drag state immediately to stop any post-drop drifting.
    draggedNoteId = null;
    dragTargetIndex = null;
    verticalDragStartY = null;
    dragPreviewNotes = null;
    dragGhostWidth = 0;
    dragPointerOffsetY = 0;

    if (!shouldPersist) return;
    if (!draggedId) return;
    await persistReorderedVisible(finalVisible);
  }

  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function handleVerticalDragEnd(e) {
    void e;
    void finalizeVerticalDrag();
  }

  /** @param {string} noteId */
  function createVerticalDragStartHandler(noteId) {
    /**
     * @param {PointerEvent | TouchEvent | MouseEvent} e
     */
    return function onVerticalDragStart(e) {
      const index = visibleNotes.findIndex((n) => n.id === noteId);
      if (index < 0) return;
      handleVerticalDragStart(e, index);
    };
  }

  /** @param {string} noteId */
  function createVerticalDragMoveHandler(noteId) {
    /**
     * @param {PointerEvent | TouchEvent | MouseEvent} e
     * @param {number} deltaY
     */
    return function onVerticalDragMove(e, deltaY) {
      if (draggedNoteId !== noteId) return;
      handleVerticalDragMove(e, deltaY);
    };
  }

  /** @param {string} noteId */
  function createVerticalDragEndHandler(noteId) {
    /**
     * @param {PointerEvent | TouchEvent | MouseEvent} e
     */
    return function onVerticalDragEnd(e) {
      if (draggedNoteId !== noteId) return;
      handleVerticalDragEnd(e);
    };
  }

  /** @param {PointerEvent} e */
  function handleWindowPointerUp(e) {
    if (e.button !== 0) return;
    if (!draggedNoteId) return;
    void finalizeVerticalDrag();
  }

  function handleWindowPointerCancel() {
    if (!draggedNoteId) return;
    void finalizeVerticalDrag();
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
    if (!editingNote || !editText.trim()) {
      showEditDialog = false;
      return;
    }
    try {
      await invoke("update_note_text", {
        id: editingNote.id,
        text: editText.trim(),
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

  /** @param {boolean} v */
  async function setHideAfterSave(v) {
    hideAfterSave = v;
    await savePrefs({ hideAfterSave: v });
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

  $effect(() => {
    loadPrefs().then(() => {
      loadNotes();
      updateTrayMenu();
    });
  });

  $effect(() => {
    if (showSettings) initAutostart();
  });

  async function focusNewNoteInput() {
    await tick();
    noteInputEl?.focus();
    noteInputEl?.select();
  }

  /** @param {MouseEvent} e */
  async function startWindowDrag(e) {
    if (e.button !== 0) return; // left click only
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[drag] mousedown", {
        button: e.button,
        buttons: e.buttons,
        target: /** @type {any} */ (e.target)?.tagName,
        x: e.clientX,
        y: e.clientY,
      });
    }
    try {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[drag] calling startDragging()");
      }
      await getCurrentWindow().startDragging();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[drag] startDragging() resolved");
      }
    } catch (err) {
      console.error("startDragging failed", err);
    }
  }

  /** @param {PointerEvent} e */
  async function startWindowDragPointer(e) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[drag] pointerdown", {
        button: e.button,
        buttons: e.buttons,
        pointerType: e.pointerType,
        target: /** @type {any} */ (e.target)?.tagName,
        x: e.clientX,
        y: e.clientY,
      });
    }
    // Delegate to mouse-based logic when available
    // @ts-ignore - PointerEvent is compatible enough for our checks
    await startWindowDrag(e);
  }

  let interactionDisabled = $state(false);
  let stickiesVisible = $state(true);
  let isSortMenuOpen = $state(false);

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
      if (stickiesVisible) {
        await loadNotes();
      }
      await syncWindows();
    } catch (e) {
      console.error("toggleStickiesVisibility", e);
    }
  }

  onMount(() => {
    // Get initial state
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

    return () => {
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
    <!-- Header -->
    <header class="panel-header">
      <div class="header-row">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="header-drag" onpointerdown={startWindowDragPointer}>
          <span class="app-title">{strings.appName.toUpperCase()}</span>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="icon-btn"
            class:active={windowPinned}
            title={windowPinned ? strings.unpinWindow : strings.pinWindow}
            onclick={toggleWindowPinned}
          >
            <!-- Material Design Push Pin Icon -->
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              fill-rule="evenodd"
              style="transform: translateY(0.5px);"
            >
              {#if windowPinned}
                <!-- push_pin (Filled) -->
                <path
                  d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
                />
              {:else}
                <!-- push_pin_outlined (Filled shape with hole) -->
                <path
                  d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z"
                />
              {/if}
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            title={strings.language}
            onclick={toggleLanguage}
          >
            <!-- Language Icon (translate) -->
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path
                d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            title={strings.settings}
            onclick={() => (showSettings = true)}
          >
            <!-- Settings Icon (settings) -->
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </button>

          <button
            type="button"
            class="icon-btn glass-btn"
            title={strings.glassAdjust}
            onwheel={(e) => {
              e.preventDefault();
              adjustGlass(-e.deltaY * 0.0005);
            }}
            style="width: auto; padding: 0 4px; font-variant-numeric: tabular-nums;"
          >
            <span
              class="glass-pct"
              style="font-size: 11px; font-weight: 500; min-width: 24px; text-align: center;"
              >{Math.round(glassOpacity * 100)}%</span
            >
          </button>
          <button
            type="button"
            class="icon-btn"
            title={strings.hideWindow}
            onclick={() => getCurrentWindow().hide()}
          >
            ✕
          </button>
        </div>
      </div>
      <div class="input-row" data-tauri-drag-region="false">
        <input
          type="text"
          class="note-input"
          placeholder={strings.inputHint}
          bind:value={newNoteText}
          bind:this={noteInputEl}
          onkeydown={(e) => e.key === "Enter" && saveNote(false)}
        />
        <button
          type="button"
          class="send-btn"
          onclick={() => saveNote(false)}
          title={strings.saveNote}
        >
          ➤
        </button>
      </div>
      <div class="tabs-row">
        <div class="view-tabs">
          {#each NOTE_VIEW_MODES as mode}
            <button
              type="button"
              class="tab"
              class:active={viewMode === mode}
              onclick={() => setViewMode(mode)}
            >
              {strings[
                mode === "active"
                  ? "active"
                  : mode === "archived"
                    ? "archived"
                    : "trash"
              ]}
            </button>
          {/each}
        </div>

        <div class="sort-dropdown" style="position: relative; flex-shrink: 0;">
          <button
            type="button"
            class="sort-trigger"
            onclick={() => (isSortMenuOpen = !isSortMenuOpen)}
            title={strings.sortMode}
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              style="opacity:0.7; margin-right:4px;"
            >
              <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
            </svg>
            <span
              style="font-size:10px; color:var(--neutral); margin-right:2px;"
            >
              {sortMode === "custom"
                ? strings.sortByCustom
                : sortMode === "newest"
                  ? strings.sortByNewest
                  : strings.sortByOldest}
            </span>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              style="opacity:0.5;"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>

          {#if isSortMenuOpen}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="sort-menu-overlay"
              onclick={() => (isSortMenuOpen = false)}
            ></div>
            <div class="sort-menu">
              <button
                class="sort-item"
                class:selected={sortMode === "custom"}
                onclick={() => {
                  setSortMode("custom");
                  isSortMenuOpen = false;
                }}
              >
                {strings.sortByCustom}
              </button>
              <button
                class="sort-item"
                class:selected={sortMode === "newest"}
                onclick={() => {
                  setSortMode("newest");
                  isSortMenuOpen = false;
                }}
              >
                {strings.sortByNewest}
              </button>
              <button
                class="sort-item"
                class:selected={sortMode === "oldest"}
                onclick={() => {
                  setSortMode("oldest");
                  isSortMenuOpen = false;
                }}
              >
                {strings.sortByOldest}
              </button>
            </div>
          {/if}
        </div>
        {#if viewMode === "trash"}
          <button
            type="button"
            class="icon-btn"
            title={strings.emptyTrash}
            onclick={emptyTrash}
            style="margin-left: 2px;"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              style="color: #ef5350;"
            >
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          </button>
        {/if}

        <div style="flex:1"></div>

        <!-- Hide After Save Toggle -->
        <label class="toggle-switch" title={strings.hideAfterSave}>
          <input
            type="checkbox"
            bind:checked={hideAfterSave}
            onchange={() => savePrefs({ hideAfterSave })}
          />
          <span class="slider round"></span>
        </label>

        <!-- Desktop Overlay (Stickers) Toggle -->
        <!-- Desktop Overlay (Stickers) Toggle -->
        <button
          type="button"
          class="icon-btn"
          class:active={stickiesVisible}
          title={stickiesVisible
            ? strings.trayStickiesClose
            : strings.trayStickiesShow}
          onclick={toggleStickiesVisibility}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            {#if stickiesVisible}
              <!-- desktop_windows (Filled) -->
              <path
                d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
              />
            {:else}
              <!-- desktop_windows (Outlined) - Fully Hollow Wireframe -->
              <g
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="18" height="13" rx="2" />
                <path d="M12 16v4 M8 20h8" />
              </g>
            {/if}
          </svg>
        </button>

        <!-- Interaction Toggle -->
        <button
          type="button"
          class="icon-btn"
          class:active={!interactionDisabled}
          title={strings.trayInteraction}
          onclick={toggleInteraction}
          style="margin-left: 4px;"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            {#if !interactionDisabled}
              <!-- mouse (Filled) -->
              <path
                d="M13 1.1V9h7.4c0-3.9-3.1-7.1-6.8-7.8l-.6-.1zm-2 0C7.1 1.6 4.1 4.8 4.1 8.7V9H11V1.1zm-7.1 9.9v4.5C3.9 19.9 7.5 23.5 12 23.5S20 19.9 20 15.5V11H3.9z"
              />
            {:else}
              <!-- mouse (Outlined) - Truly Hollow with evenodd -->
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2c-3.87 0-7 3.13-7 7v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7zm5 13c0 2.76-2.24 5-5 5s-5-2.24-5-5v-4h10v4zm0-6H7V9c0-2.76 2.24-5 5-5s5 2.24 5 5v0zm-4.5-5h1v5h-1V4z"
              />
            {/if}
          </svg>
        </button>
      </div>
      <div class="search-row" data-tauri-drag-region="false">
        <div class="search-container">
          <svg
            class="search-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
          >
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder={strings.searchHint}
            bind:value={searchQuery}
          />
          {#if searchQuery.trim()}
            <button
              type="button"
              class="search-clear"
              onclick={() => (searchQuery = "")}
              title={strings.clear}>✕</button
            >
          {/if}
        </div>
      </div>
    </header>

    <!-- Notes list -->
    <div class="notes-list" bind:this={notesListEl}>
      {#each renderedNotes as note, index (note.id)}
        <div
          transition:slide={{ duration: 200, axis: "y" }}
          animate:flip={{ duration: 200 }}
          class="note-wrapper"
          class:drag-placeholder={draggedNoteId === note.id}
          class:drop-target={dragTargetIndex === index && draggedNoteId !== note.id}
        >
          <Dismissible
            leftBg={viewMode === "trash" ? "#43a047" : "#607d8b"}
            leftIcon={viewMode === "trash" ? iconRestore : iconArchive}
            rightBg="#e53935"
            rightIcon={iconDelete}
            enableVerticalDrag={canReorder}
            verticalDragHandleSelector='[data-reorder-handle="true"]'
            onSwipeRight={() =>
              viewMode === "trash" ? restoreNote(note) : toggleArchive(note)}
            onSwipeLeft={() => deleteNote(note)}
            onVerticalDragStart={createVerticalDragStartHandler(note.id)}
            onVerticalDragMove={createVerticalDragMoveHandler(note.id)}
            onVerticalDragEnd={createVerticalDragEndHandler(note.id)}
          >
            {#snippet content()}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="note-item"
                class:pinned={note.isPinned}
                class:muted={note.isArchived || note.isDeleted}
                class:dragging={draggedNoteId === note.id}
                role="listitem"
              >
                <div class="note-content">
                  <span class="note-text" class:done={note.isDone}
                    >{note.text}</span
                  >
                  <span class="note-date">{formatDate(note.updatedAt)}</span>
                </div>
                <div class="note-actions">
                  {#if viewMode === "trash"}
                    <button
                      type="button"
                      class="action-btn"
                      title={strings.restore}
                      onclick={() => restoreNote(note)}
                      >{@render iconRestore()}</button
                    >
                    <button
                      type="button"
                      class="action-btn danger"
                      title={strings.permanentlyDelete}
                      onclick={() => deleteNote(note)}
                      >{@render iconDelete()}</button
                    >
                  {:else}
                    <button
                      type="button"
                      class="action-btn"
                      title={strings.edit}
                      onclick={(e) => {
                        e.stopPropagation(); // Prevent drag interference if any
                        openEdit(note);
                      }}>{@render iconEdit()}</button
                    >
                    {#if viewMode === "active"}
                      <button
                        type="button"
                        class="action-btn"
                        title={note.isPinned
                          ? strings.unpinNote
                          : strings.pinNote}
                        onclick={(e) => {
                          e.stopPropagation();
                          togglePin(note);
                        }}
                      >
                        {#if note.isPinned}
                          {@render iconPinFilled()}
                        {:else}
                          {@render iconPinOutline()}
                        {/if}
                      </button>
                      {#if note.isPinned}
                        <button
                          type="button"
                          class="action-btn"
                          title={note.isAlwaysOnTop
                            ? strings.pinToBottom
                            : strings.pinToTop}
                          onclick={() => toggleZOrder(note)}
                        >
                          {note.isAlwaysOnTop ? "▴" : "▾"}
                        </button>
                      {/if}
                    {/if}
                    <button
                      type="button"
                      class="action-btn"
                      title={note.isDone
                        ? strings.markUndone
                        : strings.markDone}
                      onclick={() => toggleDone(note)}
                    >
                      {#if note.isDone}
                        {@render iconCheckBox()}
                      {:else}
                        {@render iconCheckBoxOutline()}
                      {/if}
                    </button>
                    <button
                      type="button"
                      class="action-btn"
                      title={note.isArchived
                        ? strings.unarchive
                        : strings.archive}
                      onclick={() => toggleArchive(note)}
                    >
                      {#if note.isArchived}
                        {@render iconUnarchive()}
                      {:else}
                        {@render iconArchive()}
                      {/if}
                    </button>
                  {/if}
                  {#if canReorder}
                    <button
                      type="button"
                      class="action-btn reorder-handle"
                      data-reorder-handle="true"
                      title={strings.dragToReorder}
                    >
                      {@render iconDragHandle()}
                    </button>
                  {/if}
                </div>
              </div>
            {/snippet}
          </Dismissible>
        </div>
      {/each}
    </div>

    {#if draggedNote}
      <div
        class="drag-ghost"
        style="top: {dragGhostTop}px; left: {dragGhostLeft}px; width: {dragGhostWidth}px;"
      >
        <div class="note-item ghost">
          <div class="note-content">
            <span class="note-text" class:done={draggedNote.isDone}
              >{draggedNote.text}</span
            >
            <span class="note-date">{formatDate(draggedNote.updatedAt)}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

{#snippet iconRestore()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
    />
  </svg>
{/snippet}

{#snippet iconDelete()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    />
  </svg>
{/snippet}

{#snippet iconArchive()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconUnarchive()}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path
      d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconEdit()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
{/snippet}

{#snippet iconPinOutline()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z"
    />
  </svg>
{/snippet}

{#snippet iconPinFilled()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
{/snippet}

{#snippet iconCheckBoxOutline()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBox()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
{/snippet}

{#snippet iconDragHandle()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2S7 7.1 7 6s.9-2 2-2 2 .9 2 2zm6 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm0-6c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"
    />
  </svg>
{/snippet}

{#if showEditDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dialog-backdrop"
    role="button"
    tabindex="-1"
    onclick={() => (showEditDialog = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="dialog"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <h3>{strings.edit}</h3>
      <textarea bind:value={editText} rows="4"></textarea>
      <div class="dialog-actions">
        <button type="button" onclick={() => (showEditDialog = false)}
          >{strings.cancel}</button
        >
        <button type="button" class="primary" onclick={submitEdit}
          >{strings.saveNote}</button
        >
      </div>
    </div>
  </div>
{/if}

{#if showSettings}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="dialog-backdrop"
    role="button"
    tabindex="-1"
    onclick={() => (showSettings = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="dialog settings-dialog"
      role="dialog"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="dialog-header">
        <div class="dialog-title-group">
          <h3>{strings.settingsTitle}</h3>
          <span class="version-badge">{strings.version}</span>
        </div>
        <a
          href="https://github.com/sqmw/desk_tidy_sticky"
          target="_blank"
          rel="noopener"
          class="github-link"
          title={strings.starOnGithub}
          onclick={(e) => {
            e.preventDefault();
            openUrl("https://github.com/sqmw/desk_tidy_sticky");
          }}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          <span>Star</span>
        </a>
      </div>

      <div class="settings-content">
        <div class="settings-section">
          <h4>{strings.general}</h4>
          <label class="setting-item">
            <span class="setting-label">{strings.autoStart}</span>
            <div class="toggle-switch">
              <input
                type="checkbox"
                checked={isAutostartEnabled}
                onchange={(e) =>
                  toggleAutostart(
                    /** @type {HTMLInputElement} */ (e.target).checked,
                  )}
              />
              <span class="slider"></span>
            </div>
          </label>

          <label class="setting-item">
            <span class="setting-label">{strings.showPanelOnStartup}</span>
            <div class="toggle-switch">
              <input
                type="checkbox"
                checked={showPanelOnStartup}
                onchange={(e) => {
                  const checked = /** @type {HTMLInputElement} */ (e.target)
                    .checked;
                  showPanelOnStartup = checked;
                  savePrefs({ showPanelOnStartup: checked });
                }}
              />
              <span class="slider"></span>
            </div>
          </label>
        </div>

        <div class="settings-section">
          <h4>{strings.shortcuts}</h4>
          <div class="shortcuts-grid">
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutToggle.split(":")[0]}</span
              >
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc"
                >{strings.shortcutOverlay.split(":")[0]}</span
              >
              <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc"
                >{strings.shortcutPinSave.split(":")[0]}</span
              >
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
            </div>
            <div class="shortcut-row">
              <span class="sc-desc">{strings.shortcutEsc.split(":")[0]}</span>
              <kbd>Esc</kbd>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button
          type="button"
          class="primary block-btn"
          onclick={() => (showSettings = false)}>{strings.close}</button
        >
      </div>
    </div>
  </div>
{/if}

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
    --primary: #546e7a; /* Updated to Slate Blue per user request */
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

  .panel-header {
    background: var(--surface);
    border-bottom: 1px solid var(--divider);
    padding: 0px 12px;
    flex-shrink: 0;
    user-select: none;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
  }

  .header-drag {
    flex: 1;
    min-width: 0;
    cursor: default;
  }

  .app-title {
    font-size: 11px;
    letter-spacing: 0.6px;
    color: #666;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    opacity: 1;
  }

  .icon-btn.active {
    opacity: 1;
    color: var(--primary); /* Change icon color */
  }

  .glass-btn {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 1; /* Override default .icon-btn opacity for full control */
  }

  .glass-pct {
    font-size: 10px;
    color: #666;
  }

  .search-row {
    position: relative;
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 0;
  }

  .note-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    padding: 2px 0;
    outline: none;
    user-select: text;
  }

  .send-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: var(--primary);
  }

  .tabs-row {
    display: flex;
    align-items: center;
    gap: 4px; /* Reduced from 8px */
    margin-bottom: 0;
  }

  .view-tabs {
    display: flex;
    background: #fff;
    border-radius: 6px;
    border: 1px solid var(--divider);
    padding: 1px; /* Reduced from 2px */
    flex-shrink: 0;
  }

  .tab {
    padding: 2px 6px; /* Reduced from 4px 8px */
    font-size: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
  }

  .tab.active {
    background: var(--primary);
    color: #fff;
    font-weight: 600;
  }

  .sort-trigger {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1px solid var(--divider);
    border-radius: 4px;
    padding: 2px 4px; /* Reduced from 2px 6px */
    cursor: pointer;
    user-select: none;
    height: 22px;
  }
  .sort-trigger:hover {
    border-color: #bbb;
    background: #fafafa;
  }

  .sort-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: #fff;
    border: 1px solid var(--divider);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 100px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sort-menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
    cursor: default;
  }

  .sort-item {
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 8px;
    font-size: 11px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--neutral);
    display: block;
    width: 100%;
  }

  .sort-item:hover {
    background: var(--surface);
  }

  .sort-item.selected {
    background: rgba(58, 111, 247, 0.1);
    color: var(--primary);
    font-weight: 600;
  }

  .search-row {
    margin-top: 6px; /* Reduced from 12px */
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px; /* Reduced to align with note cards */
  }

  .search-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: #909399;
    pointer-events: none;
  }

  .search-input {
    flex: 1;
    padding: 6px 12px 6px 30px; /* Increased left padding for icon */
    font-size: 13px;
    border: 1px solid var(--divider);
    border-radius: 16px; /* Pill shape */
    background: #fff;
    user-select: text;
    transition: all 0.2s;
    outline: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  }

  .search-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(58, 111, 247, 0.1);
  }

  .search-clear {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
    color: #bbb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-clear:hover {
    color: #666;
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 6px 10px;
    scrollbar-width: thin; /* Firefox */
    scrollbar-color: #ddd transparent;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Completely hide scrollbar */
  .notes-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .note-wrapper {
    position: relative;
    border-radius: 10px;
    z-index: 1;
  }

  .note-wrapper.drag-placeholder::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 10px;
    border: 1px dashed #b9c7dc;
    background: rgba(84, 110, 122, 0.05);
    pointer-events: none;
    z-index: 2;
  }

  .note-wrapper.drag-placeholder .note-item {
    visibility: hidden;
  }

  .note-wrapper.drop-target::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -4px;
    height: 3px;
    border-radius: 999px;
    background: var(--primary);
    opacity: 0.45;
  }

  .note-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    position: relative;
    padding: 11px 12px;
    border-radius: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
    border: 1px solid #e7ebf1;
    cursor: default;
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      border-color 0.16s ease;
    user-select: none; /* Prevent text selection dragging issues */
  }

  .note-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
    border-color: #dbe3ee;
  }

  .note-item.dragging {
    visibility: hidden;
  }

  .drag-ghost {
    position: fixed;
    pointer-events: none;
    z-index: 2000;
  }

  .note-item.ghost {
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
    border-color: color-mix(in srgb, var(--primary) 45%, #d9dee7);
    transform: scale(1.015);
    background: linear-gradient(180deg, #ffffff 0%, #fdfdff 100%);
    opacity: 0.98;
  }

  .note-item.muted {
    background: #fafbfc;
    border-color: #e8ebef;
    opacity: 0.9;
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text {
    display: block;
    font-size: 14px;
    line-height: 1.4;
    color: var(--neutral);
    max-lines: 3; /* Show a bit more text */
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
  }

  .note-date {
    font-size: 11px;
    color: #9aa3af;
    margin-top: 6px;
    display: block;
  }

  .note-text.done {
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
    text-decoration-color: #9aa3af;
    color: #8a92a0;
  }

  .note-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 8px;
    opacity: 0.45;
    transition: opacity 0.2s;
  }

  .note-item:hover .note-actions,
  .note-item.dragging .note-actions {
    opacity: 1;
  }

  .action-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 4px;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    transition: all 0.2s;
  }

  .action-btn.reorder-handle {
    cursor: grab;
    color: #8a94a3;
  }

  .action-btn.reorder-handle:active {
    cursor: grabbing;
  }

  .action-btn:hover {
    background: #f0f2f5;
    color: #333;
    border-color: #e4e7ed;
  }

  .action-btn.danger:hover {
    color: #e53935;
    background: #fef0f0;
    border-color: #fab6b6;
  }

  .action-btn.danger {
    color: #e53935;
  }

  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
    min-width: 320px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .dialog h3 {
    margin: 0 0 16px;
    font-size: 16px;
  }

  .dialog textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider);
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
    resize: vertical;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .dialog-actions button,
  .dialog button.primary {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--divider);
    cursor: pointer;
    font-size: 14px;
  }

  .dialog-actions button.primary,
  .dialog button.primary {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }

  .settings-dialog {
    width: 380px; /* Slightly wider */
    padding: 0;
    overflow: hidden;
  }

  .dialog-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--divider);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  .dialog-title-group h3 {
    margin: 0;
    font-size: 18px;
    color: var(--neutral);
    margin-bottom: 4px;
  }

  .version-badge {
    font-size: 11px;
    color: #888;
    background: #eee;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .github-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--neutral);
    text-decoration: none;
    background: #fff;
    border: 1px solid #dcdfe6;
    padding: 6px 12px;
    border-radius: 20px;
    transition: all 0.2s;
  }

  .github-link:hover {
    border-color: #333;
    background: #333;
    color: #fff;
  }

  .settings-content {
    padding: 24px;
    max-height: 400px;
    overflow-y: auto;
  }

  .settings-section {
    margin-bottom: 24px;
  }
  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h4 {
    margin: 0 0 12px;
    font-size: 12px;
    text-transform: uppercase;
    color: #999;
    letter-spacing: 0.5px;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    cursor: pointer;
    user-select: none;
  }

  .setting-label {
    font-size: 14px;
    color: var(--neutral);
  }

  .shortcuts-grid {
    display: grid;
    gap: 8px;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: #555;
  }

  kbd {
    background: #f4f4f5;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    box-shadow: 0 1px 0 #e4e7ed;
    color: #606266;
    display: inline-block;
    font-family: monospace;
    font-size: 11px;
    padding: 2px 6px;
    margin: 0 2px;
    min-width: 20px;
    text-align: center;
  }

  .dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--divider);
    background: #fafafa;
    display: flex;
    justify-content: flex-end;
  }

  .block-btn {
    width: 100%;
    justify-content: center;
  }

  /* Toggle Switch Styles */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
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
    background-color: #dcdfe6;
    transition: 0.3s;
    border-radius: 20px;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  input:checked + .slider {
    background-color: var(--primary);
  }
  input:checked + .slider:before {
    transform: translateX(16px);
  }
</style>
