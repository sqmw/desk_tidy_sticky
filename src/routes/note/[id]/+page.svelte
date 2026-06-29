<script>
  import { onMount, tick } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { LogicalSize } from "@tauri-apps/api/dpi";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { emit, listen } from "@tauri-apps/api/event";
  import { page } from "$app/stores";
  import { resolveAppLocale } from "$lib/i18n/locale.js";
  import { getStrings } from "$lib/strings.js";
  import BlockNoteContent from "$lib/components/note/BlockNoteContent.svelte";
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";
  import NoteToolbar from "$lib/components/note/NoteToolbar.svelte";
  import {
    appendTaskLineAfterBlock,
    toggleTaskLineAt,
  } from "$lib/markdown/note-markdown.js";
  import {
    findNoteById,
    invokeNoteCommand,
    loadNoteWindowSnapshot,
    resolveNoteId,
  } from "$lib/note/note-window-actions.js";
  import { createNoteWindowDragController } from "$lib/note/note-window-drag.js";
  import { createNoteStyleActions } from "$lib/note/note-style-actions.js";
  import { applyNoteWindowNativeEffects } from "$lib/note/note-native-effects.js";
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
  let globalControlDisabled = $state(false);
  /** @type {string} */
  let locale = $state(resolveAppLocale());
  let showPalette = $state(false);
  let showTextColorPalette = $state(false);
  let showOpacityPanel = $state(false);
  let showFrostPanel = $state(false);
  let showOpacityValue = $state(false);
  let showFrostValue = $state(false);
  let isEditing = $state(false);
  let isControlMode = $state(false);
  let outsideToolbarSlotEl = $state(/** @type {HTMLDivElement | null} */ (null));
  let outsideToolbarHeight = $state(0);
  let collapsedWindowHeight = $state(0);
  let toolbarWindowExpanded = $state(false);
  let suppressPointerActivationUntil = $state(0);
  let tagSuggestions = $state(/** @type {string[]} */ ([]));
  let hasNativeWindowFrost = $state(false);
  let opacityDraft = $state(DEFAULT_NOTE_OPACITY);
  let frostDraft = $state(DEFAULT_NOTE_FROST);
  const strings = $derived(getStrings(locale));
  const noteBgColor = $derived(note?.bgColor || DEFAULT_NOTE_COLOR);
  const noteTextColor = $derived(note?.textColor || DEFAULT_NOTE_TEXT_COLOR);
  const noteOpacity = $derived(note?.opacity ?? DEFAULT_NOTE_OPACITY);
  const noteFrost = $derived(note?.frost ?? DEFAULT_NOTE_FROST);
  const noteFrostBlur = $derived((noteFrost * 26).toFixed(2));
  const noteFrostOverlay = $derived((noteFrost * 0.34).toFixed(3));
  const noteFrostGlow = $derived((noteFrost * 0.16).toFixed(3));
  const noteBorderAlpha = $derived((0.06 + noteOpacity * 0.22).toFixed(3));
  const noteInnerHighlightAlpha = $derived((0.04 + noteOpacity * 0.16).toFixed(3));
  const backgroundPickerValue = $derived(toColorPickerHex(noteBgColor, DEFAULT_NOTE_COLOR));
  const textPickerValue = $derived(toColorPickerHex(noteTextColor, DEFAULT_NOTE_TEXT_COLOR));
  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(String(navigator.userAgent || navigator.platform || ""));
  const isWindows =
    typeof navigator !== "undefined" &&
    /win/i.test(String(navigator.userAgent || navigator.platform || ""));
  const noteBackground = $derived(hexToRgba(noteBgColor, noteOpacity));
  const cssFrostBlur = $derived((hasNativeWindowFrost ? noteFrost * 4 : noteFrostBlur));
  const noteWindowRadius = $derived(isWindows ? "0px" : "12px");
  const canInteract = $derived(!globalControlDisabled || !!note?.isAlwaysOnTop);
  const isEffectiveTopmost = $derived(!!note?.isAlwaysOnTop || !globalControlDisabled);
  const showTopmostControls = $derived(isEffectiveTopmost && (isControlMode || isEditing));
  const allowHoverToolbar = $derived((isEffectiveTopmost ? false : canInteract));
  const noteCenterHudText = $derived.by(() => {
    if (showOpacityValue) {
      return `${strings.noteOpacityHud} ${Math.round(opacityDraft * 100)}%`;
    }
    if (showFrostValue) {
      return `${strings.noteFrostHud} ${Math.round(frostDraft * 100)}%`;
    }
    return "";
  });
  const CONTROL_MODE_TRIGGER_BLOCKED_SELECTOR = [
    "button",
    "input",
    "select",
    "textarea",
    "a",
    "label",
    "summary",
    "[contenteditable=\"true\"]",
    ".block-note-content",
    ".note-tag-editor",
    ".toolbar",
    ".color-popover",
    ".text-color-popover",
    ".opacity-popover",
    ".frost-popover",
  ].join(",");
  const POINTER_ACTIVATION_SUPPRESS_MS = 240;
  const OUTSIDE_TOOLBAR_GAP_PX = 12;
  const NOTE_MIN_SIZE_PX = 220;
  const WINDOW_SIZE_PERSIST_DEBOUNCE_MS = 180;
  const WINDOW_SIZE_POLL_MS = 900;
  const TOOLBAR_MANAGED_RESIZE_TOLERANCE_PX = 2;
  const TOOLBAR_MANAGED_RESIZE_HOLD_MS = 700;
  let windowSizePersistTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let windowSizePollTimer = /** @type {ReturnType<typeof setInterval> | null} */ (null);
  let lastPersistedWindowSizeKey = "";
  let toolbarManagedResizeTargetHeight = 0;
  let toolbarManagedResizeHoldUntil = 0;

  function getNow() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  function getToolbarWindowReserve() {
    if (!showTopmostControls) return 0;
    return Math.max(0, outsideToolbarHeight + OUTSIDE_TOOLBAR_GAP_PX);
  }

  /**
   * @param {number} targetHeight
   * @param {number} [stableCollapsedHeight]
   */
  function beginToolbarManagedResize(targetHeight, stableCollapsedHeight = 0) {
    toolbarManagedResizeTargetHeight = Math.max(NOTE_MIN_SIZE_PX, Math.round(targetHeight));
    toolbarManagedResizeHoldUntil = Date.now() + TOOLBAR_MANAGED_RESIZE_HOLD_MS;
    if (stableCollapsedHeight > 0) {
      collapsedWindowHeight = Math.max(NOTE_MIN_SIZE_PX, Math.round(stableCollapsedHeight));
    }
  }

  function clearToolbarManagedResize() {
    toolbarManagedResizeTargetHeight = 0;
    toolbarManagedResizeHoldUntil = 0;
  }

  /** @param {number} currentHeight */
  function shouldSkipPersistenceForToolbarManagedResize(currentHeight) {
    if (toolbarManagedResizeTargetHeight <= 0) return false;
    const withinTolerance =
      Math.abs(currentHeight - toolbarManagedResizeTargetHeight) <= TOOLBAR_MANAGED_RESIZE_TOLERANCE_PX;
    const withinHold = Date.now() <= toolbarManagedResizeHoldUntil;
    if (!withinTolerance && !withinHold) {
      clearToolbarManagedResize();
      return false;
    }
    if (withinTolerance) {
      clearToolbarManagedResize();
    }
    return true;
  }

  /** @param {number} nextHeight */
  async function resizeWindowHeight(nextHeight) {
    const logicalWidth = Math.max(1, window.innerWidth || 1);
    const logicalHeight = Math.max(NOTE_MIN_SIZE_PX, Math.round(nextHeight));
    try {
      await getCurrentWindow().setSize(new LogicalSize(logicalWidth, logicalHeight));
    } catch (e) {
      console.error("resizeWindowHeight", e);
    }
  }

  async function syncWindowHeightForOutsideToolbar() {
    const currentHeight = Math.max(NOTE_MIN_SIZE_PX, window.innerHeight || NOTE_MIN_SIZE_PX);
    if (!showTopmostControls) {
      if (!toolbarWindowExpanded) {
        collapsedWindowHeight = currentHeight;
        return;
      }
      toolbarWindowExpanded = false;
      const collapsedTarget = Math.max(NOTE_MIN_SIZE_PX, collapsedWindowHeight || currentHeight);
      beginToolbarManagedResize(collapsedTarget, collapsedTarget);
      await resizeWindowHeight(collapsedTarget);
      return;
    }

    const reserve = getToolbarWindowReserve();
    if (reserve <= 0) return;
    if (!toolbarWindowExpanded) {
      collapsedWindowHeight = currentHeight;
    }
    const collapsedBaseHeight = Math.max(NOTE_MIN_SIZE_PX, collapsedWindowHeight || currentHeight);
    const expandedHeight = collapsedBaseHeight + reserve;
    if (Math.abs(currentHeight - expandedHeight) < 1) {
      toolbarWindowExpanded = true;
      return;
    }
    toolbarWindowExpanded = true;
    beginToolbarManagedResize(expandedHeight, collapsedBaseHeight);
    await resizeWindowHeight(expandedHeight);
  }

  function handleViewportResize() {
    const currentHeight = Math.max(NOTE_MIN_SIZE_PX, window.innerHeight || NOTE_MIN_SIZE_PX);
    if (toolbarWindowExpanded && showTopmostControls) {
      return;
    }
    collapsedWindowHeight = currentHeight;
  }

  function clearWindowSizePersistTimer() {
    if (windowSizePersistTimer == null) return;
    clearTimeout(windowSizePersistTimer);
    windowSizePersistTimer = null;
  }

  function clearWindowSizePollTimer() {
    if (windowSizePollTimer == null) return;
    clearInterval(windowSizePollTimer);
    windowSizePollTimer = null;
  }

  async function getPersistableWindowSize() {
    let width = Math.max(NOTE_MIN_SIZE_PX, Math.round(window.innerWidth || NOTE_MIN_SIZE_PX));
    let rawHeight = Math.max(NOTE_MIN_SIZE_PX, Math.round(window.innerHeight || NOTE_MIN_SIZE_PX));
    try {
      const currentWindow = getCurrentWindow();
      const [physicalSize, scaleFactor] = await Promise.all([
        currentWindow.innerSize(),
        currentWindow.scaleFactor(),
      ]);
      const logicalSize = physicalSize.toLogical(scaleFactor);
      width = Math.max(NOTE_MIN_SIZE_PX, Math.round(logicalSize.width || width));
      rawHeight = Math.max(NOTE_MIN_SIZE_PX, Math.round(logicalSize.height || rawHeight));
    } catch (e) {
      console.error("getPersistableWindowSize", e);
    }
    const toolbarReserve = toolbarWindowExpanded && showTopmostControls ? getToolbarWindowReserve() : 0;
    const height = Math.max(NOTE_MIN_SIZE_PX, rawHeight - toolbarReserve);
    return { width, height };
  }

  async function persistWindowSize({ force = false } = {}) {
    if (!note) return;
    const { width, height } = await getPersistableWindowSize();
    const sizeKey = `${width}x${height}`;
    const savedWidth = typeof note.width === "number" ? Math.round(note.width) : null;
    const savedHeight = typeof note.height === "number" ? Math.round(note.height) : null;
    const matchesNote = savedWidth === width && savedHeight === height;
    if (!force && (matchesNote || lastPersistedWindowSizeKey === sizeKey)) {
      return;
    }
    try {
      await invoke("update_note_size", {
        id: resolveNoteId(note, noteId),
        width,
        height,
        emitEvent: force,
      });
      lastPersistedWindowSizeKey = sizeKey;
      note = {
        ...note,
        width,
        height,
      };
    } catch (e) {
      console.error("persistWindowSize", e);
    }
  }

  function scheduleWindowSizePersist() {
    clearWindowSizePersistTimer();
    windowSizePersistTimer = setTimeout(() => {
      windowSizePersistTimer = null;
      void persistWindowSize();
    }, WINDOW_SIZE_PERSIST_DEBOUNCE_MS);
  }

  function startWindowSizePoll() {
    clearWindowSizePollTimer();
    windowSizePollTimer = setInterval(() => {
      void persistWindowSize();
    }, WINDOW_SIZE_POLL_MS);
  }

  function handleWindowResizePersistence() {
    const currentHeight = Math.max(NOTE_MIN_SIZE_PX, window.innerHeight || NOTE_MIN_SIZE_PX);
    if (shouldSkipPersistenceForToolbarManagedResize(currentHeight)) {
      return;
    }
    handleViewportResize();
    scheduleWindowSizePersist();
  }

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
        const width = typeof snapshot.note.width === "number" ? Math.round(snapshot.note.width) : null;
        const height = typeof snapshot.note.height === "number" ? Math.round(snapshot.note.height) : null;
        lastPersistedWindowSizeKey = width && height ? `${width}x${height}` : "";
      }
    } catch (e) {
      console.error("loadNote", e);
    }
  }

  async function loadLocale() {
    try {
      const prefs = await invoke("get_preferences");
      locale = resolveAppLocale(prefs?.language);
    } catch (e) {
      console.error("loadLocale", e);
    }
  }

  async function loadGlobalControlState() {
    try {
      const state = await invoke("get_overlay_interaction");
      globalControlDisabled = !!state;
    } catch (e) {
      console.error("loadGlobalControlState", e);
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
      console.log("[note-layer]", {
        noteId,
        isAlwaysOnTop: !!note.isAlwaysOnTop,
        isWallpaper: !!note.isWallpaper,
        globalControlDisabled,
      });
      await invoke("apply_note_window_layer", {
        isAlwaysOnTop: !!note.isAlwaysOnTop,
        isWallpaper: !!note.isWallpaper,
      });
    } catch (e) {
      console.error("applyZOrderAndParent", e);
    }
  }

  async function disableWindowsNativeShadow() {
    if (!isWindows) return;
    try {
      await getCurrentWindow().setShadow(false);
    } catch (e) {
      console.error("disableWindowsNativeShadow", e);
    }
  }

  async function applyInteractionPolicy() {
    const ignoreCursor = !globalControlDisabled ? false : !(note?.isAlwaysOnTop);
    try {
      await getCurrentWindow().setIgnoreCursorEvents(ignoreCursor);
    } catch (e) {
      console.error("applyInteractionPolicy", e);
    }
  }

  async function notifyNoteWindowReady() {
    const currentWindow = getCurrentWindow();
    await emit("note_window_ready", {
      label: currentWindow.label,
      id: noteId,
    });
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

  /** @param {string} nextText */
  async function updateTextFromPreview(nextText) {
    if (!note || typeof nextText !== "string") return;
    text = nextText;
    await tick();
    await save();
  }

  /** @param {number} lineIndex */
  async function togglePreviewTask(lineIndex) {
    const nextText = toggleTaskLineAt(text || note?.text || "", lineIndex);
    if (nextText == null) return;
    await updateTextFromPreview(nextText);
  }

  /** @param {number} lineIndex */
  async function appendPreviewTask(lineIndex) {
    const nextText = appendTaskLineAfterBlock(text || note?.text || "", lineIndex);
    if (nextText == null) return;
    await updateTextFromPreview(nextText);
  }

  function enterBlockEditSurface() {
    if (shouldSuppressPointerActivation()) return false;
    if (!canInteract) return false;
    if (isEffectiveTopmost) {
      isControlMode = true;
    }
    isEditing = true;
    showPalette = false;
    showTextColorPalette = false;
    showOpacityPanel = false;
    showFrostPanel = false;
    return true;
  }

  async function exitEditMode() {
    await save();
    isEditing = false;
  }

  function enterControlMode() {
    if (!isEffectiveTopmost || !canInteract) return;
    isControlMode = true;
  }

  function shouldSuppressPointerActivation() {
    return getNow() < suppressPointerActivationUntil;
  }

  async function exitControlMode() {
    dismissFloatingPanelsOnPointerDown(null);
    if (isEditing) {
      await exitEditMode();
    }
    isControlMode = false;
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
    if (
      showPalette &&
      !target?.closest(".color-popover") &&
      !target?.closest(".color-trigger")
    ) {
      showPalette = false;
    }
    if (
      showTextColorPalette &&
      !target?.closest(".text-color-popover") &&
      !target?.closest(".text-color-trigger")
    ) {
      showTextColorPalette = false;
    }
    if (
      showOpacityPanel &&
      !target?.closest(".opacity-popover") &&
      !target?.closest(".opacity-trigger")
    ) {
      showOpacityPanel = false;
      showOpacityValue = false;
    }
    if (
      showFrostPanel &&
      !target?.closest(".frost-popover") &&
      !target?.closest(".frost-trigger")
    ) {
      showFrostPanel = false;
      showFrostValue = false;
    }
  }

  /** @param {MouseEvent} event */
  function handleNoteClick(event) {
    if (!shouldSuppressPointerActivation()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  /** @param {KeyboardEvent} event */
  function handleNoteKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!shouldSuppressPointerActivation()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  /** @param {MouseEvent} event */
  function handleNoteDoubleClick(event) {
    if (shouldSuppressPointerActivation()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!isEffectiveTopmost || isControlMode || isEditing) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.closest(CONTROL_MODE_TRIGGER_BLOCKED_SELECTOR)) {
      return;
    }
    enterBlockEditSurface();
  }

  /** @param {KeyboardEvent} event */
  function handleWindowKeydown(event) {
    if (event.key !== "Escape") return;
    if (!isEffectiveTopmost) return;
    if (!isControlMode && !isEditing) return;
    event.preventDefault();
    void exitControlMode();
  }

  const noteWindowDrag = createNoteWindowDragController({
    getCurrentWindow,
    moveWindow: (position) =>
      invoke("move_note_window_without_activation", {
        x: position.x,
        y: position.y,
      }),
    getCanInteract: () => canInteract,
    getIsEditing: () => isEditing,
    getIsAlwaysOnTop: () => isEffectiveTopmost,
    dismissFloatingPanels: dismissFloatingPanelsOnPointerDown,
    onDraggingChange: (dragging) => {
      if (dragging) return;
      suppressPointerActivationUntil = getNow() + POINTER_ACTIVATION_SUPPRESS_MS;
    },
    onPositionPersist: async (position) => {
      if (!note) return;
      try {
        await invoke("update_note_position", {
          id: resolveNoteId(note, noteId),
          x: position.x,
          y: position.y,
          emitEvent: false,
        });
        note = {
          ...note,
          x: position.x,
          y: position.y,
        };
      } catch (e) {
        console.error("persistNotePosition", e);
      }
    },
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

  const noteToolbarProps = $derived({
    strings,
    isEditing,
    isControlMode: showTopmostControls,
    showControlExit: showTopmostControls,
    isMac,
    note,
    showPalette,
    showTextColorPalette,
    showOpacityPanel,
    showFrostPanel,
    opacityDraft,
    frostDraft,
    noteBgColor,
    noteTextColor,
    backgroundPickerValue,
    textPickerValue,
    noteColors: NOTE_COLORS,
    noteTextColors: NOTE_TEXT_COLORS,
    onToggleEdit: () => (isEditing ? exitEditMode() : enterBlockEditSurface()),
    onExitControlMode: exitControlMode,
    onToggleTopmost: toggleTopmost,
    onToggleWallpaper: toggleWallpaperLayer,
    onTogglePalette: () => (showPalette = !showPalette),
    onToggleTextColorPalette: () => (showTextColorPalette = !showTextColorPalette),
    onToggleOpacityPanel: () => (showOpacityPanel = !showOpacityPanel),
    onOpacityIconWheel: noteStyleActions.onOpacityIconWheel,
    onOpacityInput: noteStyleActions.onOpacityInput,
    onOpacityWheel: noteStyleActions.onOpacityWheel,
    onToggleFrostPanel: () => (showFrostPanel = !showFrostPanel),
    onFrostIconWheel: noteStyleActions.onFrostIconWheel,
    onFrostInput: noteStyleActions.onFrostInput,
    onFrostWheel: noteStyleActions.onFrostWheel,
    onToggleDone: toggleDone,
    onToggleArchive: toggleArchive,
    onUnpin: unpinNote,
    onMoveToTrash: moveToTrash,
    onSetBackgroundColor: noteStyleActions.setBackgroundColor,
    onSetTextColor: noteStyleActions.setTextColor,
    onBackgroundColorPickerChange: noteStyleActions.onBackgroundColorPickerChange,
    onTextColorPickerChange: noteStyleActions.onTextColorPickerChange,
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
      await persistWindowSize({ force: true });
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
      await persistWindowSize({ force: true });
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
      await persistWindowSize({ force: true });
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
    const currentWindow = getCurrentWindow();

    collapsedWindowHeight = Math.max(NOTE_MIN_SIZE_PX, window.innerHeight || NOTE_MIN_SIZE_PX);
    window.addEventListener("resize", handleWindowResizePersistence);
    unlistenPromises.push(currentWindow.onResized(() => handleWindowResizePersistence()));
    unlistenPromises.push(
      currentWindow.onFocusChanged(async ({ payload: focused }) => {
        if (focused) return;
        clearWindowSizePersistTimer();
        await persistWindowSize();
      }),
    );
    unlistenPromises.push(
      currentWindow.onCloseRequested(async () => {
        clearWindowSizePersistTimer();
        await persistWindowSize({ force: true });
      }),
    );
    startWindowSizePoll();

    unlistenPromises.push(
      listen("global_control_changed", async (event) => {
        globalControlDisabled = !!/** @type {{ payload?: unknown }} */ (event).payload;
        try {
          await applyInteractionPolicy();
        } catch (e) {
          console.error("global_control_changed", e);
        }
      }),
    );

    unlistenPromises.push(
      listen("notes_changed", async (event) => {
        const payload = /** @type {{ kind?: unknown; noteId?: unknown; windowLayerChanged?: unknown } | null | undefined } */ (event.payload);
        const changedNoteId = typeof payload?.noteId === "string" ? payload.noteId : "";
        const windowLayerChanged = payload?.windowLayerChanged !== false;
        if (changedNoteId && changedNoteId !== noteId) {
          return;
        }
        await loadNote();
        if (!windowLayerChanged) {
          return;
        }
        await applyInteractionPolicy();
        await applyZOrderAndParent();
      }),
    );

    loadLocale()
      .then(loadGlobalControlState)
      .then(loadNote)
      .then(async () => {
        await disableWindowsNativeShadow();
        await applyInteractionPolicy();
        await applyZOrderAndParent();
        await notifyNoteWindowReady();
      });

    return async () => {
      window.removeEventListener("resize", handleWindowResizePersistence);
      clearWindowSizePersistTimer();
      clearWindowSizePollTimer();
      await persistWindowSize({ force: true });
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
    };
  });

  $effect(() => {
    if (!isEffectiveTopmost && isControlMode) {
      isControlMode = false;
    }
  });

  $effect(() => {
    const frost = noteFrost;
    let cancelled = false;
    const window = getCurrentWindow();
    queueMicrotask(async () => {
      const applied = await applyNoteWindowNativeEffects(window.label, frost);
      if (!cancelled) {
        hasNativeWindowFrost = applied;
      }
    });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const slot = outsideToolbarSlotEl;
    if (!slot) {
      outsideToolbarHeight = 0;
      return;
    }
    const updateToolbarHeight = () => {
      outsideToolbarHeight = slot.offsetHeight;
    };
    updateToolbarHeight();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      updateToolbarHeight();
    });
    observer.observe(slot);
    return () => {
      observer.disconnect();
    };
  });

  $effect(() => {
    showTopmostControls;
    outsideToolbarHeight;
    void tick().then(() => syncWindowHeightForOutsideToolbar());
  });
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div
  class="note-shell"
  data-control-mode={showTopmostControls ? "true" : "false"}
  data-toolbar-placement={showTopmostControls ? "outside" : "inside"}
  onpointerdown={noteWindowDrag.handleDragPointerDown}
  onpointermove={noteWindowDrag.onDragPointerMove}
  onpointerup={noteWindowDrag.onDragPointerUp}
  onpointercancel={noteWindowDrag.onDragPointerUp}
>
  {#if note}
    <div
      class="note-window"
      class:windows-flat={isWindows}
      data-toolbar-visible={allowHoverToolbar ? "true" : "false"}
      data-control-mode={showTopmostControls ? "true" : "false"}
      style="--note-radius: {noteWindowRadius}; --note-tint: {noteBackground}; --note-text-color: {noteTextColor}; --frost-blur: {cssFrostBlur}px; --frost-overlay: {noteFrostOverlay}; --frost-glow: {noteFrostGlow}; --note-border-alpha: {noteBorderAlpha}; --note-inner-highlight-alpha: {noteInnerHighlightAlpha};"
      onclick={handleNoteClick}
      onkeydown={handleNoteKeydown}
      ondblclick={handleNoteDoubleClick}
    >
      <div class="note-frost-layer" aria-hidden="true"></div>
      <div class="note-content">
        <NoteTagBar
          {strings}
          {isEditing}
          isControlMode={showTopmostControls}
          isAlwaysOnTop={isEffectiveTopmost}
          controlInsetSide={showTopmostControls ? (isMac ? "left" : "right") : null}
          priority={note.priority ?? null}
          tags={Array.isArray(note.tags) ? note.tags : []}
          {tagSuggestions}
          onChangePriority={setNotePriority}
          onChangeTags={setNoteTags}
        />

        <div class="note-block-surface">
          <BlockNoteContent
            text={text || note?.text || ""}
            interactiveTasks={canInteract}
            readonly={!canInteract}
            placeholder={strings.noteEditorPlaceholder}
            onBeginEdit={enterBlockEditSurface}
            onTextChange={updateTextFromPreview}
            onToggleTask={togglePreviewTask}
            onAppendTask={appendPreviewTask}
          />
        </div>

        {#if noteCenterHudText}
          <div class="note-center-hud">{noteCenterHudText}</div>
        {/if}

        {#if !showTopmostControls}
          <NoteToolbar {...noteToolbarProps} placement="inside" />
        {/if}
      </div>
    </div>
    {#if showTopmostControls}
      <div class="note-toolbar-slot" bind:this={outsideToolbarSlotEl}>
        <NoteToolbar {...noteToolbarProps} placement="outside" />
      </div>
    {/if}
  {:else}
    <div class="loading">Loading...</div>
  {/if}
</div>

<style>
  .note-shell {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .note-shell[data-toolbar-placement="outside"] {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 0;
    box-sizing: border-box;
  }

  .note-toolbar-slot {
    width: 100%;
  }

  .note-window {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: var(--note-radius);
    background: var(--note-tint, transparent);
    background-clip: padding-box;
    border: 1px solid rgba(255, 255, 255, var(--note-border-alpha, 0.22));
    clip-path: inset(0 round var(--note-radius));
    -webkit-clip-path: inset(0 round var(--note-radius));
    filter: drop-shadow(0 10px 24px rgba(15, 23, 42, 0.16));
    overflow: hidden;
    isolation: isolate;
  }

  .note-window.windows-flat {
    --note-radius: 0px;
    filter: none;
  }

  .note-frost-layer {
    position: absolute;
    inset: 0;
    background-color: var(--note-tint, transparent);
    background-image:
      radial-gradient(circle at 16% 10%, rgba(255, 255, 255, var(--frost-glow, 0.08)) 0%, transparent 36%),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, calc(var(--frost-overlay, 0.09) * 1.08)) 0%,
        rgba(255, 255, 255, calc(var(--frost-overlay, 0.09) * 0.74)) 42%,
        rgba(255, 255, 255, calc(var(--frost-overlay, 0.09) * 0.56)) 100%
      );
    background-repeat: no-repeat;
    background-size: cover;
    border-radius: inherit;
    clip-path: inset(0 round var(--note-radius));
    pointer-events: none;
    z-index: 0;
    backdrop-filter: blur(var(--frost-blur, 0px)) saturate(1.12);
    -webkit-backdrop-filter: blur(var(--frost-blur, 0px)) saturate(1.12);
    will-change: backdrop-filter, -webkit-backdrop-filter, background-color;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  .note-content {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    z-index: 1;
    border-radius: inherit;
    overflow: hidden;
  }

  .note-content > * {
    position: relative;
    z-index: 1;
  }

  .note-block-surface {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 20px 20px 28px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    user-select: none;
    cursor: default;
  }

  .note-block-surface::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .note-center-hud {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    min-width: 118px;
    padding: 10px 14px;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.72);
    color: #f8fafc;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.01em;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.2);
    pointer-events: none;
    z-index: 4;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

</style>
