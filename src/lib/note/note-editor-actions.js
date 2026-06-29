import { convertFileSrc } from "@tauri-apps/api/core";
import { expandNoteCommands } from "$lib/markdown/note-markdown.js";
import { applySourceCommandInsert, findSourceCommandToken } from "$lib/note/source-command.js";
import { resolveNoteId } from "$lib/note/note-window-actions.js";

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
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

/**
 * @param {{
 *   invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *   tick: () => Promise<void>;
 *   save: () => Promise<void>;
 *   getNote: () => any;
 *   getNoteId: () => string;
 *   getText: () => string;
 *   setText: (text: string) => void;
 *   getEditorEl: () => HTMLTextAreaElement | null;
 *   getShowCommandSuggestions: () => boolean;
 *   getCommandSuggestions: () => Array<{ insert: string }>;
 *   getCommandActiveIndex: () => number;
 *   setShowCommandSuggestions: (visible: boolean) => void;
 *   setCommandQuery: (query: string) => void;
 *   setCommandActiveIndex: (index: number) => void;
 *   saveDelayMs?: number;
 * }} input
 */
export function createNoteEditorActions(input) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let saveTimer;

  function dispose() {
    clearTimeout(saveTimer);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(input.save, input.saveDelayMs ?? 500);
  }

  /**
   * @param {HTMLTextAreaElement | null} target
   */
  function updateCommandSuggestions(target) {
    if (!target) {
      input.setShowCommandSuggestions(false);
      return;
    }
    const token = findSourceCommandToken(input.getText(), target.selectionStart ?? 0);
    if (!token) {
      input.setShowCommandSuggestions(false);
      input.setCommandQuery("");
      return;
    }
    input.setCommandQuery(`${token.trigger}${token.query}`);
    input.setShowCommandSuggestions(true);
    input.setCommandActiveIndex(0);
  }

  /**
   * @param {Event} [event]
   */
  function handleInput(event) {
    scheduleSave();
    const target =
      /** @type {HTMLTextAreaElement | null} */ (event?.currentTarget) || input.getEditorEl();
    updateCommandSuggestions(target);
  }

  /**
   * @param {ClipboardEvent} event
   */
  async function onEditorPaste(event) {
    const editorEl = input.getEditorEl();
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
      const text = input.getText();
      const dataBase64 = await blobToBase64(file);
      const savedPath = await input.invoke("save_clipboard_image", {
        noteId: resolveNoteId(input.getNote(), input.getNoteId()),
        mimeType: file.type || "image/png",
        dataBase64,
      });
      const imageSrc = convertFileSrc(savedPath);
      const start = editorEl.selectionStart ?? text.length;
      const end = editorEl.selectionEnd ?? start;
      const label = `pasted-${new Date().toISOString().replaceAll(":", "-")}`;
      const md = `![${label}](${imageSrc})`;
      input.setText(text.slice(0, start) + md + text.slice(end));
      input.setShowCommandSuggestions(false);
      await input.tick();
      const caret = start + md.length;
      editorEl.focus();
      editorEl.setSelectionRange(caret, caret);
      scheduleSave();
    } catch (e) {
      console.error("onEditorPaste", e);
    }
  }

  /**
   * @param {number} index
   */
  async function applyCommandSuggestion(index) {
    const editorEl = input.getEditorEl();
    if (!editorEl) return;
    const items = input.getCommandSuggestions();
    if (!items.length) return;
    const selected = items[Math.max(0, Math.min(index, items.length - 1))];
    const text = input.getText();
    const caret = editorEl.selectionStart ?? 0;
    const suffix = text.slice(caret);
    const inserted = applySourceCommandInsert({
      text,
      caret,
      insert: selected.insert,
    });
    if (!inserted) return;
    const transformed = expandNoteCommands(inserted.nextText);
    input.setText(transformed);
    input.setShowCommandSuggestions(false);
    input.setCommandQuery("");
    await input.tick();
    const nextCaret = Math.max(0, transformed.length - suffix.length);
    editorEl.focus();
    editorEl.setSelectionRange(nextCaret, nextCaret);
    scheduleSave();
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onEditorKeydown(event) {
    const commandSuggestions = input.getCommandSuggestions();
    if (!input.getShowCommandSuggestions() || commandSuggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      input.setCommandActiveIndex(
        Math.min(input.getCommandActiveIndex() + 1, commandSuggestions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      input.setCommandActiveIndex(Math.max(input.getCommandActiveIndex() - 1, 0));
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applyCommandSuggestion(input.getCommandActiveIndex());
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.setShowCommandSuggestions(false);
    }
  }

  return {
    dispose,
    handleInput,
    onEditorPaste,
    updateCommandSuggestions,
    applyCommandSuggestion,
    onEditorKeydown,
  };
}
