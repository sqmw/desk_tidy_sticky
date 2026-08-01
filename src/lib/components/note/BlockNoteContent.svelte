<script>
  import { tick } from "svelte";
  import { filterNoteCommands, getNoteCommandPreview } from "$lib/markdown/command-catalog.js";
  import {
    applyInlineColorRange,
    blockRangeMatches,
    expandNoteCommands,
    mergeBlockIntoPreviousMarkdown,
    parseMarkdownBlocks,
    parseMarkdownInlineStylesForEditing,
    parseTaskLine,
    removeBlockMarkdown,
    replaceBlockMarkdown,
    serializeMarkdownInlineStylesFromEditing,
    splitBlockMarkdown,
  } from "$lib/markdown/note-markdown.js";
  import { renderMarkdownBlocks } from "$lib/markdown/blocks/block-renderer.js";
  import { applyHardLineBreak, applyListEnterContinuation } from "$lib/markdown/editor-enter.js";
  import { applyLineIndentToText } from "$lib/markdown/editor-indent.js";
  import { applySourceCommandInsert, findSourceCommandToken } from "$lib/note/source-command.js";
  import { createBlockNoteEditorController } from "$lib/note/block-note-editor-controller.js";
  import {
    estimateMarkdownCaretOffset,
    insertTextAtSelection,
  } from "$lib/note/sticky-note-interaction.js";

  /**
   * @typedef {{ before: string; after: string; caretOffset?: number | null; caretAtEnd?: boolean }} EnterSplit
   */

  let {
    text = "",
    compact = false,
    interactiveTasks = false,
    readonly = false,
    editTrigger = "click",
    placeholder = "",
    editBlockLabel = "Edit block",
    addSameBlockLabel = "Add same block",
    onBeginEdit = () => {},
    onTextChange = async () => {},
    onToggleTask = () => {},
    onAppendTask = () => {},
    onEditingChange = () => {},
    onPasteImage = async () => null,
    onConflict = () => {},
    pasteErrorMessage = "",
    commitOnEscape = false,
    onEditorEscape = async () => {},
  } = $props();

  /** @type {string | null} */
  let activeBlockId = $state(null);
  let activeBlockDraft = $state("");
  let activeBlockInitialDraft = $state("");
  /** @type {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock | null} */
  let activeBlockOriginal = $state(null);
  /** @type {HTMLTextAreaElement | null} */
  let editorEl = $state(null);
  let editingEmpty = $state(false);
  let emptyDraft = $state("");
  /** @type {number | null} */
  let pendingActiveStartLine = $state(null);
  let pendingCaretAtEnd = $state(false);
  /** @type {number | null} */
  let pendingCaretOffset = $state(null);
  /** @type {Array<{ start: number; end: number; color: string }>} */
  let activeInlineColorRanges = $state([]);
  let showCommandSuggestions = $state(false);
  let commandQuery = $state("");
  let commandActiveIndex = $state(0);
  let pasteError = $state("");
  const editorController = createBlockNoteEditorController();
  const isActivelyEditing = $derived(editingEmpty || activeBlockId != null);

  $effect(() => {
    onEditingChange(isActivelyEditing);
  });

  const blocks = $derived(parseMarkdownBlocks(text || "", { preserveBlankBlocks: true }));
  const commandSuggestionItems = $derived(
    filterNoteCommands(commandQuery).map((command) => ({
      ...command,
      preview: getNoteCommandPreview(command),
    })),
  );

  $effect(() => {
    if (pendingActiveStartLine == null) return;
    void tick().then(() => {
      if (pendingActiveStartLine == null) return;
      const nextBlock = blocks.find((block) => block.startLine === pendingActiveStartLine);
      if (!nextBlock) {
        pendingActiveStartLine = null;
        pendingCaretAtEnd = false;
        pendingCaretOffset = null;
        return;
      }
      pendingActiveStartLine = null;
      openBlock(nextBlock, { fromPending: true });
    });
  });

  $effect(() => {
    if (activeBlockId) {
      const nextBlock = blocks.find((block) => block.id === activeBlockId);
      if (!nextBlock) cancelActiveBlock();
    }
    if (editingEmpty && blocks.length > 0) cancelEmptyEditor();
  });

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function renderBlockHtml(block) {
    return renderMarkdownBlocks([block], {
      interactiveTasks: interactiveTasks && block.type === "task_block",
    });
  }

  /** @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block */
  function getHeadingLevel(block) {
    if (block.type !== "heading") return null;
    return /^ {0,3}(#{1,6})(?:\s+|$)/.exec(block.rawLines[0] || "")?.[1]?.length ?? 1;
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   * @param {{ fromPending?: boolean; caretAtEnd?: boolean; caretOffset?: number | null }} [options]
   */
  async function openBlock(block, options = {}) {
    if (readonly || !block.editable) return;
    pasteError = "";
    if (onBeginEdit() === false) return;
    if (editingEmpty) {
      await commitEmptyEditor();
    }
    if (activeBlockId && activeBlockId !== block.id) {
      const saved = await commitActiveEditor();
      if (!saved) return;
    }
    activeBlockId = block.id;
    const editable = parseMarkdownInlineStylesForEditing(block.markdown);
    activeBlockDraft = editable.text;
    activeInlineColorRanges = editable.ranges;
    activeBlockInitialDraft = getActiveBlockMarkdownDraft();
    editorController.beginEditing(editable.text);
    activeBlockOriginal = block;
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    editorEl?.focus?.();
    const requestedCaretOffset = options.caretOffset ?? (options.fromPending ? pendingCaretOffset : null);
    if (requestedCaretOffset != null) {
      const caret = Math.max(0, Math.min(requestedCaretOffset, activeBlockDraft.length));
      pendingCaretOffset = null;
      pendingCaretAtEnd = false;
      editorEl?.setSelectionRange?.(caret, caret);
    } else if (options.caretAtEnd || (options.fromPending && pendingCaretAtEnd)) {
      pendingCaretAtEnd = false;
      const caret = activeBlockDraft.length;
      editorEl?.setSelectionRange?.(caret, caret);
    }
  }

  async function openEmptyEditor() {
    if (readonly) return;
    pasteError = "";
    if (onBeginEdit() === false) return;
    if (activeBlockId) {
      const saved = await commitActiveEditor();
      if (!saved) return;
    }
    editingEmpty = true;
    emptyDraft = text || "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    editorEl?.focus?.();
  }

  async function commitActiveBlock() {
    if (!activeBlockOriginal) {
      activeBlockId = null;
      return true;
    }
    if (!blockRangeMatches(text, activeBlockOriginal)) {
      onConflict();
      return false;
    }
    const nextMarkdown = getActiveBlockMarkdownDraft();
    const nextText = replaceBlockMarkdown(text, activeBlockOriginal, nextMarkdown);
    if (nextText !== text) {
      const saved = await onTextChange(nextText);
      if (saved === false) {
        onConflict();
        return false;
      }
    }
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    activeBlockInitialDraft = "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
    return true;
  }

  async function splitActiveBlockAfter() {
    if (!activeBlockOriginal) return false;
    if (!blockRangeMatches(text, activeBlockOriginal)) {
      cancelActiveBlock();
      onConflict();
      return false;
    }
    const split = getEnterSplit(activeBlockOriginal);
    const inserted = splitBlockMarkdown(text, activeBlockOriginal, split.before, split.after);
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    activeBlockInitialDraft = "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
    pendingActiveStartLine = inserted.nextStartLine;
    pendingCaretOffset = split.caretOffset ?? null;
    pendingCaretAtEnd = !!split.caretAtEnd;
    await onTextChange(inserted.text);
    return true;
  }

  async function addSameBlockAfterActive() {
    if (!activeBlockOriginal) return false;
    if (activeBlockOriginal.type === "task_block" || isTaskLineDraft(activeBlockDraft)) {
      appendTaskLineToActiveDraft();
      return true;
    }
    if (activeBlockOriginal.type === "bullet_list") {
      appendLineToActiveDraft(`${getBulletMarker(activeBlockOriginal.rawLines[0] ?? "")} `);
      return true;
    }
    if (activeBlockOriginal.type === "ordered_list") {
      appendLineToActiveDraft(`${getNextOrderedMarker(activeBlockDraft)}. `);
      return true;
    }
    if (activeBlockOriginal.type === "blockquote") {
      appendLineToActiveDraft("> ");
      return true;
    }
    if (!blockRangeMatches(text, activeBlockOriginal)) {
      cancelActiveBlock();
      onConflict();
      return false;
    }
    const insert = getSameBlockInsert(activeBlockOriginal);
    const inserted = splitBlockMarkdown(text, activeBlockOriginal, getActiveBlockMarkdownDraft(), insert.markdown);
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
    pendingActiveStartLine = inserted.nextStartLine + insert.activeLineOffset;
    pendingCaretAtEnd = true;
    await onTextChange(inserted.text);
    return true;
  }

  /**
   * @param {string} color
   */
  export async function applySelectedTextColor(color) {
    if (readonly || editingEmpty || !activeBlockOriginal || !editorEl) return false;
    const { start: selectionStart, end: selectionEnd } = editorController.resolveSelection(editorEl);
    if (selectionStart === selectionEnd) return false;

    const nextRanges = applyInlineColorRange(
      activeInlineColorRanges,
      selectionStart,
      selectionEnd,
      color,
      activeBlockDraft.length,
    );
    if (!nextRanges) return false;

    activeInlineColorRanges = nextRanges;
    await tick();
    resizeEditor();
    editorEl?.focus?.();
    editorEl?.setSelectionRange?.(selectionStart, selectionEnd);
    await commitActiveBlock();
    return true;
  }

  async function mergeActiveBlockBackward() {
    if (!activeBlockOriginal) return false;
    const previousBlock = getPreviousEditableBlock(activeBlockOriginal);
    if (!previousBlock) return false;
    if (!blockRangeMatches(text, activeBlockOriginal) || !blockRangeMatches(text, previousBlock)) {
      cancelActiveBlock();
      onConflict();
      return true;
    }

    const draft = getActiveBlockMarkdownDraft();
    const currentIsEmpty = draft.trim() === "";
    const next = currentIsEmpty
      ? {
          text: removeBlockMarkdown(text, activeBlockOriginal),
          startLine: previousBlock.startLine,
          caretOffset: previousBlock.markdown.length,
        }
      : mergeBlockIntoPreviousMarkdown(text, previousBlock, activeBlockOriginal, draft);

    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
    pendingActiveStartLine = next.startLine;
    pendingCaretOffset = next.caretOffset;
    pendingCaretAtEnd = currentIsEmpty;
    await onTextChange(next.text);
    return true;
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function getPreviousEditableBlock(block) {
    const index = blocks.findIndex(
      (candidate) =>
        candidate.id === block.id ||
        (candidate.startLine === block.startLine &&
          candidate.endLine === block.endLine &&
          candidate.markdown === block.markdown),
    );
    if (index <= 0) return null;
    const previousBlock = blocks[index - 1];
    return previousBlock?.editable ? previousBlock : null;
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function getNextEditableBlock(block) {
    const index = blocks.findIndex(
      (candidate) =>
        candidate.id === block.id ||
        (candidate.startLine === block.startLine &&
          candidate.endLine === block.endLine &&
          candidate.markdown === block.markdown),
    );
    if (index < 0 || index >= blocks.length - 1) return null;
    const nextBlock = blocks[index + 1];
    return nextBlock?.editable ? nextBlock : null;
  }

  function appendTaskLineToActiveDraft() {
    const draft = String(activeBlockDraft ?? "");
    const lines = draft.split("\n");
    const sourceLine = [...lines].reverse().find((line) => parseTaskLine(line)) ?? lines[0] ?? "";
    const parsed = parseTaskLine(sourceLine);
    const indent = parsed?.indent ?? "";
    const marker = parsed?.marker ?? "-";
    appendLineToActiveDraft(`${indent}${marker} [ ] `);
  }

  /** @param {string} draft */
  function isTaskLineDraft(draft) {
    const lines = String(draft ?? "")
      .split("\n")
      .filter((line) => line.trim() !== "");
    return lines.length > 0 && lines.every((line) => !!parseTaskLine(line));
  }

  /** @param {string} line */
  function appendLineToActiveDraft(line) {
    const draft = String(activeBlockDraft ?? "");
    const previousDraft = draft;
    activeBlockDraft = `${draft.replace(/\n$/, "")}\n${line}`;
    editorController.beginEditing(previousDraft);
    activeInlineColorRanges = editorController.updateInlineRanges(activeInlineColorRanges, activeBlockDraft);
    void tick().then(() => {
      resizeEditor();
      const caret = activeBlockDraft.length;
      editorEl?.focus?.();
      editorEl?.setSelectionRange?.(caret, caret);
    });
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function getSameBlockInsert(block) {
    switch (block.type) {
      case "heading":
        return { markdown: `${getHeadingMarker(block.rawLines[0] ?? "")} `, activeLineOffset: 0 };
      case "code_block":
        return { markdown: "```\n\n```", activeLineOffset: 0 };
      case "table":
        return { markdown: "|  |  |\n|---|---|\n|  |  |", activeLineOffset: 0 };
      case "image":
        return { markdown: "![]()", activeLineOffset: 0 };
      case "paragraph":
      default:
        return { markdown: "", activeLineOffset: 0 };
    }
  }

  /** @param {string} line */
  function getHeadingMarker(line) {
    const matched = /^ {0,3}(#{1,6})\s+/.exec(String(line ?? ""));
    return matched?.[1] ?? "#";
  }

  /** @param {string} line */
  function getBulletMarker(line) {
    const matched = /^(\s*)([-*])\s+/.exec(String(line ?? ""));
    return `${matched?.[1] ?? ""}${matched?.[2] ?? "-"}`;
  }

  /** @param {string} markdown */
  function getNextOrderedMarker(markdown) {
    const lines = String(markdown ?? "").split("\n");
    const lastNumber = [...lines].reverse()
      .map((line) => /^(\s*)(\d+)\.\s+/.exec(line))
      .find(Boolean)?.[2];
    return Math.max(1, Number(lastNumber || 0) + 1);
  }

  async function commitEmptyEditor() {
    const nextText = emptyDraft;
    if (nextText !== text) {
      const saved = await onTextChange(nextText);
      if (saved === false) {
        onConflict();
        return false;
      }
    }
    editingEmpty = false;
    emptyDraft = "";
    return true;
  }

  async function commitActiveEditor() {
    if (editingEmpty) return commitEmptyEditor();
    return commitActiveBlock();
  }

  function cancelActiveBlock() {
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    activeInlineColorRanges = [];
    editorController.clearEditing();
    hideCommandSuggestions();
  }

  function cancelEmptyEditor() {
    editingEmpty = false;
    emptyDraft = "";
    hideCommandSuggestions();
  }

  export function cancelEditingSession() {
    if (editingEmpty) {
      cancelEmptyEditor();
      return;
    }
    cancelActiveBlock();
  }

  export function commitEditingSession() {
    return commitActiveEditor();
  }

  export function hasUnsavedDraft() {
    if (editingEmpty) return emptyDraft.length > 0;
    if (!activeBlockOriginal) return false;
    return getActiveBlockMarkdownDraft() !== activeBlockInitialDraft;
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   * @returns {EnterSplit}
   */
  function getEnterSplit(block) {
    if (block.type !== "paragraph" && block.type !== "heading") {
      return { before: getActiveBlockMarkdownDraft().replace(/\n$/, ""), after: "" };
    }
    if (block.type === "heading") {
      return getHeadingEnterSplit(block);
    }
    return getDraftSplitAtCursor();
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function getHeadingEnterSplit(block) {
    const split = getDraftSplitAtCursor();
    const marker = getHeadingMarker(activeBlockDraft || block.rawLines[0] || "");
    const prefix = `${marker} `;
    const after = /^ {0,3}#{1,6}(?:\s+|$)/.test(split.after)
      ? split.after
      : `${prefix}${split.after.replace(/^\s+/, "")}`;
    return {
      ...split,
      after,
      caretOffset: prefix.length,
    };
  }

  /** @returns {EnterSplit} */
  function getDraftSplitAtCursor() {
    const draft = String(activeBlockDraft ?? "");
    const cursor = Math.max(0, Math.min(editorEl?.selectionStart ?? draft.length, draft.length));
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const beforeText = before.endsWith("\n") ? before.slice(0, -1) : before;
    const afterOffset = after.startsWith("\n") ? cursor + 1 : cursor;
    const afterText = after.startsWith("\n") ? after.slice(1) : after;
    return {
      before: serializeMarkdownInlineStylesFromEditing(
        beforeText,
        activeInlineColorRanges
          .filter((range) => range.start < cursor)
          .map((range) => ({
            ...range,
            end: Math.min(range.end, beforeText.length),
          })),
      ),
      after: serializeMarkdownInlineStylesFromEditing(
        afterText,
        activeInlineColorRanges
          .filter((range) => range.end > afterOffset)
          .map((range) => ({
            ...range,
            start: Math.max(0, range.start - afterOffset),
            end: Math.max(0, range.end - afterOffset),
          })),
      ),
    };
  }

  function getActiveBlockMarkdownDraft() {
    return serializeMarkdownInlineStylesFromEditing(activeBlockDraft, activeInlineColorRanges);
  }

  function getEditorDraft() {
    return editingEmpty ? emptyDraft : activeBlockDraft;
  }

  /** @param {string} draft */
  function setEditorDraft(draft) {
    if (editingEmpty) {
      emptyDraft = draft;
      return;
    }
    const previousDraft = activeBlockDraft;
    activeBlockDraft = draft;
    editorController.beginEditing(previousDraft);
    activeInlineColorRanges = editorController.updateInlineRanges(activeInlineColorRanges, activeBlockDraft);
  }

  /** @param {HTMLTextAreaElement | null} target */
  function updateCommandSuggestions(target) {
    if (!target) {
      hideCommandSuggestions();
      return;
    }
    const token = findSourceCommandToken(getEditorDraft(), target.selectionStart ?? 0);
    if (!token) {
      hideCommandSuggestions();
      return;
    }
    commandQuery = `${token.trigger}${token.query}`;
    showCommandSuggestions = true;
    commandActiveIndex = 0;
  }

  function hideCommandSuggestions() {
    showCommandSuggestions = false;
    commandQuery = "";
    commandActiveIndex = 0;
  }

  /**
   * @param {number} index
   */
  async function applyCommandSuggestion(index) {
    if (!editorEl || commandSuggestionItems.length === 0) return;
    const selected = commandSuggestionItems[Math.max(0, Math.min(index, commandSuggestionItems.length - 1))];
    const draft = getEditorDraft();
    const caret = editorEl.selectionStart ?? draft.length;
    const suffix = draft.slice(caret);
    const inserted = applySourceCommandInsert({
      text: draft,
      caret,
      insert: selected.insert,
    });
    if (!inserted) return;

    const transformed = expandNoteCommands(inserted.nextText);
    setEditorDraft(transformed);
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    const nextCaret = Math.max(0, transformed.length - suffix.length);
    editorEl.focus();
    editorEl.setSelectionRange(nextCaret, nextCaret);
  }

  function resizeEditor() {
    if (!editorEl) return;
    editorEl.style.height = "auto";
    editorEl.style.height = `${editorEl.scrollHeight}px`;
  }

  function handleEditorInput() {
    if (!editingEmpty) {
      const nextDraft = activeBlockDraft;
      activeInlineColorRanges = editorController.updateInlineRanges(activeInlineColorRanges, nextDraft);
    }
    rememberEditorSelection();
    updateCommandSuggestions(editorEl);
    resizeEditor();
  }

  /**
   * @param {boolean} outdent
   */
  async function applyEditorLineIndent(outdent = false) {
    if (!editorEl) return false;
    suppressEditorBlurBriefly();
    const draft = getEditorDraft();
    const selectionStart = editorEl.selectionStart ?? 0;
    const selectionEnd = editorEl.selectionEnd ?? selectionStart;
    const next = applyLineIndentToText(draft, selectionStart, selectionEnd, { outdent });
    if (next.text === draft && next.selectionStart === selectionStart && next.selectionEnd === selectionEnd) {
      return false;
    }
    setEditorDraft(next.text);
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    editorEl.focus();
    editorEl.setSelectionRange(next.selectionStart, next.selectionEnd);
    rememberEditorSelection();
    return true;
  }

  async function applyEditorListEnterContinuation() {
    if (!editorEl) return false;
    const draft = getEditorDraft();
    const selectionStart = editorEl.selectionStart ?? 0;
    const selectionEnd = editorEl.selectionEnd ?? selectionStart;
    const next = applyListEnterContinuation(draft, selectionStart, selectionEnd);
    if (!next) return false;
    setEditorDraft(next.text);
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    editorEl.focus();
    editorEl.setSelectionRange(next.selectionStart, next.selectionEnd);
    rememberEditorSelection();
    return true;
  }

  async function applyEditorHardLineBreak() {
    if (!editorEl) return false;
    const draft = getEditorDraft();
    const selectionStart = editorEl.selectionStart ?? 0;
    const selectionEnd = editorEl.selectionEnd ?? selectionStart;
    const next = applyHardLineBreak(draft, selectionStart, selectionEnd);
    setEditorDraft(next.text);
    hideCommandSuggestions();
    await tick();
    resizeEditor();
    editorEl.focus();
    editorEl.setSelectionRange(next.selectionStart, next.selectionEnd);
    rememberEditorSelection();
    return true;
  }

  /**
   * @param {-1 | 1} direction
   */
  function getEditorBoundaryNavigation(direction) {
    if (!editorEl || editingEmpty || !activeBlockOriginal) return null;
    const draft = getEditorDraft();
    const selectionStart = editorEl.selectionStart ?? 0;
    const selectionEnd = editorEl.selectionEnd ?? selectionStart;
    if (selectionStart !== selectionEnd) return null;

    const atStart = selectionStart === 0;
    const atEnd = selectionStart === draft.length;
    const target =
      direction < 0 && atStart
        ? getPreviousEditableBlock(activeBlockOriginal)
        : direction > 0 && atEnd
          ? getNextEditableBlock(activeBlockOriginal)
          : null;
    if (!target) return null;
    return {
      targetStartLine: target.startLine,
      caretAtEnd: direction < 0,
    };
  }

  /**
   * @param {{ targetStartLine: number; caretAtEnd: boolean }} navigation
   */
  async function moveActiveBlockAtEditorBoundary(navigation) {
    const saved = await commitActiveBlock();
    if (!saved) return true;
    pendingActiveStartLine = navigation.targetStartLine;
    pendingCaretAtEnd = navigation.caretAtEnd;
    pendingCaretOffset = navigation.caretAtEnd ? null : 0;
    return true;
  }

  function suppressEditorBlurBriefly() {
    editorController.suppressBlurBriefly();
  }

  function shouldSuppressEditorBlur() {
    return editorController.shouldSuppressBlur();
  }

  function rememberEditorSelection() {
    if (!editorEl || editingEmpty) return;
    editorController.rememberSelection(editorEl);
  }

  function handleCompositionStart() {
    editorController.beginComposition();
  }

  function handleCompositionEnd() {
    editorController.endComposition();
  }

  /** @param {ClipboardEvent} event */
  async function handleEditorPaste(event) {
    const imageItem = Array.from(event.clipboardData?.items || []).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    const file = imageItem?.getAsFile?.();
    if (!file || !editorEl) return;
    event.preventDefault();
    pasteError = "";
    try {
      const markdown = await onPasteImage(file);
      if (!markdown) throw new Error("save clipboard image returned no markdown");
      const draft = editingEmpty ? emptyDraft : activeBlockDraft;
      const inserted = insertTextAtSelection(
        draft,
        editorEl.selectionStart ?? draft.length,
        editorEl.selectionEnd ?? editorEl.selectionStart ?? draft.length,
        markdown,
      );
      if (editingEmpty) {
        emptyDraft = inserted.text;
      } else {
        activeBlockDraft = inserted.text;
      }
      await tick();
      resizeEditor();
      editorEl?.focus?.();
      editorEl?.setSelectionRange?.(inserted.caret, inserted.caret);
    } catch (error) {
      console.error("paste image into note block", error);
      pasteError = pasteErrorMessage;
    }
  }

  /** @param {FocusEvent} event */
  async function handleEditorBlur(event) {
    if (event.currentTarget !== editorEl) return;
    if (shouldSuppressEditorBlur()) {
      await tick();
      editorEl?.focus?.();
      return;
    }
    await commitActiveBlock();
  }

  /** @param {FocusEvent} event */
  async function handleEmptyEditorBlur(event) {
    if (event.currentTarget !== editorEl) return;
    if (shouldSuppressEditorBlur()) {
      await tick();
      editorEl?.focus?.();
      return;
    }
    await commitEmptyEditor();
  }

  /** @param {KeyboardEvent} event */
  async function handleEditorKeydown(event) {
    if (editorController.shouldDeferKeydownToIme(event)) return;
    if (showCommandSuggestions && commandSuggestionItems.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        commandActiveIndex = Math.min(commandActiveIndex + 1, commandSuggestionItems.length - 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        commandActiveIndex = Math.max(commandActiveIndex - 1, 0);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        await applyCommandSuggestion(commandActiveIndex);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideCommandSuggestions();
        return;
      }
    }
    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      await applyEditorLineIndent(event.shiftKey);
      return;
    }
    if (
      (event.key === "ArrowLeft" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowDown") &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const navigation = getEditorBoundaryNavigation(direction);
      if (navigation) {
        event.preventDefault();
        event.stopPropagation();
        await moveActiveBlockAtEditorBoundary(navigation);
        return;
      }
    }
    if (event.key === "Enter" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      await applyEditorHardLineBreak();
      return;
    }
    if (event.key === "Backspace" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const selectionStart = editorEl?.selectionStart ?? 0;
      const selectionEnd = editorEl?.selectionEnd ?? selectionStart;
      if (
        !editingEmpty &&
        activeBlockOriginal &&
        selectionStart === 0 &&
        selectionEnd === 0 &&
        getPreviousEditableBlock(activeBlockOriginal)
      ) {
        event.preventDefault();
        event.stopPropagation();
        await mergeActiveBlockBackward();
      }
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      if (await applyEditorListEnterContinuation()) {
        return;
      }
      if (editingEmpty) {
        await commitEmptyEditor();
      } else {
        await splitActiveBlockAfter();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      event.stopPropagation();
      if (editingEmpty) {
        await commitEmptyEditor();
      } else {
        await commitActiveBlock();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hideCommandSuggestions();
      if (commitOnEscape) {
        const saved = editingEmpty ? await commitEmptyEditor() : await commitActiveBlock();
        if (saved !== false) {
          await onEditorEscape();
        }
        return;
      }
      if (editingEmpty) {
        cancelEmptyEditor();
      } else {
        cancelActiveBlock();
      }
    }
  }

  /**
   * @param {KeyboardEvent} event
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function handleBlockKeydown(event, block) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    openBlock(block);
  }

  /**
   * @param {MouseEvent} event
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function estimateCaretOffsetFromPointer(event, block) {
    const element = /** @type {HTMLElement | null} */ (event.currentTarget);
    return estimateMarkdownCaretOffset({
      markdown: block.rawLines.join("\n"),
      rect: element?.getBoundingClientRect?.() ?? null,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  /**
   * @param {MouseEvent} event
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function handleBlockPointerEdit(event, block) {
    if (readonly) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.closest?.("[data-task-action], button, input, select, textarea, a")) return;
    if (globalThis.getSelection?.()?.toString()) return;
    event.preventDefault();
    openBlock(block, { caretOffset: estimateCaretOffsetFromPointer(event, block) });
  }

  /** @param {MouseEvent} event @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block */
  function handleOpenButton(event, block) {
    event.preventDefault();
    event.stopPropagation();
    openBlock(block);
  }

  /** @param {MouseEvent} event */
  function handleTaskClick(event) {
    if (!interactiveTasks) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    const actionEl = target?.closest?.("[data-task-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-task-action");
    const line = Number(actionEl.getAttribute("data-task-line"));
    if (!Number.isFinite(line)) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === "toggle") {
      onToggleTask(line);
    } else if (action === "append") {
      onAppendTask(line);
    }
  }

  /** @param {MouseEvent} event */
  function handleAddSameBlockClick(event) {
    event.preventDefault();
    event.stopPropagation();
    void addSameBlockAfterActive();
  }

  /** @param {PointerEvent} event */
  function keepEditorFocus(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * @param {PointerEvent} event
   * @param {number} index
   */
  function handleCommandPointerDown(event, index) {
    event.preventDefault();
    event.stopPropagation();
    void applyCommandSuggestion(index);
  }
</script>

<div class="block-note-content" class:compact>
  {#if blocks.length === 0}
    {#if editingEmpty}
      <div class="note-block editing empty-editing">
        {#if showCommandSuggestions && commandSuggestionItems.length > 0}
          <div class="command-popover">
            {#each commandSuggestionItems as cmd, idx (cmd.name)}
              <button
                type="button"
                class="command-item"
                class:active={idx === commandActiveIndex}
                onpointerdown={(event) => handleCommandPointerDown(event, idx)}
              >
                <span class="command-name">{cmd.name}</span>
                <span class="command-preview">{cmd.preview}</span>
              </button>
            {/each}
          </div>
        {/if}
        <textarea
          bind:this={editorEl}
          bind:value={emptyDraft}
          class="block-editor"
          rows="2"
          {placeholder}
          spellcheck="false"
          oninput={handleEditorInput}
          oncompositionstart={handleCompositionStart}
          oncompositionend={handleCompositionEnd}
          onpaste={handleEditorPaste}
          onkeydown={handleEditorKeydown}
          onblur={handleEmptyEditorBlur}
        ></textarea>
        {#if pasteError}
          <div class="editor-inline-error" role="alert">{pasteError}</div>
        {/if}
      </div>
    {:else}
      <button type="button" class="empty-block" disabled={readonly} onclick={openEmptyEditor}>
        {placeholder}
      </button>
    {/if}
  {:else}
    {#each blocks as block (block.id)}
      {#if activeBlockId === block.id}
        <div
          class="note-block editing"
          data-block-type={block.type}
          data-heading-level={getHeadingLevel(block)}
        >
          <textarea
            bind:this={editorEl}
            bind:value={activeBlockDraft}
            class="block-editor"
            rows={Math.max(1, block.rawLines.length)}
            spellcheck="false"
            oninput={handleEditorInput}
            oncompositionstart={handleCompositionStart}
            oncompositionend={handleCompositionEnd}
            onpaste={handleEditorPaste}
            onselect={rememberEditorSelection}
            onkeyup={rememberEditorSelection}
            onclick={rememberEditorSelection}
            onkeydown={handleEditorKeydown}
            onblur={handleEditorBlur}
          ></textarea>
          {#if pasteError}
            <div class="editor-inline-error" role="alert">{pasteError}</div>
          {/if}
          <button
            type="button"
            class="block-add-button"
            aria-label={addSameBlockLabel}
            title={addSameBlockLabel}
            onpointerdown={keepEditorFocus}
          onclick={handleAddSameBlockClick}
          >
            +
          </button>
          {#if showCommandSuggestions && commandSuggestionItems.length > 0}
            <div class="command-popover">
              {#each commandSuggestionItems as cmd, idx (cmd.name)}
                <button
                  type="button"
                  class="command-item"
                  class:active={idx === commandActiveIndex}
                  onpointerdown={(event) => handleCommandPointerDown(event, idx)}
                >
                  <span class="command-name">{cmd.name}</span>
                  <span class="command-preview">{cmd.preview}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
        <div
          class="note-block rendered"
          class:readonly
          data-block-type={block.type}
          onclick={(event) => editTrigger === "click" && handleBlockPointerEdit(event, block)}
          ondblclick={(event) => editTrigger === "dblclick" && handleBlockPointerEdit(event, block)}
        >
          <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
          <div class="block-html preview-markdown" onclick={handleTaskClick}>
            {@html renderBlockHtml(block)}
          </div>
          {#if !readonly && block.editable}
            <button
              type="button"
              class="block-open-button"
              aria-label={editBlockLabel}
              title={editBlockLabel}
              onclick={(event) => handleOpenButton(event, block)}
              onkeydown={(event) => handleBlockKeydown(event, block)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
              </svg>
            </button>
          {/if}
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .block-note-content {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100%;
    color: var(--note-text-color, var(--ws-text, #1f2937));
    font-family: "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.66;
  }

  .note-block {
    position: relative;
    display: block;
    width: 100%;
    border: none;
    border-radius: 0;
    padding: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    min-width: 0;
    background: transparent;
    outline: none;
  }

  .note-block.rendered:not(.readonly) {
    cursor: grab;
  }

  .note-block.editing {
    position: relative;
    background: transparent;
  }

  .empty-editing {
    position: relative;
  }

  .block-html {
    padding: 0;
    min-width: 0;
    user-select: text;
  }

  .block-html :global(*) {
    max-width: 100%;
  }

  .block-html :global(h1),
  .block-html :global(h2),
  .block-html :global(h3),
  .block-html :global(h4),
  .block-html :global(h5),
  .block-html :global(h6),
  .block-html :global(p),
  .block-html :global(ul),
  .block-html :global(ol),
  .block-html :global(blockquote),
  .block-html :global(pre),
  .block-html :global(table),
  .block-html :global(.task-block) {
    margin-top: 0;
    margin-bottom: 0;
  }

  .block-html :global(ul),
  .block-html :global(ol) {
    padding-left: 20px;
  }

  .block-html :global(blockquote) {
    margin: 2px 0 4px;
    padding: 0 0 0 12px;
    border-left: 2px solid color-mix(in srgb, currentColor 24%, transparent);
    border-radius: 0;
    background: transparent;
    color: color-mix(in srgb, currentColor 82%, transparent);
  }

  .block-html :global(img) {
    max-width: 100%;
    height: auto;
  }

  .block-html :global(.task-block) {
    display: block;
  }

  .block-html :global(ul.task-list) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .block-html :global(li.task-item) {
    min-height: 26px;
  }

  .block-html :global(.task-row) {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    align-items: start;
    gap: 7px;
    min-width: 0;
  }

  .block-html :global(.task-row input[type="checkbox"]) {
    width: 15px;
    height: 15px;
    margin: 4px 0 0;
    accent-color: var(--ws-accent, #1d4ed8);
  }

  .block-html :global(.task-text) {
    min-width: 0;
    line-height: 1.58;
  }

  .block-html :global(.task-item.is-done .task-text) {
    opacity: 0.68;
    text-decoration: line-through;
  }

  .block-html :global(.task-add) {
    display: none;
  }

  .block-editor {
    display: block;
    width: 100%;
    min-height: 0;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    color: inherit;
    padding: 0;
    font: inherit;
    tab-size: 2;
    overflow: hidden;
    scrollbar-width: none;
    white-space: pre-wrap;
    word-break: break-word;
    user-select: text;
  }

  .note-block[data-block-type="heading"] .block-editor {
    font-size: 2em;
    line-height: 1.66;
    font-weight: 700;
  }

  .note-block[data-heading-level="2"] .block-editor {
    font-size: 1.5em;
  }

  .note-block[data-heading-level="3"] .block-editor {
    font-size: 1.17em;
  }

  .note-block[data-heading-level="4"] .block-editor {
    font-size: 1em;
  }

  .note-block[data-heading-level="5"] .block-editor {
    font-size: 0.83em;
  }

  .note-block[data-heading-level="6"] .block-editor {
    font-size: 0.67em;
  }

  .note-block[data-block-type="code_block"] .block-editor {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  }

  .block-open-button {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    border-radius: 5px;
    background: color-mix(in srgb, var(--ws-card-bg, white) 88%, transparent);
    color: inherit;
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.14s ease;
  }

  .block-open-button svg {
    width: 13px;
    height: 13px;
  }

  .note-block.rendered:hover .block-open-button,
  .block-open-button:focus-visible {
    opacity: 0.78;
  }

  .block-open-button:hover {
    opacity: 1;
  }

  .block-open-button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 42%, transparent);
    outline-offset: 1px;
  }

  .block-editor::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .editor-inline-error {
    margin-top: 5px;
    padding: 5px 7px;
    border-radius: 4px;
    background: color-mix(in srgb, #fee2e2 86%, transparent);
    color: #991b1b;
    font-size: 11px;
    line-height: 1.35;
  }

  .block-add-button {
    position: absolute;
    right: 0;
    bottom: -2px;
    width: 20px;
    height: 20px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-card-bg, white) 82%, transparent);
    color: inherit;
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0;
    font: inherit;
    font-size: 14px;
    line-height: 1;
    opacity: 0.58;
  }

  .block-add-button:hover,
  .block-add-button:focus-visible {
    opacity: 1;
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 36%, transparent);
    outline: none;
  }

  .command-popover {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    max-height: 176px;
    overflow: auto;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    border-radius: 6px;
    background: color-mix(in srgb, var(--ws-card-bg, white) 94%, transparent);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
    z-index: 8;
    padding: 4px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .command-item {
    width: 100%;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    cursor: pointer;
    text-align: left;
    font: inherit;
  }

  .command-item:hover,
  .command-item.active {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .command-name {
    font-size: 12px;
    font-weight: 700;
  }

  .command-preview {
    min-width: 0;
    margin-left: auto;
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-block {
    border: 1px dashed var(--ws-border-soft, #dbe4ef);
    border-radius: 4px;
    background: transparent;
    color: var(--ws-muted, #64748b);
    min-height: 72px;
    text-align: left;
    padding: 10px;
    cursor: text;
  }
</style>
