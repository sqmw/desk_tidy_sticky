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
  /** @type {number | null} */
  let draggedIndex = $state(null);
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

  async function loadNotes() {
    try {
      notes = await invoke("load_notes", { sortMode });
      syncWindows();
    } catch (e) {
      console.error("loadNotes", e);
    }
  }

  async function syncWindows() {
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
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  async function reorderNotes(fromIndex, toIndex) {
    if (!canReorder || fromIndex === toIndex) return;
    const list = [...visibleNotes];
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    const reordered = list.map((n, i) => ({ id: n.id, order: i }));
    try {
      await invoke("reorder_notes", {
        reordered,
        isArchivedView: viewMode === "archived",
      });
      await loadNotes();
    } catch (e) {
      console.error("reorderNotes", e);
    }
  }

  /**
   * @param {DragEvent} e
   * @param {number} index
   */
  function handleDragStart(e, index) {
    if (!canReorder) return;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
    draggedIndex = index;
  }

  /**
   * @param {DragEvent} e
   * @param {number} index
   */
  function handleDragOver(e, index) {
    if (!canReorder || draggedIndex === null) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  /**
   * @param {DragEvent} e
   * @param {number} toIndex
   */
  function handleDrop(e, toIndex) {
    if (!canReorder || draggedIndex === null) return;
    e.preventDefault();
    const fromIndex = draggedIndex;
    draggedIndex = null;
    if (fromIndex !== toIndex) reorderNotes(fromIndex, toIndex);
  }

  function handleDragEnd() {
    draggedIndex = null;
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
    loadPrefs().then(() => loadNotes());
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

  onMount(() => {
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
        // Toggle: if any note windows exist, close them; otherwise re-sync (open pinned)
        try {
          const all = await WebviewWindow.getAll();
          const noteWins = all.filter((w) => w.label?.startsWith("note-"));
          if (noteWins.length > 0) {
            for (const w of noteWins) await w.close();
          } else {
            await loadNotes();
            await syncWindows();
          }
        } catch (e) {
          console.error("tray_overlay_toggle", e);
        }
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

<svelte:window onkeydown={handleKeydown} />

<div class="panel" style="--glass-opacity: {glassOpacity}">
  <div class="glass-container">
    <!-- Header -->
    <header class="panel-header" data-tauri-drag-region>
      <div class="header-row">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="header-drag"
          onmousedown={startWindowDrag}
          onpointerdown={startWindowDragPointer}
        >
          <span class="app-title">{strings.appName.toUpperCase()}</span>
        </div>
        <div class="header-actions" data-tauri-drag-region="false">
          <button
            type="button"
            class="icon-btn"
            title={windowPinned ? strings.unpinWindow : strings.pinWindow}
            onclick={toggleWindowPinned}
          >
            📌
          </button>
          <button
            type="button"
            class="icon-btn"
            title={strings.language}
            onclick={toggleLanguage}
          >
            🌐
          </button>
          <button
            type="button"
            class="icon-btn"
            title={strings.settings}
            onclick={() => (showSettings = true)}
          >
            ⚙️
          </button>
          <button
            type="button"
            class="icon-btn glass-btn"
            title={strings.glassAdjust}
            onwheel={(e) => {
              e.preventDefault();
              adjustGlass(-e.deltaY * 0.0005);
            }}
          >
            ◐ <span class="glass-pct">{Math.round(glassOpacity * 100)}%</span>
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
      <div class="tabs-row" data-tauri-drag-region="false">
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
        {#if viewMode === "trash"}
          <button
            type="button"
            class="icon-btn"
            title={strings.emptyTrash}
            onclick={emptyTrash}
          >
            🗑️
          </button>
        {/if}
        <select
          class="sort-select"
          value={sortMode}
          onchange={(e) =>
            setSortMode(/** @type {HTMLInputElement} */ (e.target).value)}
          title={strings.sortMode}
          data-tauri-drag-region="false"
        >
          <option value="custom">{strings.sortByCustom}</option>
          <option value="newest">{strings.sortByNewest}</option>
          <option value="oldest">{strings.sortByOldest}</option>
        </select>
        <label class="toggle-label" data-tauri-drag-region="false">
          <input
            type="checkbox"
            bind:checked={hideAfterSave}
            onchange={() => savePrefs({ hideAfterSave })}
          />
          {strings.hideAfterSave}
        </label>
      </div>
      <div class="search-row" data-tauri-drag-region="false">
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
    </header>

    <!-- Notes list -->
    <div class="notes-list">
      {#each visibleNotes as note, index (note.id)}
        <Dismissible
          leftBg="#e53935"
          leftIcon="🗑"
          rightBg={viewMode === "trash" ? "#43a047" : "#607d8b"}
          rightIcon={viewMode === "trash" ? "↩" : "📁"}
          onSwipeLeft={() => deleteNote(note)}
          onSwipeRight={() =>
            viewMode === "trash" ? restoreNote(note) : toggleArchive(note)}
        >
          {#snippet content()}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="note-item"
              class:dragging={draggedIndex === index}
              class:pinned={note.isPinned}
              class:muted={note.isArchived || note.isDeleted}
              draggable={canReorder}
              role="listitem"
              ondragstart={(e) => handleDragStart(e, index)}
              ondragover={(e) => handleDragOver(e, index)}
              ondrop={(e) => handleDrop(e, index)}
              ondragend={handleDragEnd}
            >
              {#if canReorder}
                <span class="drag-handle" title={strings.dragToReorder}>⋮⋮</span
                >
              {/if}
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
                    onclick={() => restoreNote(note)}>↩</button
                  >
                  <button
                    type="button"
                    class="action-btn danger"
                    title={strings.permanentlyDelete}
                    onclick={() => deleteNote(note)}>🗑</button
                  >
                {:else}
                  <button
                    type="button"
                    class="action-btn"
                    title={strings.edit}
                    onclick={() => openEdit(note)}>✎</button
                  >
                  {#if viewMode === "active"}
                    <button
                      type="button"
                      class="action-btn"
                      title={note.isPinned
                        ? strings.unpinNote
                        : strings.pinNote}
                      onclick={() => togglePin(note)}
                    >
                      {note.isPinned ? "📌" : "📍"}
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
                    title={note.isDone ? strings.markUndone : strings.markDone}
                    onclick={() => toggleDone(note)}
                  >
                    {note.isDone ? "☑" : "☐"}
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    title={note.isArchived
                      ? strings.unarchive
                      : strings.archive}
                    onclick={() => toggleArchive(note)}
                  >
                    📁
                  </button>
                {/if}
              </div>
            </div>
          {/snippet}
        </Dismissible>
      {/each}
    </div>
  </div>
</div>

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
      <h3>{strings.settingsTitle}</h3>
      <p>{strings.appName} {strings.version}</p>
      <a
        href="https://github.com/sqmw/desk_tidy_sticky"
        target="_blank"
        rel="noopener">{strings.starOnGithub}</a
      >
      <div class="settings-row">
        <label for="autostart-check">{strings.autoStart}</label>
        <input
          id="autostart-check"
          type="checkbox"
          checked={isAutostartEnabled}
          onchange={(e) =>
            toggleAutostart(/** @type {HTMLInputElement} */ (e.target).checked)}
        />
      </div>
      <div class="settings-row">
        <label for="show-panel-check">{strings.showPanelOnStartup}</label>
        <input
          id="show-panel-check"
          type="checkbox"
          checked={showPanelOnStartup}
          onchange={(e) => {
            const checked = /** @type {HTMLInputElement} */ (e.target).checked;
            showPanelOnStartup = checked;
            savePrefs({ showPanelOnStartup: checked });
          }}
        />
      </div>
      <div class="shortcuts-list">
        <p><strong>{strings.shortcuts}</strong></p>
        <p>{strings.shortcutToggle}</p>
        <p>{strings.shortcutPinSave}</p>
        <p>{strings.shortcutEsc}</p>
      </div>
      <button
        type="button"
        class="primary"
        onclick={() => (showSettings = false)}>{strings.close}</button
      >
    </div>
  </div>
{/if}

<style>
  :global(html, body) {
    overflow: hidden;
  }

  :global(:root) {
    --primary: #3a6ff7;
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
    padding: 12px;
    flex-shrink: 0;
    user-select: none;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
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
  }

  .icon-btn:hover {
    opacity: 1;
  }

  .glass-btn {
    display: flex;
    align-items: center;
    gap: 2px;
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
    margin-bottom: 8px;
  }

  .note-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    padding: 6px 0;
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
    gap: 8px;
    margin-bottom: 6px;
  }

  .view-tabs {
    display: flex;
    background: #fff;
    border-radius: 6px;
    border: 1px solid var(--divider);
    padding: 2px;
  }

  .tab {
    padding: 4px 8px;
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

  .sort-select {
    font-size: 10px;
    padding: 2px 6px;
    border: 1px solid var(--divider);
    border-radius: 4px;
  }

  .toggle-label {
    font-size: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  .search-row {
    margin-top: 4px;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .search-input {
    flex: 1;
    padding: 6px 8px;
    font-size: 12px;
    border: 1px solid var(--divider);
    border-radius: 20px;
    background: #fff;
    user-select: text;
  }

  .search-clear {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 12px;
    color: #999;
  }

  .search-clear:hover {
    color: #333;
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge legacy */
  }

  .notes-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none; /* Chrome/Safari */
  }

  .note-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    border-radius: 8px;
    margin-bottom: 4px;
    cursor: default;
  }

  .note-item[draggable="true"] {
    cursor: grab;
  }

  .note-item.dragging {
    opacity: 0.5;
  }

  .note-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .drag-handle {
    cursor: grab;
    color: #999;
    font-size: 12px;
    margin-right: 6px;
    user-select: none;
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text {
    display: block;
    font-size: 14px;
    color: var(--neutral);
    max-lines: 2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-text.done {
    text-decoration: line-through;
    color: #999;
  }

  .note-item.pinned .note-text {
    font-weight: 700;
  }

  .note-item.muted .note-text {
    color: #999;
  }

  .note-date {
    font-size: 10px;
    color: #999;
    margin-top: 4px;
    display: block;
  }

  .note-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    font-size: 14px;
    opacity: 0.6;
  }

  .action-btn:hover {
    opacity: 1;
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

  .settings-dialog a {
    color: var(--primary);
    text-decoration: none;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 12px 0;
  }

  .shortcuts-list {
    margin: 16px 0;
    font-size: 12px;
  }
</style>
