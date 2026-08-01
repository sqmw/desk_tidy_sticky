import { adjustInlineColorRangesForTextChange } from "$lib/markdown/note-markdown.js";
import { shouldDeferKeydownToIme as shouldDeferKeydownToImeEvent } from "$lib/note/sticky-note-interaction.js";

/**
 * Owns transient editor-session state that must survive focus changes without
 * becoming part of the rendered Markdown model.
 */
export function createBlockNoteEditorController() {
  /** @type {{ start: number; end: number } | null} */
  let rememberedSelection = null;
  let previousDraft = "";
  let suppressBlurUntil = 0;
  let isComposing = false;

  return {
    /** @param {string} draft */
    beginEditing(draft) {
      previousDraft = draft;
      rememberedSelection = null;
    },

    clearEditing() {
      previousDraft = "";
      rememberedSelection = null;
      isComposing = false;
    },

    beginComposition() {
      isComposing = true;
    },

    endComposition() {
      isComposing = false;
    },

    /** @param {KeyboardEvent | { isComposing?: boolean; keyCode?: number }} event */
    shouldDeferKeydownToIme(event) {
      return shouldDeferKeydownToImeEvent(event, isComposing);
    },

    /** @param {Array<{ start: number; end: number; color: string }>} ranges @param {string} nextDraft */
    updateInlineRanges(ranges, nextDraft) {
      const next = adjustInlineColorRangesForTextChange(ranges, previousDraft, nextDraft);
      previousDraft = nextDraft;
      return next;
    },

    /** @param {HTMLTextAreaElement | null} editor */
    resolveSelection(editor) {
      const start = editor?.selectionStart ?? 0;
      const end = editor?.selectionEnd ?? start;
      if (start !== end) return { start, end };
      return rememberedSelection ?? { start, end };
    },

    /** @param {HTMLTextAreaElement | null} editor */
    rememberSelection(editor) {
      if (!editor) return;
      const start = editor.selectionStart ?? 0;
      const end = editor.selectionEnd ?? start;
      rememberedSelection = start === end ? null : { start, end };
    },

    suppressBlurBriefly() {
      suppressBlurUntil = Date.now() + 250;
    },

    shouldSuppressBlur() {
      return Date.now() <= suppressBlurUntil;
    },
  };
}
