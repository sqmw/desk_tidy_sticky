<script>
  import { onMount, tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";
  import { getStrings } from "$lib/strings.js";

  const DEFAULT_NOTE_COLOR = "#fff9c4";
  const NOTE_COLORS = [
    "#fff9c4",
    "#ffe0b2",
    "#ffccbc",
    "#f8bbd0",
    "#d1c4e9",
    "#c5cae9",
    "#b3e5fc",
    "#c8e6c9",
  ];
  /** @type {any} */
  let note = $state(null);
  const noteId = $derived($page.params.id);
  let text = $state("");
  let clickThrough = $state(false);
  /** @type {string} */
  let locale = $state("en");
  let showPalette = $state(false);
  let showOpacityPanel = $state(false);
  let showOpacityValue = $state(false);
  let isEditing = $state(false);
  let opacityDraft = $state(1);
  /** @type {any} */
  let opacitySaveTimer;
  /** @type {any} */
  let opacityValueHideTimer;
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = $state(null);
  const strings = $derived(getStrings(locale));
  const noteBgColor = $derived(note?.bgColor || DEFAULT_NOTE_COLOR);
  const noteOpacity = $derived(note?.opacity ?? 1);

  /**
   * @param {string} hex
   * @param {number} alpha
   */
  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const normalized =
      value.length === 3
        ? value
            .split("")
            .map((c) => `${c}${c}`)
            .join("")
        : value;
    const n = Number.parseInt(normalized, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const noteBackground = $derived(hexToRgba(noteBgColor, noteOpacity));

  /** @param {number} ms */
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadNote() {
    try {
      const allNotes = await invoke("load_notes", { sortMode: "custom" });
      // @ts-ignore
      const n = allNotes.find((item) => item.id === noteId);
      if (n) {
        note = n;
        text = n.text;
        opacityDraft = n.opacity ?? 1;
      }
    } catch (e) {
      console.error("loadNote", e);
    }
  }

  async function loadLocale() {
    try {
      const prefs = await invoke("get_preferences");
      locale = prefs?.language || "en";
    } catch (e) {
      console.error("loadLocale", e);
    }
  }

  async function loadOverlayInteractionState() {
    try {
      const state = await invoke("get_overlay_interaction");
      clickThrough = !!state;
    } catch (e) {
      console.error("loadOverlayInteractionState", e);
    }
  }

  /** @param {any[]} all */
  function findUpdatedFromList(all) {
    // @ts-ignore
    return all.find((n) => n.id === noteId) ?? null;
  }

  /**
   * @param {any[]} all
   * @param {{ closeIfUnpinned?: boolean }} [options]
   */
  async function syncAfterCommand(all, options = {}) {
    const updated = findUpdatedFromList(all);
    if (!updated) {
      await getCurrentWindow().close();
      return;
    }

    note = updated;
    text = updated.text;
    opacityDraft = updated.opacity ?? 1;

    if (options.closeIfUnpinned && !updated.isPinned) {
      await getCurrentWindow().close();
      return;
    }

    await applyZOrderAndParent();
  }

  /** @param {number[]} [retries] */
  async function applyZOrderAndParent(retries = [0, 150, 400]) {
    if (!note) return;
    for (const ms of retries) {
      if (ms > 0) {
        await wait(ms);
      }
      try {
        await invoke("apply_note_window_layer", {
          isAlwaysOnTop: !!note.isAlwaysOnTop,
        });
      } catch (e) {
        console.error("applyZOrderAndParent", e);
      }
    }
  }

  async function applyInteractionPolicy() {
    const ignoreCursor = clickThrough;
    try {
      await getCurrentWindow().setIgnoreCursorEvents(ignoreCursor);
    } catch (e) {
      console.error("applyInteractionPolicy", e);
    }
  }

  async function save() {
    if (!note) return;
    try {
      await invoke("update_note_text", {
        // @ts-ignore
        id: note.id,
        text,
        sortMode: "custom",
      });
    } catch (e) {
      console.error("save", e);
    }
  }

  /** @type {any} */
  let timeout;
  function handleInput() {
    clearTimeout(timeout);
    timeout = setTimeout(save, 500);
  }

  async function enterEditMode() {
    if (clickThrough) return;
    isEditing = true;
    showPalette = false;
    showOpacityPanel = false;
    await tick();
    editorEl?.focus();
    editorEl?.setSelectionRange(text.length, text.length);
  }

  async function exitEditMode() {
    await save();
    isEditing = false;
  }

  async function toggleMouseInteraction() {
    try {
      const next = await invoke("toggle_overlay_interaction");
      clickThrough = !!next;
      await applyInteractionPolicy();
      await applyZOrderAndParent();
    } catch (e) {
      console.error("toggleMouseInteraction", e);
    }
  }

  /** @param {MouseEvent} e */
  async function handleDragMouseDown(e) {
    if (e.button !== 0) return;
    if (clickThrough) return;
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (target?.closest("button,textarea,.color-popover,.opacity-popover")) return;
    const inToolbar = !!target?.closest(".toolbar");
    const inPreview = !!target?.closest(".preview-text");
    if (isEditing) {
      if (!inToolbar) return;
    } else if (!inPreview && !inToolbar) {
      return;
    }
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      console.error("startDragging failed", err);
    }
  }

  async function toggleTopmost() {
    if (!note) return;
    try {
      const all = await invoke("toggle_z_order_and_apply", {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
        opacityDraft = updated.opacity ?? 1;
      }
      await applyZOrderAndParent();
      await applyInteractionPolicy();
    } catch (e) {
      console.error("toggleTopmost", e);
    }
  }

  /** @param {string} color */
  async function setBackgroundColor(color) {
    if (!note) return;
    try {
      const all = await invoke("update_note_color", {
        // @ts-ignore
        id: note.id,
        color,
        sortMode: "custom",
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
      }
      showPalette = false;
    } catch (e) {
      console.error("setBackgroundColor", e);
    }
  }

  /** @param {number} opacity */
  async function setOpacity(opacity) {
    if (!note) return;
    try {
      const all = await invoke("update_note_opacity", {
        // @ts-ignore
        id: note.id,
        opacity,
        sortMode: "custom",
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
        opacityDraft = updated.opacity ?? 1;
      }
    } catch (e) {
      console.error("setOpacity", e);
    }
  }

  /** @param {number} value */
  function queueOpacitySave(value) {
    clearTimeout(opacitySaveTimer);
    opacitySaveTimer = setTimeout(() => {
      setOpacity(value);
    }, 80);
  }

  /** @param {number} value */
  function applyOpacityDraft(value) {
    const next = Math.max(0.35, Math.min(1, Number(value) || 1));
    opacityDraft = next;
    if (note) {
      note = { ...note, opacity: next };
    }
    queueOpacitySave(next);
  }

  /** @param {Event} e */
  function onOpacityInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    applyOpacityDraft(Number(target.value));
  }

  /** @param {WheelEvent} e */
  function onOpacityWheel(e) {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.02 : -0.02;
    applyOpacityDraft(opacityDraft + step);
    showOpacityValue = true;
    clearTimeout(opacityValueHideTimer);
    opacityValueHideTimer = setTimeout(() => {
      showOpacityValue = false;
    }, 800);
  }

  async function toggleDone() {
    if (!note) return;
    try {
      const all = await invoke("toggle_done", {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      });
      await syncAfterCommand(all);
    } catch (e) {
      console.error("toggleDone", e);
    }
  }

  async function toggleArchive() {
    if (!note) return;
    try {
      const all = await invoke("toggle_archive", {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      });
      await syncAfterCommand(all, { closeIfUnpinned: true });
    } catch (e) {
      console.error("toggleArchive", e);
    }
  }

  async function unpinNote() {
    if (!note) return;
    try {
      const all = await invoke("toggle_pin", {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      });
      await syncAfterCommand(all, { closeIfUnpinned: true });
    } catch (e) {
      console.error("unpinNote", e);
    }
  }

  async function moveToTrash() {
    if (!note) return;
    try {
      const all = await invoke("delete_note", {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      });
      await syncAfterCommand(all, { closeIfUnpinned: true });
    } catch (e) {
      console.error("moveToTrash", e);
    }
  }

  onMount(() => {
    /** @type {Array<Promise<() => void>>} */
    const unlistenPromises = [];

    unlistenPromises.push(
      listen("overlay_input_changed", async (event) => {
        // @ts-ignore
        clickThrough = !!event.payload;
        try {
          await applyInteractionPolicy();
          await applyZOrderAndParent();
        } catch (e) {
          console.error("overlay_input_changed", e);
        }
      }),
    );

    unlistenPromises.push(
      listen("notes_changed", async () => {
        await loadNote();
        await applyInteractionPolicy();
        await applyZOrderAndParent();
      }),
    );

    loadLocale()
      .then(loadOverlayInteractionState)
      .then(loadNote)
      .then(async () => {
        await applyInteractionPolicy();
        await applyZOrderAndParent();
      });

    return async () => {
      for (const p of unlistenPromises) {
        try {
          const unlisten = await p;
          unlisten();
        } catch {
          // ignore
        }
      }
      clearTimeout(opacitySaveTimer);
      clearTimeout(opacityValueHideTimer);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="note-window" style="background: {noteBackground};" onmousedown={handleDragMouseDown}>
  {#if note}
    {#if isEditing}
      <textarea
        bind:value={text}
        bind:this={editorEl}
        oninput={handleInput}
        class="editor"
        spellcheck="false"
      ></textarea>
    {:else}
      <div class="preview-text">{text || note.text}</div>
    {/if}

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="toolbar">
        <div class="toolbar-drag-pad"></div>
        <button
          class="tool-btn"
          onclick={() => (isEditing ? exitEditMode() : enterEditMode())}
          title={isEditing ? strings.saveNote : strings.edit}
        >
          {#if isEditing}
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 00-2 2v14l4-4h10a2 2 0 002-2V5a2 2 0 00-2-2zm-1 8H8V9h8v2z"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0L15.13 5.1l3.75 3.75 1.83-1.81z"/></svg>
          {/if}
        </button>

        <button
          class="tool-btn"
          class:active={note.isAlwaysOnTop}
          onclick={toggleTopmost}
          title={note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
        >
          {#if note.isAlwaysOnTop}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="14.5" width="14" height="4.5" rx="1.6"></rect>
              <path d="M12 4.5v8"></path>
              <path d="M8.8 9.6 12 12.8l3.2-3.2"></path>
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="4.8" width="14" height="4.5" rx="1.6"></rect>
              <path d="M12 19.5v-8"></path>
              <path d="M8.8 14.4 12 11.2l3.2 3.2"></path>
            </svg>
          {/if}
        </button>

        <button class="tool-btn" onclick={toggleMouseInteraction} title={strings.overlayClickThrough}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3.87 0-7 3.13-7 7v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7zm5 13c0 2.76-2.24 5-5 5s-5-2.24-5-5v-4h10v4zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5H7z"/></svg>
        </button>

        <button class="tool-btn" onclick={() => (showPalette = !showPalette)} title="Change color">🎨</button>
        <button class="tool-btn" onclick={() => (showOpacityPanel = !showOpacityPanel)} title="Opacity">◐</button>

      <button class="tool-btn" onclick={toggleDone} title={note.isDone ? strings.markUndone : strings.markDone}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z"/></svg>
      </button>

      <button class="tool-btn" onclick={toggleArchive} title={note.isArchived ? strings.unarchive : strings.archive}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>
      </button>

      <button class="tool-btn" onclick={unpinNote} title={strings.unpinNote}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z"/></svg>
      </button>

      <button class="tool-btn danger" onclick={moveToTrash} title={strings.delete}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>

      <button class="tool-btn" onclick={() => getCurrentWindow().close()} title={strings.close}>✕</button>

      {#if showPalette}
        <div class="color-popover">
          {#each NOTE_COLORS as c}
            <button
              class="color-dot"
              class:active={c === noteBgColor}
              style="background:{c};"
              title={c}
              onclick={() => setBackgroundColor(c)}
            ></button>
          {/each}
        </div>
      {/if}

        {#if showOpacityPanel}
          <div class="opacity-popover">
            <input
              class="opacity-slider"
              type="range"
              min="0.35"
              max="1"
              step="0.01"
              value={opacityDraft}
              oninput={onOpacityInput}
              onwheel={onOpacityWheel}
            />
            {#if showOpacityValue}
              <div class="opacity-value">{Math.round(opacityDraft * 100)}%</div>
            {/if}
          </div>
        {/if}
    </div>
  {:else}
    <div class="loading">Loading...</div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: transparent;
  }

  .note-window {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .editor {
    flex: 1;
    background: transparent;
    border: none;
    resize: none;
    padding: 16px;
    font-family: "Segoe UI", sans-serif;
    font-size: 16px;
    outline: none;
  }

  .preview-text {
    flex: 1;
    padding: 16px;
    font-family: "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.4;
    color: #1f2937;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
    user-select: none;
    cursor: default;
  }

  .toolbar {
    position: relative;
    min-height: 36px;
    display: flex;
    align-items: center;
    padding: 0 8px;
    opacity: 0;
    transition: opacity 0.2s;
    gap: 2px;
  }

  .toolbar-drag-pad {
    flex: 1;
    min-height: 28px;
  }

  .note-window:hover .toolbar {
    opacity: 1;
  }

  .tool-btn {
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.52);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    padding: 0;
    font-size: 13px;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.8);
    color: #111827;
  }

  .tool-btn.active {
    color: #0f4c81;
  }

  .tool-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .tool-btn.danger {
    color: #b91c1c;
  }

  .color-popover {
    position: absolute;
    right: 84px;
    bottom: 34px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(4, 18px);
    gap: 6px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  .opacity-popover {
    position: absolute;
    right: 54px;
    bottom: 34px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  .opacity-slider {
    width: 110px;
    cursor: pointer;
  }

  .opacity-value {
    font-size: 11px;
    color: #1f2937;
    text-align: right;
    font-weight: 600;
    user-select: none;
  }

  .color-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    padding: 0;
  }

  .color-dot.active {
    outline: 2px solid #374151;
    outline-offset: 1px;
  }
</style>
