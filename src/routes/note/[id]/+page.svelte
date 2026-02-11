<script>
  import { onMount, tick } from "svelte";
  import { convertFileSrc, invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { LogicalPosition } from "@tauri-apps/api/dpi";
  import { listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";
  import { getStrings } from "$lib/strings.js";
  import BlockEditor from "$lib/components/note/BlockEditor.svelte";
  import NotePreview from "$lib/components/note/NotePreview.svelte";
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";
  import NoteToolbar from "$lib/components/note/NoteToolbar.svelte";
  import SourceEditorPane from "$lib/components/note/SourceEditorPane.svelte";
  import { filterNoteCommands, getNoteCommandPreview } from "$lib/markdown/command-catalog.js";
  import { expandNoteCommands, renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import { applySourceCommandInsert, findSourceCommandToken } from "$lib/note/source-command.js";
  import {
    DEFAULT_NOTE_COLOR,
    DEFAULT_NOTE_FROST,
    DEFAULT_NOTE_OPACITY,
    DEFAULT_NOTE_TEXT_COLOR,
    NOTE_COLORS,
    NOTE_TEXT_COLORS,
    hexToRgba,
    toColorPickerHex,
  } from "$lib/note/note-theme.js";
  import {
    EDITOR_DISPLAY_MODE,
    loadEditorDisplayMode,
    nextEditorDisplayMode,
    saveEditorDisplayMode,
  } from "$lib/note/editor-display-mode.js";
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
  const backgroundPickerValue = $derived(toColorPickerHex(noteBgColor, DEFAULT_NOTE_COLOR));
  const textPickerValue = $derived(toColorPickerHex(noteTextColor, DEFAULT_NOTE_TEXT_COLOR));

  const noteBackground = $derived(hexToRgba(noteBgColor, noteOpacity));
  const renderedMarkdown = $derived(renderNoteMarkdown(text || note?.text || ""));
  const commandSuggestions = $derived(filterNoteCommands(commandQuery));
  const commandSuggestionItems = $derived(
    commandSuggestions.map((cmd) => ({ ...cmd, preview: getNoteCommandPreview(cmd) })),
  );
  const isBlockEditor = $derived(editorDisplayMode === EDITOR_DISPLAY_MODE.BLOCKS);

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
    return strings.editorSourceMode;
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
      target?.closest("button,input,select,textarea,.note-tag-bar,.color-popover,.text-color-popover,.opacity-popover,.frost-popover")
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

  /**
   * @param {string} color
   * @param {{ closePopover?: boolean }} [options]
   */
  async function setBackgroundColor(color, options = {}) {
    if (!note) return;
    const closePopover = options.closePopover ?? true;
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
      if (closePopover) {
        showPalette = false;
      }
    } catch (e) {
      console.error("setBackgroundColor", e);
    }
  }

  /**
   * @param {string} color
   * @param {{ closePopover?: boolean }} [options]
   */
  async function setTextColor(color, options = {}) {
    if (!note) return;
    const closePopover = options.closePopover ?? true;
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
      if (closePopover) {
        showTextColorPalette = false;
      }
    } catch (e) {
      console.error("setTextColor", e);
    }
  }

  /** @param {Event} e */
  function onBackgroundColorPickerChange(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    setBackgroundColor(target.value, { closePopover: false });
  }

  /** @param {Event} e */
  function onTextColorPickerChange(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    setTextColor(target.value, { closePopover: false });
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
    const token = findSourceCommandToken(text, target.selectionStart ?? 0);
    if (!token) {
      showCommandSuggestions = false;
      commandQuery = "";
      return;
    }
    commandQuery = token.query;
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
    const suffix = text.slice(caret);
    const inserted = applySourceCommandInsert({
      text,
      caret,
      insert: selected.insert,
    });
    if (!inserted) return;
    const transformed = expandNoteCommands(inserted.nextText);
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

  /** @param {number | null} priority */
  async function setNotePriority(priority) {
    if (!note) return;
    try {
      const payload = {
        // @ts-ignore
        id: note.id,
        sortMode: "custom",
      };
      const all =
        priority == null
          ? await invoke("clear_note_priority", payload)
          : await invoke("update_note_priority", { ...payload, priority });
      await syncAfterCommand(all);
    } catch (e) {
      console.error("setNotePriority", e);
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
    <NoteTagBar {strings} priority={note.priority ?? null} onChangePriority={setNotePriority} />

    {#if isEditing}
      {#if isBlockEditor}
        <BlockEditor bind:text noteId={note?.id || noteId} onTextChange={handleBlockEditorChange} />
      {:else}
        <SourceEditorPane
          bind:text
          bind:editorEl
          {showCommandSuggestions}
          {commandSuggestionItems}
          {commandActiveIndex}
          onInput={handleInput}
          onPaste={onEditorPaste}
          onKeydown={onEditorKeydown}
          onApplyCommandSuggestion={applyCommandSuggestion}
        />
      {/if}
    {:else}
      <NotePreview html={renderedMarkdown} />
    {/if}

    <NoteToolbar
      {strings}
      {isEditing}
      {isBlockEditor}
      note={note}
      showPalette={showPalette}
      showTextColorPalette={showTextColorPalette}
      showOpacityPanel={showOpacityPanel}
      showFrostPanel={showFrostPanel}
      showOpacityValue={showOpacityValue}
      showFrostValue={showFrostValue}
      opacityDraft={opacityDraft}
      frostDraft={frostDraft}
      noteBgColor={noteBgColor}
      noteTextColor={noteTextColor}
      backgroundPickerValue={backgroundPickerValue}
      textPickerValue={textPickerValue}
      noteColors={NOTE_COLORS}
      noteTextColors={NOTE_TEXT_COLORS}
      onToggleEdit={() => (isEditing ? exitEditMode() : enterEditMode())}
      onToggleEditorLayoutMode={toggleEditorLayoutMode}
      {editorModeHint}
      onToggleTopmost={toggleTopmost}
      onToggleMouseInteraction={toggleMouseInteraction}
      onTogglePalette={() => (showPalette = !showPalette)}
      onToggleTextColorPalette={() => (showTextColorPalette = !showTextColorPalette)}
      onToggleOpacityPanel={() => (showOpacityPanel = !showOpacityPanel)}
      onOpacityIconWheel={onOpacityIconWheel}
      onOpacityInput={onOpacityInput}
      onOpacityWheel={onOpacityWheel}
      onToggleFrostPanel={() => (showFrostPanel = !showFrostPanel)}
      onFrostIconWheel={onFrostIconWheel}
      onFrostInput={onFrostInput}
      onFrostWheel={onFrostWheel}
      onToggleDone={toggleDone}
      onToggleArchive={toggleArchive}
      onUnpin={unpinNote}
      onMoveToTrash={moveToTrash}
      onSetBackgroundColor={setBackgroundColor}
      onSetTextColor={setTextColor}
      onBackgroundColorPickerChange={onBackgroundColorPickerChange}
      onTextColorPickerChange={onTextColorPickerChange}
    />
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

</style>
