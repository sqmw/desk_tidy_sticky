<script>
  import { tick } from "svelte";
  import { convertFileSrc, invoke } from "@tauri-apps/api/core";
  import {
    BLOCK_TYPE,
    blocksToMarkdown,
    filterBlockCommands,
    parseMarkdownToBlocks,
    shortTypeLabel,
  } from "$lib/note/block-model.js";
  import {
    applyBlockCommandAt,
    applyShortcutAt,
    insertParagraphAfter,
    mergeBlockWithPrevious,
    moveBlock,
    normalizeBlockAtToParagraph,
    replaceBlockText,
    splitBlockAtCaret,
    toggleTodoAt,
  } from "$lib/note/block-ops.js";
  import { matchBlockShortcut } from "$lib/note/block-shortcuts.js";
  import {
    getSelectionOffsets,
    isCaretAtStart,
    setSelectionOffsets,
  } from "$lib/note/contenteditable-caret.js";

  let {
    text = $bindable(""),
    noteId = "",
    onTextChange = () => {},
  } = $props();

  /** @type {HTMLDivElement | null} */
  let rootEl = $state(null);
  /** @type {Array<{ id: string; type: string; text: string; checked: boolean }>} */
  let blocks = $state(parseMarkdownToBlocks(text));
  let lastSerializedText = text;
  let activeIndex = $state(0);
  let slashVisible = $state(false);
  let slashIndex = $state(-1);
  let slashQuery = $state("");
  let slashActive = $state(0);
  let dragFromIndex = $state(-1);
  let dropIndex = $state(-1);

  const slashCommands = $derived(filterBlockCommands(slashQuery));

  $effect(() => {
    if (text === lastSerializedText) return;
    blocks = parseMarkdownToBlocks(text);
    lastSerializedText = text;
  });

  function hideSlash() {
    slashVisible = false;
    slashIndex = -1;
    slashQuery = "";
    slashActive = 0;
  }

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

  /**
   * @param {Array<{ id: string; type: string; text: string; checked: boolean }>} nextBlocks
   */
  function commit(nextBlocks) {
    blocks = nextBlocks;
    const nextText = blocksToMarkdown(nextBlocks);
    lastSerializedText = nextText;
    text = nextText;
    onTextChange(nextText);
  }

  /**
   * @param {string} blockId
   * @param {number} pos
   */
  async function focusBlock(blockId, pos = 0) {
    await tick();
    const selector = `.block-input[data-block-id="${blockId}"]`;
    const input = /** @type {HTMLElement | null} */ (rootEl?.querySelector(selector));
    if (!input) return;
    input.focus();
    const len = (input.textContent ?? "").length;
    const nextPos = Math.max(0, Math.min(pos, len));
    setSelectionOffsets(input, nextPos, nextPos);
  }

  /**
   * @param {string} type
   * @param {string} raw
   */
  function normalizeBlockInput(type, raw) {
    const base = String(raw ?? "").replaceAll("\r", "");
    if (type === BLOCK_TYPE.CODE) {
      return base;
    }
    return base.replaceAll("\n", " ");
  }

  /**
   * @param {number} idx
   * @param {string} value
   */
  function updateSlashByText(idx, value) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed.startsWith("/")) {
      if (slashIndex === idx) hideSlash();
      return;
    }
    const token = trimmed.slice(1).split(/\s+/)[0] || "";
    slashVisible = true;
    slashIndex = idx;
    slashQuery = token;
    slashActive = 0;
  }

  /**
   * @param {number} idx
   * @param {string} value
   */
  function setBlockText(idx, value) {
    const next = replaceBlockText(blocks, idx, value);
    commit(next);
    updateSlashByText(idx, value);
  }

  /**
   * @param {number} idx
   * @param {Event} event
   */
  function onBlockInput(idx, event) {
    const current = blocks[idx];
    if (!current) return;
    const target = /** @type {HTMLElement | null} */ (event.currentTarget);
    if (!target) return;
    const value = normalizeBlockInput(current.type, target.innerText);
    const { start, end } = getSelectionOffsets(target);
    const shortcut = matchBlockShortcut({
      currentType: current.type,
      text: value,
      selectionStart: start,
      selectionEnd: end,
    });
    if (!shortcut) {
      setBlockText(idx, value);
      return;
    }
    const next = applyShortcutAt(blocks, idx, shortcut);
    commit(next);
    hideSlash();
    const nextBlock = next[idx];
    if (nextBlock) {
      focusBlock(nextBlock.id, shortcut.caret);
    }
  }

  /**
   * @param {number} idx
   */
  function toggleTodoChecked(idx) {
    const next = toggleTodoAt(blocks, idx);
    commit(next);
  }

  /**
   * @param {number} idx
   */
  function openTypeMenu(idx) {
    slashVisible = true;
    slashIndex = idx;
    slashQuery = "";
    slashActive = 0;
  }

  /**
   * @param {number} idx
   * @param {{ type: string; key: string; label: string }} cmd
   */
  function applySlashCommand(idx, cmd) {
    const next = applyBlockCommandAt(blocks, idx, cmd);
    commit(next);
    const nextBlock = next[idx];
    if (!nextBlock) return;
    hideSlash();
    focusBlock(nextBlock.id, nextBlock.text.length);
  }

  /**
   * @param {number} idx
   * @param {KeyboardEvent} event
   */
  function onBlockKeydown(idx, event) {
    const current = blocks[idx];
    if (!current) return;

    if (slashVisible && slashIndex === idx && slashCommands.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        slashActive = Math.min(slashActive + 1, slashCommands.length - 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        slashActive = Math.max(slashActive - 1, 0);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applySlashCommand(idx, slashCommands[slashActive]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        hideSlash();
        return;
      }
    }

    const target = /** @type {HTMLElement} */ (event.currentTarget);
    const { start, end } = getSelectionOffsets(target);

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const caret = start;
      const head = current.text.slice(0, caret);
      const tail = current.text.slice(caret);

      if (!head.trim() && !tail.trim() && current.type !== BLOCK_TYPE.PARAGRAPH) {
        const next = normalizeBlockAtToParagraph(blocks, idx);
        commit(next);
        focusBlock(current.id, 0);
        return;
      }

      const split = splitBlockAtCaret(blocks, idx, caret);
      if (!split) return;
      const { next, inserted } = split;
      commit(next);
      hideSlash();
      focusBlock(inserted.id, 0);
      return;
    }

    if (event.key === "Backspace") {
      if (start !== end) return;

      if (isCaretAtStart(target)) {
        if (!current.text && current.type !== BLOCK_TYPE.PARAGRAPH) {
          event.preventDefault();
          const next = normalizeBlockAtToParagraph(blocks, idx);
          commit(next);
          return;
        }
        if (idx > 0) {
          event.preventDefault();
          const mergedResult = mergeBlockWithPrevious(blocks, idx);
          if (!mergedResult) return;
          const { next, merged, prevTextLength } = mergedResult;
          commit(next);
          hideSlash();
          focusBlock(merged.id, prevTextLength);
        }
      }
    }

    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const to = event.key === "ArrowUp" ? Math.max(0, idx - 1) : Math.min(blocks.length - 1, idx + 1);
      const next = moveBlock(blocks, idx, to);
      if (next === blocks) return;
      commit(next);
      hideSlash();
      focusBlock(current.id, 0);
    }
  }

  /**
   * @param {number} idx
   * @param {ClipboardEvent} event
   */
  async function onBlockPaste(idx, event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    try {
      const target = /** @type {HTMLElement | null} */ (event.currentTarget);
      if (!target) return;
      const { start, end } = getSelectionOffsets(target);
      const base64 = await blobToBase64(file);
      const savedPath = await invoke("save_clipboard_image", {
        noteId,
        mimeType: file.type || "image/png",
        dataBase64: base64,
      });
      const imageSrc = convertFileSrc(savedPath);
      const stamp = new Date().toISOString().replaceAll(":", "-");
      const md = `![pasted-${stamp}](${imageSrc})`;

      const current = blocks[idx];
      if (!current) return;
      const nextText = current.text.slice(0, start) + md + current.text.slice(end);
      const next = blocks.map((block, i) => (i === idx ? { ...block, text: nextText } : block));
      commit(next);
      hideSlash();
      await focusBlock(current.id, start + md.length);
    } catch (e) {
      console.error("onBlockPaste", e);
    }
  }

  /** @param {number} idx */
  function quickInsertAfter(idx) {
    const { next, inserted } = insertParagraphAfter(blocks, idx);
    commit(next);
    hideSlash();
    focusBlock(inserted.id, 0);
  }

  /**
   * @param {number} idx
   * @param {DragEvent} event
   */
  function onDragStart(idx, event) {
    dragFromIndex = idx;
    dropIndex = idx;
    event.dataTransfer?.setData("text/plain", String(idx));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  /**
   * @param {number} idx
   * @param {DragEvent} event
   */
  function onDragOver(idx, event) {
    if (dragFromIndex < 0) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    dropIndex = idx;
  }

  /**
   * @param {number} idx
   * @param {DragEvent} event
   */
  function onDrop(idx, event) {
    if (dragFromIndex < 0) return;
    event.preventDefault();
    const from = dragFromIndex;
    const to = idx;
    dragFromIndex = -1;
    dropIndex = -1;
    const movedBlock = blocks[from];
    const next = moveBlock(blocks, from, to);
    if (next === blocks) return;
    commit(next);
    hideSlash();
    if (movedBlock) {
      focusBlock(movedBlock.id, 0);
    }
  }

  function onDragEnd() {
    dragFromIndex = -1;
    dropIndex = -1;
  }
</script>

<div class="block-editor-root" bind:this={rootEl} role="list">
  {#each blocks as block, idx (block.id)}
    <div
      class="block-row"
      role="listitem"
      class:active={idx === activeIndex}
      class:dragging={idx === dragFromIndex}
      class:drop-target={idx === dropIndex && dragFromIndex >= 0 && idx !== dragFromIndex}
      ondragover={(event) => onDragOver(idx, event)}
      ondrop={(event) => onDrop(idx, event)}
    >
      <button
        class="drag-chip"
        type="button"
        draggable="true"
        ondragstart={(event) => onDragStart(idx, event)}
        ondragend={onDragEnd}
        title="Drag block"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M9 7h.01"></path>
          <path d="M9 12h.01"></path>
          <path d="M9 17h.01"></path>
          <path d="M15 7h.01"></path>
          <path d="M15 12h.01"></path>
          <path d="M15 17h.01"></path>
        </svg>
      </button>
      <button class="type-chip" type="button" title="Switch block type" onclick={() => openTypeMenu(idx)}>
        {shortTypeLabel(block.type)}
      </button>
      <button class="add-chip" type="button" title="Add block below" onclick={() => quickInsertAfter(idx)}>
        +
      </button>
      {#if block.type === BLOCK_TYPE.TODO}
        <input
          class="todo-check"
          type="checkbox"
          checked={block.checked}
          onchange={() => toggleTodoChecked(idx)}
          aria-label="todo checked"
        />
      {/if}
      <div
        data-block-id={block.id}
        contenteditable="true"
        tabindex="0"
        role="textbox"
        aria-multiline={block.type === BLOCK_TYPE.CODE ? "true" : "false"}
        class="block-input"
        class:code={block.type === BLOCK_TYPE.CODE}
        class:heading1={block.type === BLOCK_TYPE.HEADING1}
        class:heading2={block.type === BLOCK_TYPE.HEADING2}
        class:heading3={block.type === BLOCK_TYPE.HEADING3}
        class:quote={block.type === BLOCK_TYPE.QUOTE}
        data-placeholder={idx === 0 ? "Type '/' for blocks..." : ""}
        onfocus={() => (activeIndex = idx)}
        oninput={(event) => onBlockInput(idx, event)}
        onkeydown={(event) => onBlockKeydown(idx, event)}
        onpaste={(event) => onBlockPaste(idx, event)}
      >{block.text}</div>
      {#if slashVisible && slashIndex === idx && slashCommands.length > 0}
        <div class="slash-menu">
          {#each slashCommands as cmd, cmdIdx (cmd.key)}
            <button
              class="slash-item"
              class:active={cmdIdx === slashActive}
              type="button"
              onclick={() => applySlashCommand(idx, cmd)}
            >
              <span class="slash-key">/{cmd.key}</span>
              <span class="slash-label">{cmd.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .block-editor-root {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px 10px 54px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .block-editor-root::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .block-row {
    position: relative;
    display: grid;
    grid-template-columns: 24px 28px 24px minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    border-radius: 10px;
    padding: 3px 4px;
    transition: background 0.15s ease;
  }

  .block-row:has(.todo-check) {
    grid-template-columns: 24px 28px 24px 18px minmax(0, 1fr);
  }

  .block-row:hover,
  .block-row.active {
    background: rgba(255, 255, 255, 0.46);
  }

  .block-row.dragging {
    opacity: 0.35;
  }

  .block-row.drop-target {
    box-shadow: 0 -2px 0 rgba(15, 76, 129, 0.9) inset;
  }

  .drag-chip {
    width: 20px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    cursor: grab;
    margin-top: 2px;
    padding: 0;
  }

  .drag-chip:hover {
    background: rgba(255, 255, 255, 0.75);
    color: #334155;
  }

  .drag-chip:active {
    cursor: grabbing;
  }

  .drag-chip svg {
    width: 18px;
    height: 18px;
    display: block;
    margin: auto;
  }

  .type-chip {
    width: 24px;
    height: 24px;
    border: 1px solid rgba(148, 163, 184, 0.6);
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.82);
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    margin-top: 2px;
  }

  .type-chip:hover {
    color: #1f2937;
    border-color: rgba(71, 85, 105, 0.8);
  }

  .add-chip {
    width: 20px;
    height: 24px;
    border: 1px dashed rgba(148, 163, 184, 0.6);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.65);
    color: #64748b;
    cursor: pointer;
    margin-top: 2px;
    font-size: 14px;
    line-height: 1;
    font-weight: 700;
    padding: 0;
  }

  .add-chip:hover {
    background: rgba(255, 255, 255, 0.9);
    color: #1f2937;
    border-color: rgba(100, 116, 139, 0.8);
  }

  .todo-check {
    margin-top: 7px;
    width: 14px;
    height: 14px;
    accent-color: #0f4c81;
  }

  .block-input {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--note-text-color, #1f2937);
    outline: none;
    min-height: 24px;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
    font-size: 15px;
    padding: 4px 0;
    font-family: "Segoe UI", sans-serif;
  }

  .block-input:empty::before {
    content: attr(data-placeholder);
    color: rgba(100, 116, 139, 0.85);
    pointer-events: none;
  }

  .block-input.heading1 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .block-input.heading2 {
    font-size: 1.08rem;
    font-weight: 700;
  }

  .block-input.heading3 {
    font-size: 1rem;
    font-weight: 700;
  }

  .block-input.quote {
    border-left: 3px solid rgba(15, 76, 129, 0.38);
    padding-left: 8px;
    background: rgba(255, 255, 255, 0.22);
    border-radius: 4px;
  }

  .block-input.code {
    font-family: Consolas, "Cascadia Code", monospace;
    font-size: 0.9rem;
    background: rgba(15, 23, 42, 0.08);
    border-radius: 8px;
    padding: 8px;
    min-height: 68px;
  }

  .slash-menu {
    position: absolute;
    z-index: 6;
    left: 66px;
    right: 6px;
    top: calc(100% + 2px);
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
    padding: 4px;
  }

  .slash-item {
    width: 100%;
    border: none;
    background: transparent;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 8px;
    padding: 6px 8px;
    text-align: left;
    cursor: pointer;
  }

  .slash-item:hover,
  .slash-item.active {
    background: rgba(15, 76, 129, 0.1);
  }

  .slash-key {
    font-weight: 700;
    font-size: 12px;
    color: #1f2937;
  }

  .slash-label {
    font-size: 11px;
    color: #64748b;
  }
</style>
