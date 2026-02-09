<script>
  import { onMount, tick } from "svelte";
  import { convertFileSrc, invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { LogicalPosition } from "@tauri-apps/api/dpi";
  import { listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";
  import { getStrings } from "$lib/strings.js";
  import BlockEditor from "$lib/components/note/BlockEditor.svelte";
  import { filterNoteCommands, getNoteCommandPreview } from "$lib/markdown/command-catalog.js";
  import { expandNoteCommands, renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import {
    EDITOR_DISPLAY_MODE,
    loadEditorDisplayMode,
    nextEditorDisplayMode,
    saveEditorDisplayMode,
  } from "$lib/note/editor-display-mode.js";

  const DEFAULT_NOTE_COLOR = "#fff9c4";
  const DEFAULT_NOTE_TEXT_COLOR = "#1f2937";
  const DEFAULT_NOTE_OPACITY = 1;
  const DEFAULT_NOTE_FROST = 0.22;
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
  const NOTE_TEXT_COLORS = [
    "#111827",
    "#1f2937",
    "#334155",
    "#374151",
    "#4b5563",
    "#0f4c81",
    "#7c2d12",
    "#7f1d1d",
  ];
  /** @type {any} */
  let note = $state(null);
  const noteId = $derived($page.params.id);
  let text = $state("");
  let clickThrough = $state(false);
  /** @type {string} */
  let locale = $state("en");
  let showPalette = $state(false);
  let showTextColorPalette = $state(false);
  let showOpacityPanel = $state(false);
  let showFrostPanel = $state(false);
  let showOpacityValue = $state(false);
  let showFrostValue = $state(false);
  let isEditing = $state(false);
  let showCommandSuggestions = $state(false);
  let commandQuery = $state("");
  let commandActiveIndex = $state(0);
  let editorDisplayMode = $state(EDITOR_DISPLAY_MODE.BLOCKS);
  let opacityDraft = $state(DEFAULT_NOTE_OPACITY);
  let frostDraft = $state(DEFAULT_NOTE_FROST);
  /** @type {any} */
  let opacitySaveTimer;
  /** @type {any} */
  let frostSaveTimer;
  /** @type {any} */
  let opacityValueHideTimer;
  /** @type {any} */
  let frostValueHideTimer;
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = $state(null);
  let isDraggingWindow = $state(false);
  let dragWindowX = 0;
  let dragWindowY = 0;
  let lastDragScreenX = 0;
  let lastDragScreenY = 0;
  let dragPointerId = -1;
  const strings = $derived(getStrings(locale));
  const noteBgColor = $derived(note?.bgColor || DEFAULT_NOTE_COLOR);
  const noteTextColor = $derived(note?.textColor || DEFAULT_NOTE_TEXT_COLOR);
  const noteOpacity = $derived(note?.opacity ?? DEFAULT_NOTE_OPACITY);
  const noteFrost = $derived(note?.frost ?? DEFAULT_NOTE_FROST);
  const noteFrostBlur = $derived((4 + noteFrost * 16).toFixed(2));
  const noteFrostOverlay = $derived((0.04 + noteFrost * 0.24).toFixed(3));

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
  const renderedMarkdown = $derived(renderNoteMarkdown(text || note?.text || ""));
  const commandSuggestions = $derived(filterNoteCommands(commandQuery));
  const commandSuggestionItems = $derived(
    commandSuggestions.map((cmd) => ({ ...cmd, preview: getNoteCommandPreview(cmd) })),
  );
  const isBlockEditor = $derived(editorDisplayMode === EDITOR_DISPLAY_MODE.BLOCKS);
  const isSplitEditor = $derived(editorDisplayMode === EDITOR_DISPLAY_MODE.SPLIT);

  async function loadNote() {
    try {
      const allNotes = await invoke("load_notes", { sortMode: "custom" });
      // @ts-ignore
      const n = allNotes.find((item) => item.id === noteId);
      if (n) {
        note = n;
        text = n.text;
        opacityDraft = n.opacity ?? DEFAULT_NOTE_OPACITY;
        frostDraft = n.frost ?? DEFAULT_NOTE_FROST;
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
    opacityDraft = updated.opacity ?? DEFAULT_NOTE_OPACITY;
    frostDraft = updated.frost ?? DEFAULT_NOTE_FROST;

    if (options.closeIfUnpinned && !updated.isPinned) {
      await getCurrentWindow().close();
      return;
    }

  }

  async function applyZOrderAndParent() {
    if (!note) return;
    try {
      await invoke("apply_note_window_layer", {
        isAlwaysOnTop: !!note.isAlwaysOnTop,
      });
    } catch (e) {
      console.error("applyZOrderAndParent", e);
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

  /**
   * @param {Blob} blob
   * @returns {Promise<string>}
   */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const base64 = raw.startsWith("data:") ? raw.split(",")[1] || "" : raw;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("read blob failed"));
      reader.readAsDataURL(blob);
    });
  }
  /** @param {Event} [event] */
  function handleInput(event) {
    clearTimeout(timeout);
    timeout = setTimeout(save, 500);
    const target =
      /** @type {HTMLTextAreaElement | null} */ (event?.currentTarget) || editorEl;
    updateCommandSuggestions(target);
  }

  /** @param {string} _nextText */
  function handleBlockEditorChange(_nextText) {
    clearTimeout(timeout);
    timeout = setTimeout(save, 500);
    showCommandSuggestions = false;
    commandQuery = "";
  }

  /** @param {ClipboardEvent} event */
  async function onEditorPaste(event) {
    const items = event.clipboardData?.items;
    if (!items || !editorEl) return;
    const imageItem = Array.from(items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    try {
      const dataBase64 = await blobToBase64(file);
      const savedPath = await invoke("save_clipboard_image", {
        noteId: note?.id || noteId,
        mimeType: file.type || "image/png",
        dataBase64,
      });
      const imageSrc = convertFileSrc(savedPath);
      const start = editorEl.selectionStart ?? text.length;
      const end = editorEl.selectionEnd ?? start;
      const label = `pasted-${new Date().toISOString().replaceAll(":", "-")}`;
      const md = `![${label}](${imageSrc})`;
      text = text.slice(0, start) + md + text.slice(end);
      showCommandSuggestions = false;
      await tick();
      const caret = start + md.length;
      editorEl.focus();
      editorEl.setSelectionRange(caret, caret);
      clearTimeout(timeout);
      timeout = setTimeout(save, 500);
    } catch (e) {
      console.error("onEditorPaste", e);
    }
  }

  async function enterEditMode() {
    if (clickThrough) return;
    isEditing = true;
    showPalette = false;
    showTextColorPalette = false;
    showOpacityPanel = false;
    showFrostPanel = false;
    await tick();
    editorEl?.focus();
    editorEl?.setSelectionRange(text.length, text.length);
  }

  async function exitEditMode() {
    await save();
    isEditing = false;
    showCommandSuggestions = false;
  }

  function toggleEditorLayoutMode() {
    const next = nextEditorDisplayMode(editorDisplayMode);
    editorDisplayMode = next;
    saveEditorDisplayMode(next);
    showCommandSuggestions = false;
  }

  function editorModeHint() {
    const next = nextEditorDisplayMode(editorDisplayMode);
    if (next === EDITOR_DISPLAY_MODE.BLOCKS) return strings.editorBlockMode;
    if (next === EDITOR_DISPLAY_MODE.SOURCE) return strings.editorSourceMode;
    return strings.editorSplitMode;
  }

  async function toggleMouseInteraction() {
    try {
      const next = await invoke("toggle_overlay_interaction");
      clickThrough = !!next;
      await applyInteractionPolicy();
    } catch (e) {
      console.error("toggleMouseInteraction", e);
    }
  }

  /**
   * @param {PointerEvent} e
   * @param {HTMLDivElement} dragSurface
   */
  async function startManualWindowDrag(e, dragSurface) {
    const win = getCurrentWindow();
    const [position, scaleFactor] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
    dragWindowX = position.x / scaleFactor;
    dragWindowY = position.y / scaleFactor;
    lastDragScreenX = e.screenX;
    lastDragScreenY = e.screenY;
    dragPointerId = e.pointerId;
    isDraggingWindow = true;
    dragSurface.setPointerCapture(e.pointerId);
  }

  /** @param {PointerEvent} e */
  function applyManualWindowDragPosition(e) {
    if (!isDraggingWindow) return;
    if (e.pointerId !== dragPointerId) return;
    if (e.buttons !== 1) {
      endManualWindowDrag();
      return;
    }
    const deltaX = e.screenX - lastDragScreenX;
    const deltaY = e.screenY - lastDragScreenY;
    lastDragScreenX = e.screenX;
    lastDragScreenY = e.screenY;
    dragWindowX += deltaX;
    dragWindowY += deltaY;
    getCurrentWindow()
      .setPosition(new LogicalPosition(dragWindowX, dragWindowY))
      .catch((err) => {
        console.error("setPosition failed", err);
        isDraggingWindow = false;
      });
  }

  function endManualWindowDrag() {
    isDraggingWindow = false;
    dragPointerId = -1;
  }

  /** @param {PointerEvent} e */
  function onDragPointerMove(e) {
    applyManualWindowDragPosition(e);
  }

  /** @param {PointerEvent} e */
  function onDragPointerUp(e) {
    if (e.pointerId !== dragPointerId) return;
    const surface = /** @type {HTMLDivElement | null} */ (e.currentTarget);
    if (surface?.hasPointerCapture(e.pointerId)) {
      surface.releasePointerCapture(e.pointerId);
    }
    endManualWindowDrag();
  }

  /** @param {PointerEvent} e */
  async function handleDragPointerDown(e) {
    if (e.button !== 0) return;
    if (clickThrough) return;
    const target = /** @type {HTMLElement | null} */ (e.target);
    dismissFloatingPanelsOnPointerDown(target);
    if (
      target?.closest("button,textarea,.color-popover,.text-color-popover,.opacity-popover,.frost-popover")
    ) {
      return;
    }
    const inToolbar = !!target?.closest(".toolbar");
    const inPreview = !!target?.closest(".preview-text");
    if (isEditing) {
      if (!inToolbar) return;
    } else if (!inPreview && !inToolbar) {
      return;
    }
    e.preventDefault();
    try {
      const surface = /** @type {HTMLDivElement} */ (e.currentTarget);
      await startManualWindowDrag(e, surface);
    } catch (err) {
      console.error("startManualWindowDrag failed", err);
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
        opacityDraft = updated.opacity ?? DEFAULT_NOTE_OPACITY;
        frostDraft = updated.frost ?? DEFAULT_NOTE_FROST;
      }
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

  /** @param {string} color */
  async function setTextColor(color) {
    if (!note) return;
    try {
      const all = await invoke("update_note_text_color", {
        // @ts-ignore
        id: note.id,
        color,
        sortMode: "custom",
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
      }
      showTextColorPalette = false;
    } catch (e) {
      console.error("setTextColor", e);
    }
  }

  /**
   * @param {number} opacity
   * @param {boolean} emitEvent
   */
  async function setOpacity(opacity, emitEvent) {
    if (!note) return;
    try {
      const all = await invoke("update_note_opacity", {
        // @ts-ignore
        id: note.id,
        opacity,
        sortMode: "custom",
        emitEvent,
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
        opacityDraft = updated.opacity ?? DEFAULT_NOTE_OPACITY;
        frostDraft = updated.frost ?? DEFAULT_NOTE_FROST;
      }
    } catch (e) {
      console.error("setOpacity", e);
    }
  }

  /**
   * @param {number} frost
   * @param {boolean} emitEvent
   */
  async function setFrost(frost, emitEvent) {
    if (!note) return;
    try {
      const all = await invoke("update_note_frost", {
        // @ts-ignore
        id: note.id,
        frost,
        sortMode: "custom",
        emitEvent,
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
        frostDraft = updated.frost ?? DEFAULT_NOTE_FROST;
      }
    } catch (e) {
      console.error("setFrost", e);
    }
  }

  /** @param {number} value */
  function queueOpacitySave(value) {
    clearTimeout(opacitySaveTimer);
    opacitySaveTimer = setTimeout(() => {
      setOpacity(value, false);
    }, 60);
  }

  /** @param {number} value */
  function queueFrostSave(value) {
    clearTimeout(frostSaveTimer);
    frostSaveTimer = setTimeout(() => {
      setFrost(value, false);
    }, 60);
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

  /** @param {number} value */
  function applyFrostDraft(value) {
    const next = Math.max(0, Math.min(1, Number(value) || 0));
    frostDraft = next;
    if (note) {
      note = { ...note, frost: next };
    }
    queueFrostSave(next);
  }

  /** @param {Event} e */
  function onOpacityInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    applyOpacityDraft(Number(target.value));
  }

  /** @param {Event} e */
  function onFrostInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    applyFrostDraft(Number(target.value));
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

  /** @param {WheelEvent} e */
  function onFrostWheel(e) {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.02 : -0.02;
    applyFrostDraft(frostDraft + step);
    showFrostValue = true;
    clearTimeout(frostValueHideTimer);
    frostValueHideTimer = setTimeout(() => {
      showFrostValue = false;
    }, 800);
  }

  /** @param {WheelEvent} e */
  function onOpacityIconWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    showOpacityPanel = true;
    onOpacityWheel(e);
  }

  /** @param {WheelEvent} e */
  function onFrostIconWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    showFrostPanel = true;
    onFrostWheel(e);
  }

  /**
   * @param {HTMLTextAreaElement | null} target
   */
  function updateCommandSuggestions(target) {
    if (!target) {
      showCommandSuggestions = false;
      return;
    }
    const caret = target.selectionStart ?? 0;
    const beforeCaret = text.slice(0, caret);
    const token = /(^|\s)@([a-zA-Z]*)$/.exec(beforeCaret);
    if (!token) {
      showCommandSuggestions = false;
      commandQuery = "";
      return;
    }
    commandQuery = token[2] || "";
    showCommandSuggestions = true;
    commandActiveIndex = 0;
  }

  /**
   * @param {number} index
   */
  async function applyCommandSuggestion(index) {
    if (!editorEl) return;
    const items = commandSuggestions;
    if (!items.length) return;
    const selected = items[Math.max(0, Math.min(index, items.length - 1))];
    const caret = editorEl.selectionStart ?? 0;
    const beforeCaret = text.slice(0, caret);
    const token = /(^|\s)@([a-zA-Z]*)$/.exec(beforeCaret);
    if (!token) return;

    const tokenLen = (token[2] || "").length + 1;
    const tokenStart = beforeCaret.length - tokenLen;
    const suffix = text.slice(caret);
    const nextText = text.slice(0, tokenStart) + selected.insert + suffix;
    const transformed = expandNoteCommands(nextText);
    text = transformed;
    showCommandSuggestions = false;
    commandQuery = "";
    await tick();
    const nextCaret = Math.max(0, transformed.length - suffix.length);
    editorEl.focus();
    editorEl.setSelectionRange(nextCaret, nextCaret);
    clearTimeout(timeout);
    timeout = setTimeout(save, 500);
  }

  /** @param {KeyboardEvent} e */
  function onEditorKeydown(e) {
    if (!showCommandSuggestions || commandSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      commandActiveIndex = Math.min(
        commandActiveIndex + 1,
        commandSuggestions.length - 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      commandActiveIndex = Math.max(commandActiveIndex - 1, 0);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyCommandSuggestion(commandActiveIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      showCommandSuggestions = false;
    }
  }

  /** @param {HTMLElement | null} target */
  function dismissFloatingPanelsOnPointerDown(target) {
    if (!target) return;
    if (showCommandSuggestions && !target.closest(".command-popover")) {
      showCommandSuggestions = false;
    }

    if (showPalette && !target.closest(".color-popover") && !target.closest(".color-trigger")) {
      showPalette = false;
    }
    if (
      showTextColorPalette &&
      !target.closest(".text-color-popover") &&
      !target.closest(".text-color-trigger")
    ) {
      showTextColorPalette = false;
    }
    if (
      showOpacityPanel &&
      !target.closest(".opacity-popover") &&
      !target.closest(".opacity-trigger")
    ) {
      showOpacityPanel = false;
      showOpacityValue = false;
    }
    if (showFrostPanel && !target.closest(".frost-popover") && !target.closest(".frost-trigger")) {
      showFrostPanel = false;
      showFrostValue = false;
    }
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
        } catch (e) {
          console.error("overlay_input_changed", e);
        }
      }),
    );

    unlistenPromises.push(
      listen("notes_changed", async () => {
        await loadNote();
        await applyInteractionPolicy();
      }),
    );

    editorDisplayMode = loadEditorDisplayMode();

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
      endManualWindowDrag();
      clearTimeout(opacitySaveTimer);
      clearTimeout(frostSaveTimer);
      clearTimeout(opacityValueHideTimer);
      clearTimeout(frostValueHideTimer);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="note-window"
  style="background: {noteBackground}; --note-text-color: {noteTextColor}; --frost-blur: {noteFrostBlur}px; --frost-overlay: {noteFrostOverlay};"
  onpointerdown={handleDragPointerDown}
  onpointermove={onDragPointerMove}
  onpointerup={onDragPointerUp}
  onpointercancel={onDragPointerUp}
>
  {#if note}
    {#if isEditing}
      {#if isBlockEditor}
        <BlockEditor bind:text noteId={note?.id || noteId} onTextChange={handleBlockEditorChange} />
      {:else}
        <div class="editor-shell" class:split={isSplitEditor}>
          <textarea
            bind:value={text}
            bind:this={editorEl}
            oninput={handleInput}
            onpaste={onEditorPaste}
            onkeydown={onEditorKeydown}
            class="editor"
            class:split={isSplitEditor}
            spellcheck="false"
          ></textarea>
          {#if isSplitEditor}
            <div class="editor-live-preview preview-markdown">{@html renderedMarkdown}</div>
          {/if}
        </div>
      {/if}
      {#if !isBlockEditor && showCommandSuggestions && commandSuggestionItems.length > 0}
        <div class="command-popover">
          {#each commandSuggestionItems as cmd, idx (cmd.name)}
            <button
              class="command-item"
              class:active={idx === commandActiveIndex}
              onclick={() => applyCommandSuggestion(idx)}
              type="button"
            >
              <span class="command-name">{cmd.name}</span>
              <span class="command-preview">{cmd.preview}</span>
            </button>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="preview-text preview-markdown">{@html renderedMarkdown}</div>
    {/if}

    <div class="toolbar-mask" aria-hidden="true"></div>
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
        {#if isEditing}
          <button
            class="tool-btn"
            onclick={toggleEditorLayoutMode}
            title={editorModeHint()}
          >
            {#if isBlockEditor}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="6" width="14" height="12" rx="2"></rect>
                <path d="M8 10h8"></path>
                <path d="M8 13h6"></path>
              </svg>
            {:else if isSplitEditor}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                <path d="M12 5v14"></path>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                <path d="M7.5 9h9"></path>
                <path d="M7.5 12h9"></path>
                <path d="M7.5 15h6"></path>
              </svg>
            {/if}
          </button>
        {/if}

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

        <button class="tool-btn color-trigger" onclick={() => (showPalette = !showPalette)} title="Change color">🎨</button>
        <button
          class="tool-btn text-color-trigger"
          onclick={() => (showTextColorPalette = !showTextColorPalette)}
          title={strings.textColor}
        >A</button>
        <div class="tool-popover-anchor">
          <button
            class="tool-btn opacity-trigger"
            onclick={() => (showOpacityPanel = !showOpacityPanel)}
            onwheel={onOpacityIconWheel}
            title={strings.glassAdjust}
          >◐</button>
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
        <div class="tool-popover-anchor">
          <button
            class="tool-btn frost-trigger"
            onclick={() => (showFrostPanel = !showFrostPanel)}
            onwheel={onFrostIconWheel}
            title={strings.frost}
          >❆</button>
          {#if showFrostPanel}
            <div class="frost-popover">
              <input
                class="frost-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={frostDraft}
                oninput={onFrostInput}
                onwheel={onFrostWheel}
              />
              {#if showFrostValue}
                <div class="frost-value">{Math.round(frostDraft * 100)}%</div>
              {/if}
            </div>
          {/if}
        </div>

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
      {#if showTextColorPalette}
        <div class="text-color-popover">
          {#each NOTE_TEXT_COLORS as c}
            <button
              class="text-color-dot"
              class:active={c === noteTextColor}
              style="background:{c};"
              title={c}
              onclick={() => setTextColor(c)}
            ></button>
          {/each}
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
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    backdrop-filter: blur(var(--frost-blur, 7px)) saturate(1.08);
    -webkit-backdrop-filter: blur(var(--frost-blur, 7px)) saturate(1.08);
  }

  .note-window::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, var(--frost-overlay, 0.09));
    pointer-events: none;
    z-index: 0;
  }

  .note-window > * {
    position: relative;
    z-index: 1;
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
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    color: var(--note-text-color, #1f2937);
  }

  .editor-shell {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .editor-shell.split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
    gap: 10px;
    padding: 10px 10px 0;
  }

  .editor.split {
    flex: 1;
    min-height: 0;
    border-right: 1px dashed rgba(100, 116, 139, 0.45);
    padding: 6px 12px 10px 4px;
  }

  .editor-live-preview {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px 14px;
    font-family: "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.45;
    color: var(--note-text-color, #1f2937);
    scrollbar-width: none;
    -ms-overflow-style: none;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .editor-live-preview::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }


  .editor::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .preview-text {
    flex: 1;
    padding: 16px;
    font-family: "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.4;
    color: var(--note-text-color, #1f2937);
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
    user-select: none;
    cursor: default;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .preview-text::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .command-popover {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 62px;
    max-height: 180px;
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
    z-index: 4;
    padding: 4px;
  }

  .command-item {
    width: 100%;
    border: none;
    border-radius: 8px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    cursor: pointer;
    text-align: left;
  }

  .command-item:hover,
  .command-item.active {
    background: rgba(15, 76, 129, 0.1);
  }

  .command-name {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
  }

  .command-preview {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: auto;
  }

  .preview-markdown :global(h1),
  .preview-markdown :global(h2),
  .preview-markdown :global(h3) {
    margin: 0 0 8px;
    line-height: 1.3;
  }

  .preview-markdown :global(h1) {
    font-size: 1.15rem;
  }

  .preview-markdown :global(h2) {
    font-size: 1.05rem;
  }

  .preview-markdown :global(h3) {
    font-size: 0.98rem;
  }

  .preview-markdown :global(p) {
    margin: 0 0 8px;
  }

  .preview-markdown :global(ul),
  .preview-markdown :global(ol) {
    margin: 0 0 8px 18px;
    padding: 0;
  }

  .preview-markdown :global(blockquote) {
    margin: 0 0 8px;
    padding: 4px 10px;
    border-left: 3px solid rgba(15, 76, 129, 0.38);
    background: rgba(255, 255, 255, 0.28);
    border-radius: 4px;
  }

  .preview-markdown :global(hr) {
    border: none;
    height: 1px;
    background: rgba(55, 65, 81, 0.2);
    margin: 8px 0;
  }

  .preview-markdown :global(code) {
    font-family: Consolas, "Cascadia Code", monospace;
    background: rgba(15, 23, 42, 0.08);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 0.88em;
  }

  .preview-markdown :global(pre) {
    margin: 0 0 8px;
    padding: 8px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.1);
    overflow: auto;
  }

  .preview-markdown :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .preview-markdown :global(table) {
    border-collapse: collapse;
    margin: 0 0 8px;
    width: 100%;
    font-size: 0.92em;
  }

  .preview-markdown :global(img) {
    max-width: 100%;
    height: auto;
    display: inline-block;
    vertical-align: middle;
    margin: 2px 4px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
  }

  .preview-markdown :global(th),
  .preview-markdown :global(td) {
    border: 1px solid rgba(55, 65, 81, 0.25);
    padding: 4px 6px;
  }

  .preview-markdown :global(th) {
    background: rgba(255, 255, 255, 0.45);
    text-align: left;
  }

  .preview-markdown :global(ul.task-list) {
    list-style: none;
    margin-left: 0;
  }

  .preview-markdown :global(li.task-item) {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .preview-markdown :global(li.task-item input[type="checkbox"]) {
    margin-top: 2px;
    accent-color: #0f4c81;
  }

  .toolbar {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    min-height: 36px;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    opacity: 0;
    transition: opacity 0.2s;
    gap: 2px;
    pointer-events: none;
    z-index: 2;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
  }

  .toolbar-drag-pad {
    flex: 1;
    min-height: 28px;
  }

  .toolbar-mask {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 96px;
    background: linear-gradient(to top, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.78) 45%, rgba(255, 255, 255, 0) 100%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 1;
  }

  .note-window:hover .toolbar {
    opacity: 1;
    pointer-events: auto;
  }

  .note-window:hover .toolbar-mask {
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

  .tool-popover-anchor {
    position: relative;
    display: inline-flex;
    align-items: center;
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

  .text-color-popover {
    position: absolute;
    right: 114px;
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
    left: 50%;
    transform: translateX(-50%);
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

  .frost-popover {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
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

  .frost-slider {
    width: 110px;
    cursor: pointer;
  }

  .frost-value {
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

  .text-color-dot {
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

  .text-color-dot.active {
    outline: 2px solid #374151;
    outline-offset: 1px;
  }
</style>
