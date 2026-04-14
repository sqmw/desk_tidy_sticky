const OPACITY_MIN = 0.35;
const OPACITY_MAX = 1;
const FROST_MIN = 0;
const FROST_MAX = 1;
const WHEEL_STEP = 0.02;

/**
 * @param {number} value
 */
export function clampNoteOpacity(value) {
  return Math.max(OPACITY_MIN, Math.min(OPACITY_MAX, Number(value) || OPACITY_MAX));
}

/**
 * @param {number} value
 */
export function clampNoteFrost(value) {
  return Math.max(FROST_MIN, Math.min(FROST_MAX, Number(value) || FROST_MIN));
}

/**
 * @param {{
 *   getNote: () => any;
 *   getNoteId: () => string;
 *   getOpacityDraft: () => number;
 *   getFrostDraft: () => number;
 *   invokeNoteCommand: (input: {
 *     command: string;
 *     note: any;
 *     noteId: string;
 *     payload?: Record<string, any>;
 *   }) => Promise<any>;
 *   findUpdatedFromList: (all: any[]) => any;
 *   setNote: (note: any) => void;
 *   setOpacityDraft: (value: number) => void;
 *   setFrostDraft: (value: number) => void;
 *   setShowPalette: (visible: boolean) => void;
 *   setShowTextColorPalette: (visible: boolean) => void;
 *   setShowOpacityPanel: (visible: boolean) => void;
 *   setShowFrostPanel: (visible: boolean) => void;
 *   setShowOpacityValue: (visible: boolean) => void;
 *   setShowFrostValue: (visible: boolean) => void;
 *   defaultOpacity: number;
 *   defaultFrost: number;
 *   saveDelayMs?: number;
 *   valueHideDelayMs?: number;
 * }} input
 */
export function createNoteStyleActions(input) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let opacitySaveTimer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let frostSaveTimer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let opacityValueHideTimer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let frostValueHideTimer;

  function dispose() {
    clearTimeout(opacitySaveTimer);
    clearTimeout(frostSaveTimer);
    clearTimeout(opacityValueHideTimer);
    clearTimeout(frostValueHideTimer);
  }

  /**
   * @param {any} updated
   * @param {{ syncFrost?: boolean }} [options]
   */
  function syncStyleDraftFromNote(updated, options = {}) {
    input.setNote(updated);
    input.setOpacityDraft(updated.opacity ?? input.defaultOpacity);
    if (options.syncFrost ?? true) {
      input.setFrostDraft(updated.frost ?? input.defaultFrost);
    }
  }

  /**
   * @param {string} color
   * @param {{ closePopover?: boolean }} [options]
   */
  async function setBackgroundColor(color, options = {}) {
    const note = input.getNote();
    if (!note) return;
    const closePopover = options.closePopover ?? true;
    try {
      const all = await input.invokeNoteCommand({
        command: "update_note_color",
        note,
        noteId: input.getNoteId(),
        payload: { color },
      });
      const updated = input.findUpdatedFromList(all);
      if (updated) {
        input.setNote(updated);
      }
      if (closePopover) {
        input.setShowPalette(false);
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
    const note = input.getNote();
    if (!note) return;
    const closePopover = options.closePopover ?? true;
    try {
      const all = await input.invokeNoteCommand({
        command: "update_note_text_color",
        note,
        noteId: input.getNoteId(),
        payload: { color },
      });
      const updated = input.findUpdatedFromList(all);
      if (updated) {
        input.setNote(updated);
      }
      if (closePopover) {
        input.setShowTextColorPalette(false);
      }
    } catch (e) {
      console.error("setTextColor", e);
    }
  }

  /**
   * @param {Event} event
   */
  function onBackgroundColorPickerChange(event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    setBackgroundColor(target.value, { closePopover: false });
  }

  /**
   * @param {Event} event
   */
  function onTextColorPickerChange(event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    setTextColor(target.value, { closePopover: false });
  }

  /**
   * @param {number} opacity
   * @param {boolean} emitEvent
   */
  async function setOpacity(opacity, emitEvent) {
    const note = input.getNote();
    if (!note) return;
    try {
      const all = await input.invokeNoteCommand({
        command: "update_note_opacity",
        note,
        noteId: input.getNoteId(),
        payload: { opacity, emitEvent },
      });
      const updated = input.findUpdatedFromList(all);
      if (updated) {
        syncStyleDraftFromNote(updated);
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
    const note = input.getNote();
    if (!note) return;
    try {
      const all = await input.invokeNoteCommand({
        command: "update_note_frost",
        note,
        noteId: input.getNoteId(),
        payload: { frost, emitEvent },
      });
      const updated = input.findUpdatedFromList(all);
      if (updated) {
        input.setNote(updated);
        input.setFrostDraft(updated.frost ?? input.defaultFrost);
      }
    } catch (e) {
      console.error("setFrost", e);
    }
  }

  /**
   * @param {number} value
   */
  function queueOpacitySave(value) {
    clearTimeout(opacitySaveTimer);
    opacitySaveTimer = setTimeout(() => {
      setOpacity(value, false);
    }, input.saveDelayMs ?? 60);
  }

  /**
   * @param {number} value
   */
  function queueFrostSave(value) {
    clearTimeout(frostSaveTimer);
    frostSaveTimer = setTimeout(() => {
      setFrost(value, false);
    }, input.saveDelayMs ?? 60);
  }

  /**
   * @param {number} value
   */
  function applyOpacityDraft(value) {
    const next = clampNoteOpacity(value);
    input.setOpacityDraft(next);
    const note = input.getNote();
    if (note) {
      input.setNote({ ...note, opacity: next });
    }
    queueOpacitySave(next);
  }

  /**
   * @param {number} value
   */
  function applyFrostDraft(value) {
    const next = clampNoteFrost(value);
    input.setFrostDraft(next);
    const note = input.getNote();
    if (note) {
      input.setNote({ ...note, frost: next });
    }
    queueFrostSave(next);
  }

  /**
   * @param {Event} event
   */
  function onOpacityInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    applyOpacityDraft(Number(target.value));
  }

  /**
   * @param {Event} event
   */
  function onFrostInput(event) {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    applyFrostDraft(Number(target.value));
  }

  /**
   * @param {WheelEvent} event
   */
  function onOpacityWheel(event) {
    event.preventDefault();
    const step = event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP;
    applyOpacityDraft(input.getOpacityDraft() + step);
    input.setShowOpacityValue(true);
    clearTimeout(opacityValueHideTimer);
    opacityValueHideTimer = setTimeout(() => {
      input.setShowOpacityValue(false);
    }, input.valueHideDelayMs ?? 800);
  }

  /**
   * @param {WheelEvent} event
   */
  function onFrostWheel(event) {
    event.preventDefault();
    const step = event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP;
    applyFrostDraft(input.getFrostDraft() + step);
    input.setShowFrostValue(true);
    clearTimeout(frostValueHideTimer);
    frostValueHideTimer = setTimeout(() => {
      input.setShowFrostValue(false);
    }, input.valueHideDelayMs ?? 800);
  }

  /**
   * @param {WheelEvent} event
   */
  function onOpacityIconWheel(event) {
    event.preventDefault();
    event.stopPropagation();
    input.setShowOpacityPanel(true);
    onOpacityWheel(event);
  }

  /**
   * @param {WheelEvent} event
   */
  function onFrostIconWheel(event) {
    event.preventDefault();
    event.stopPropagation();
    input.setShowFrostPanel(true);
    onFrostWheel(event);
  }

  return {
    dispose,
    setBackgroundColor,
    setTextColor,
    setOpacity,
    setFrost,
    applyOpacityDraft,
    applyFrostDraft,
    onBackgroundColorPickerChange,
    onTextColorPickerChange,
    onOpacityInput,
    onFrostInput,
    onOpacityWheel,
    onFrostWheel,
    onOpacityIconWheel,
    onFrostIconWheel,
  };
}
