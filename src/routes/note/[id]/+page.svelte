<script>
  import { onMount, tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";
  import { getStrings } from "$lib/strings.js";
  import NotePreview from "$lib/components/note/NotePreview.svelte";
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";
  import NoteToolbar from "$lib/components/note/NoteToolbar.svelte";
  import SourceEditorPane from "$lib/components/note/SourceEditorPane.svelte";
  import { filterNoteCommands, getNoteCommandPreview } from "$lib/markdown/command-catalog.js";
  import { renderNoteMarkdown } from "$lib/markdown/note-markdown.js";
  import {
    findNoteById,
    invokeNoteCommand,
    loadNoteWindowSnapshot,
    resolveNoteId,
  } from "$lib/note/note-window-actions.js";
  import { createNoteWindowDragController } from "$lib/note/note-window-drag.js";
  import { createNoteStyleActions } from "$lib/note/note-style-actions.js";
  import { createNoteEditorActions } from "$lib/note/note-editor-actions.js";
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
  /** @type {any} */
  let note = $state(null);
  const noteId = $derived(String($page.params.id || ""));
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
  let tagSuggestions = $state(/** @type {string[]} */ ([]));
  let opacityDraft = $state(DEFAULT_NOTE_OPACITY);
  let frostDraft = $state(DEFAULT_NOTE_FROST);
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = $state(null);
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

  async function loadNote() {
    try {
      const snapshot = await loadNoteWindowSnapshot({
        invoke,
        noteId,
        defaultOpacity: DEFAULT_NOTE_OPACITY,
        defaultFrost: DEFAULT_NOTE_FROST,
        tagSuggestionLimit: 60,
      });
      tagSuggestions = snapshot.tagSuggestions;
      if (snapshot.note) {
        note = snapshot.note;
        text = snapshot.text;
        opacityDraft = snapshot.opacityDraft;
        frostDraft = snapshot.frostDraft;
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
    return findNoteById(all, noteId);
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
        isWallpaper: !!note.isWallpaper,
      });
    } catch (e) {
      console.error("applyZOrderAndParent", e);
    }
  }

  async function applyInteractionPolicy() {
    const ignoreCursor = note?.isWallpaper ? true : clickThrough;
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
        id: resolveNoteId(note, noteId),
        text,
        sortMode: "custom",
      });
    } catch (e) {
      console.error("save", e);
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

  async function toggleMouseInteraction() {
    try {
      const next = await invoke("toggle_overlay_interaction");
      clickThrough = !!next;
      await applyInteractionPolicy();
    } catch (e) {
      console.error("toggleMouseInteraction", e);
    }
  }

  async function toggleTopmost() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "toggle_z_order_and_apply",
        note,
        noteId,
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

  async function toggleWallpaperLayer() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "toggle_wallpaper_layer_and_apply",
        note,
        noteId,
      });
      const updated = findUpdatedFromList(all);
      if (updated) {
        note = updated;
        opacityDraft = updated.opacity ?? DEFAULT_NOTE_OPACITY;
        frostDraft = updated.frost ?? DEFAULT_NOTE_FROST;
      }
      await applyInteractionPolicy();
    } catch (e) {
      console.error("toggleWallpaperLayer", e);
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

  const noteWindowDrag = createNoteWindowDragController({
    getCurrentWindow,
    getClickThrough: () => clickThrough,
    getIsEditing: () => isEditing,
    dismissFloatingPanels: dismissFloatingPanelsOnPointerDown,
  });

  const noteStyleActions = createNoteStyleActions({
    getNote: () => note,
    getNoteId: () => noteId,
    getOpacityDraft: () => opacityDraft,
    getFrostDraft: () => frostDraft,
    invokeNoteCommand: (input) => invokeNoteCommand({ invoke, ...input }),
    findUpdatedFromList,
    setNote: (next) => (note = next),
    setOpacityDraft: (next) => (opacityDraft = next),
    setFrostDraft: (next) => (frostDraft = next),
    setShowPalette: (visible) => (showPalette = visible),
    setShowTextColorPalette: (visible) => (showTextColorPalette = visible),
    setShowOpacityPanel: (visible) => (showOpacityPanel = visible),
    setShowFrostPanel: (visible) => (showFrostPanel = visible),
    setShowOpacityValue: (visible) => (showOpacityValue = visible),
    setShowFrostValue: (visible) => (showFrostValue = visible),
    defaultOpacity: DEFAULT_NOTE_OPACITY,
    defaultFrost: DEFAULT_NOTE_FROST,
  });

  const noteEditorActions = createNoteEditorActions({
    invoke,
    tick,
    save,
    getNote: () => note,
    getNoteId: () => noteId,
    getText: () => text,
    setText: (next) => (text = next),
    getEditorEl: () => editorEl,
    getShowCommandSuggestions: () => showCommandSuggestions,
    getCommandSuggestions: () => commandSuggestions,
    getCommandActiveIndex: () => commandActiveIndex,
    setShowCommandSuggestions: (visible) => (showCommandSuggestions = visible),
    setCommandQuery: (query) => (commandQuery = query),
    setCommandActiveIndex: (index) => (commandActiveIndex = index),
  });

  async function toggleDone() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "toggle_done",
        note,
        noteId,
      });
      await syncAfterCommand(all);
    } catch (e) {
      console.error("toggleDone", e);
    }
  }

  async function toggleArchive() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "toggle_archive",
        note,
        noteId,
      });
      await syncAfterCommand(all, { closeIfUnpinned: true });
    } catch (e) {
      console.error("toggleArchive", e);
    }
  }

  async function unpinNote() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "toggle_pin",
        note,
        noteId,
      });
      await syncAfterCommand(all, { closeIfUnpinned: true });
    } catch (e) {
      console.error("unpinNote", e);
    }
  }

  async function moveToTrash() {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "delete_note",
        note,
        noteId,
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
      const all =
        priority == null
          ? await invokeNoteCommand({
              invoke,
              command: "clear_note_priority",
              note,
              noteId,
            })
          : await invokeNoteCommand({
              invoke,
              command: "update_note_priority",
              note,
              noteId,
              payload: { priority },
            });
      await syncAfterCommand(all);
    } catch (e) {
      console.error("setNotePriority", e);
    }
  }

  /** @param {string[]} tags */
  async function setNoteTags(tags) {
    if (!note) return;
    try {
      const all = await invokeNoteCommand({
        invoke,
        command: "update_note_tags",
        note,
        noteId,
        payload: { tags },
      });
      await syncAfterCommand(all);
    } catch (e) {
      console.error("setNoteTags", e);
    }
  }

  onMount(() => {
    /** @type {Array<Promise<() => void>>} */
    const unlistenPromises = [];

    unlistenPromises.push(
      listen("overlay_input_changed", async (event) => {
        clickThrough = !!/** @type {{ payload?: unknown }} */ (event).payload;
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
      noteWindowDrag.endManualWindowDrag();
      noteStyleActions.dispose();
      noteEditorActions.dispose();
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="note-window"
  style="background: {noteBackground}; --note-text-color: {noteTextColor}; --frost-blur: {noteFrostBlur}px; --frost-overlay: {noteFrostOverlay};"
  onpointerdown={noteWindowDrag.handleDragPointerDown}
  onpointermove={noteWindowDrag.onDragPointerMove}
  onpointerup={noteWindowDrag.onDragPointerUp}
  onpointercancel={noteWindowDrag.onDragPointerUp}
>
  {#if note}
    <NoteTagBar
      {strings}
      priority={note.priority ?? null}
      tags={Array.isArray(note.tags) ? note.tags : []}
      {tagSuggestions}
      onChangePriority={setNotePriority}
      onChangeTags={setNoteTags}
    />

    {#if isEditing}
      <SourceEditorPane
        bind:text
        bind:editorEl
        placeholder={strings.noteEditorPlaceholder}
        {showCommandSuggestions}
        {commandSuggestionItems}
        {commandActiveIndex}
        onInput={noteEditorActions.handleInput}
        onPaste={noteEditorActions.onEditorPaste}
        onKeydown={noteEditorActions.onEditorKeydown}
        onApplyCommandSuggestion={noteEditorActions.applyCommandSuggestion}
      />
    {:else}
      <NotePreview html={renderedMarkdown} />
    {/if}

    <NoteToolbar
      {strings}
      {isEditing}
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
      onToggleTopmost={toggleTopmost}
      onToggleWallpaper={toggleWallpaperLayer}
      onToggleMouseInteraction={toggleMouseInteraction}
      onTogglePalette={() => (showPalette = !showPalette)}
      onToggleTextColorPalette={() => (showTextColorPalette = !showTextColorPalette)}
      onToggleOpacityPanel={() => (showOpacityPanel = !showOpacityPanel)}
      onOpacityIconWheel={noteStyleActions.onOpacityIconWheel}
      onOpacityInput={noteStyleActions.onOpacityInput}
      onOpacityWheel={noteStyleActions.onOpacityWheel}
      onToggleFrostPanel={() => (showFrostPanel = !showFrostPanel)}
      onFrostIconWheel={noteStyleActions.onFrostIconWheel}
      onFrostInput={noteStyleActions.onFrostInput}
      onFrostWheel={noteStyleActions.onFrostWheel}
      onToggleDone={toggleDone}
      onToggleArchive={toggleArchive}
      onUnpin={unpinNote}
      onMoveToTrash={moveToTrash}
      onSetBackgroundColor={noteStyleActions.setBackgroundColor}
      onSetTextColor={noteStyleActions.setTextColor}
      onBackgroundColorPickerChange={noteStyleActions.onBackgroundColorPickerChange}
      onTextColorPickerChange={noteStyleActions.onTextColorPickerChange}
    />
  {:else}
    <div class="loading">Loading...</div>
  {/if}
</div>

<style>
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
