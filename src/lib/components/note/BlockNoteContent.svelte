<script>
  import { tick } from "svelte";
  import {
    blockRangeMatches,
    mergeBlockIntoPreviousMarkdown,
    parseMarkdownBlocks,
    parseTaskLine,
    removeBlockMarkdown,
    replaceBlockMarkdown,
    splitBlockMarkdown,
  } from "$lib/markdown/note-markdown.js";
  import { renderMarkdownBlocks } from "$lib/markdown/blocks/block-renderer.js";

  let {
    text = "",
    compact = false,
    interactiveTasks = false,
    readonly = false,
    editTrigger = "click",
    placeholder = "",
    onBeginEdit = () => {},
    onTextChange = async () => {},
    onToggleTask = () => {},
    onAppendTask = () => {},
    onConflict = () => {},
  } = $props();

  /** @type {string | null} */
  let activeBlockId = $state(null);
  let activeBlockDraft = $state("");
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

  const blocks = $derived(parseMarkdownBlocks(text || "", { preserveBlankBlocks: true }));

  $effect(() => {
    if (pendingActiveStartLine == null) return;
    void tick().then(() => {
      if (pendingActiveStartLine == null) return;
      const nextBlock = blocks.find((block) => block.startLine === pendingActiveStartLine);
      if (!nextBlock) {
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

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   * @param {{ fromPending?: boolean }} [options]
   */
  async function openBlock(block, options = {}) {
    if (readonly || !block.editable) return;
    if (onBeginEdit() === false) return;
    if (editingEmpty) {
      await commitEmptyEditor();
    }
    if (activeBlockId && activeBlockId !== block.id) {
      const saved = await commitActiveEditor();
      if (!saved) return;
    }
    activeBlockId = block.id;
    activeBlockDraft = block.markdown;
    activeBlockOriginal = block;
    await tick();
    resizeEditor();
    editorEl?.focus?.();
    if (options.fromPending && pendingCaretOffset != null) {
      const caret = Math.max(0, Math.min(pendingCaretOffset, activeBlockDraft.length));
      pendingCaretOffset = null;
      pendingCaretAtEnd = false;
      editorEl?.setSelectionRange?.(caret, caret);
    } else if (options.fromPending && pendingCaretAtEnd) {
      pendingCaretAtEnd = false;
      const caret = activeBlockDraft.length;
      editorEl?.setSelectionRange?.(caret, caret);
    }
  }

  async function openEmptyEditor() {
    if (readonly) return;
    if (onBeginEdit() === false) return;
    if (activeBlockId) {
      const saved = await commitActiveEditor();
      if (!saved) return;
    }
    editingEmpty = true;
    emptyDraft = text || "";
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
      cancelActiveBlock();
      onConflict();
      return false;
    }
    const nextText = replaceBlockMarkdown(text, activeBlockOriginal, activeBlockDraft);
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    if (nextText !== text) {
      await onTextChange(nextText);
    }
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
    pendingActiveStartLine = inserted.nextStartLine;
    await onTextChange(inserted.text);
    return true;
  }

  async function addSameBlockAfterActive() {
    if (!activeBlockOriginal) return false;
    if (activeBlockOriginal.type === "task_block") {
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
    const inserted = splitBlockMarkdown(text, activeBlockOriginal, activeBlockDraft, insert.markdown);
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
    pendingActiveStartLine = inserted.nextStartLine + insert.activeLineOffset;
    pendingCaretAtEnd = true;
    await onTextChange(inserted.text);
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

    const draft = String(activeBlockDraft ?? "");
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

  function appendTaskLineToActiveDraft() {
    const draft = String(activeBlockDraft ?? "");
    const lines = draft.split("\n");
    const sourceLine = [...lines].reverse().find((line) => parseTaskLine(line)) ?? lines[0] ?? "";
    const parsed = parseTaskLine(sourceLine);
    const indent = parsed?.indent ?? "";
    const marker = parsed?.marker ?? "-";
    appendLineToActiveDraft(`${indent}${marker} [ ] `);
  }

  /** @param {string} line */
  function appendLineToActiveDraft(line) {
    const draft = String(activeBlockDraft ?? "");
    activeBlockDraft = `${draft.replace(/\n$/, "")}\n${line}`;
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
    editingEmpty = false;
    emptyDraft = "";
    if (nextText !== text) {
      await onTextChange(nextText);
    }
  }

  async function commitActiveEditor() {
    if (editingEmpty) return commitEmptyEditor();
    return commitActiveBlock();
  }

  function cancelActiveBlock() {
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
  }

  function cancelEmptyEditor() {
    editingEmpty = false;
    emptyDraft = "";
  }

  /**
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function getEnterSplit(block) {
    if (block.type !== "paragraph" && block.type !== "heading") {
      return { before: String(activeBlockDraft ?? "").replace(/\n$/, ""), after: "" };
    }
    return getDraftSplitAtCursor();
  }

  function getDraftSplitAtCursor() {
    const draft = String(activeBlockDraft ?? "");
    const cursor = Math.max(0, Math.min(editorEl?.selectionStart ?? draft.length, draft.length));
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    return {
      before: before.endsWith("\n") ? before.slice(0, -1) : before,
      after: after.startsWith("\n") ? after.slice(1) : after,
    };
  }

  function resizeEditor() {
    if (!editorEl) return;
    editorEl.style.height = "auto";
    editorEl.style.height = `${editorEl.scrollHeight}px`;
  }

  function handleEditorInput() {
    resizeEditor();
  }

  /** @param {FocusEvent} event */
  async function handleEditorBlur(event) {
    if (event.currentTarget !== editorEl) return;
    await commitActiveBlock();
  }

  /** @param {FocusEvent} event */
  async function handleEmptyEditorBlur(event) {
    if (event.currentTarget !== editorEl) return;
    await commitEmptyEditor();
  }

  /** @param {KeyboardEvent} event */
  async function handleEditorKeydown(event) {
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
  function handleBlockPointerEdit(event, block) {
    if (readonly) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.closest?.("[data-task-action], button, input, select, textarea, a")) return;
    event.preventDefault();
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
</script>

<div class="block-note-content" class:compact data-no-drag="true">
  {#if blocks.length === 0}
    {#if editingEmpty}
      <div class="note-block editing empty-editing">
        <textarea
          bind:this={editorEl}
          bind:value={emptyDraft}
          class="block-editor"
          rows="2"
          {placeholder}
          spellcheck="false"
          oninput={handleEditorInput}
          onkeydown={handleEditorKeydown}
          onblur={handleEmptyEditorBlur}
        ></textarea>
      </div>
    {:else}
      <button type="button" class="empty-block" disabled={readonly} onclick={openEmptyEditor}>
        {placeholder}
      </button>
    {/if}
  {:else}
    {#each blocks as block (block.id)}
      {#if activeBlockId === block.id}
        <div class="note-block editing" data-block-type={block.type}>
          <textarea
            bind:this={editorEl}
            bind:value={activeBlockDraft}
            class="block-editor"
            rows={Math.max(1, block.rawLines.length)}
            spellcheck="false"
            oninput={handleEditorInput}
            onkeydown={handleEditorKeydown}
            onblur={handleEditorBlur}
          ></textarea>
          <button
            type="button"
            class="block-add-button"
            aria-label="Add same block"
            title="Add same block"
            onpointerdown={keepEditorFocus}
            onclick={handleAddSameBlockClick}
          >
            +
          </button>
        </div>
      {:else}
        <div
          class="note-block rendered"
          class:readonly
          data-block-type={block.type}
          role="button"
          tabindex={readonly || !block.editable ? -1 : 0}
          aria-disabled={readonly || !block.editable}
          onclick={(event) => editTrigger === "click" && handleBlockPointerEdit(event, block)}
          ondblclick={(event) => editTrigger === "dblclick" && handleBlockPointerEdit(event, block)}
          onkeydown={(event) => handleBlockKeydown(event, block)}
        >
          <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
          <div class="block-html preview-markdown" onclick={handleTaskClick}>
            {@html renderBlockHtml(block)}
          </div>
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
    cursor: default;
  }

  .note-block.rendered:not(.readonly):focus-visible {
    outline: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 34%, transparent);
    outline-offset: 1px;
  }

  .note-block.editing {
    position: relative;
    background: transparent;
  }

  .block-html {
    padding: 0;
    min-width: 0;
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

  .block-html :global(img) {
    max-width: 100%;
    height: auto;
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

  .block-editor::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
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
