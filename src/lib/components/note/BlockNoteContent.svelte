<script>
  import { tick } from "svelte";
  import {
    blockRangeMatches,
    parseMarkdownBlocks,
    replaceBlockMarkdown,
  } from "$lib/markdown/note-markdown.js";
  import { renderMarkdownBlocks } from "$lib/markdown/blocks/block-renderer.js";

  let {
    text = "",
    compact = false,
    interactiveTasks = false,
    readonly = false,
    placeholder = "",
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

  const blocks = $derived(parseMarkdownBlocks(text || ""));

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
   */
  async function openBlock(block) {
    if (readonly || !block.editable) return;
    if (activeBlockId && activeBlockId !== block.id) {
      const saved = await commitActiveBlock();
      if (!saved) return;
    }
    activeBlockId = block.id;
    activeBlockDraft = block.markdown;
    activeBlockOriginal = block;
    await tick();
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

  function cancelActiveBlock() {
    activeBlockId = null;
    activeBlockOriginal = null;
    activeBlockDraft = "";
  }

  /** @param {KeyboardEvent} event */
  async function handleEditorKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      event.stopPropagation();
      await commitActiveBlock();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelActiveBlock();
    }
  }

  /**
   * @param {MouseEvent} event
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function handleBlockClick(event, block) {
    if (readonly) return;
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.closest?.("[data-task-action], button, input, select, textarea, a")) return;
    openBlock(block);
  }

  /**
   * @param {KeyboardEvent} event
   * @param {import("$lib/markdown/blocks/block-parser.js").MarkdownBlock} block
   */
  function handleBlockKeydown(event, block) {
    if (event.key !== "Enter" && event.key !== " ") return;
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
</script>

<div class="block-note-content" class:compact data-no-drag="true">
  {#if blocks.length === 0}
    <button type="button" class="empty-block" disabled={readonly} onclick={() => {}}>
      {placeholder}
    </button>
  {:else}
    {#each blocks as block (block.id)}
      {#if activeBlockId === block.id}
        <div class="note-block editing" data-block-type={block.type}>
          <textarea
            bind:this={editorEl}
            bind:value={activeBlockDraft}
            class="block-editor"
            rows={Math.max(2, block.rawLines.length)}
            spellcheck="false"
            onkeydown={handleEditorKeydown}
            onblur={() => commitActiveBlock()}
          ></textarea>
        </div>
      {:else}
        <div
          class="note-block rendered"
          class:readonly
          data-block-type={block.type}
          role="button"
          tabindex={readonly || !block.editable ? -1 : 0}
          aria-disabled={readonly || !block.editable}
          onclick={(event) => handleBlockClick(event, block)}
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
    gap: 6px;
    min-height: 100%;
    color: var(--note-text-color, var(--ws-text, #1f2937));
    font-family: "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.66;
  }

  .note-block {
    display: block;
    width: 100%;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    min-width: 0;
    background: transparent;
    transition:
      border-color 0.14s ease,
      background 0.14s ease;
  }

  .note-block.rendered:not(.readonly) {
    cursor: text;
  }

  .note-block.rendered:not(.readonly):hover {
    border-color: var(--ws-border-soft, #dbe4ef);
    background: color-mix(in srgb, var(--ws-btn-bg, #f8fafc) 46%, transparent);
  }

  .note-block.editing {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 52%, var(--ws-border-soft, #dbe4ef));
    background: color-mix(in srgb, var(--ws-badge-bg, #e8f0ff) 38%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .block-html {
    padding: 4px 6px;
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
    min-height: 72px;
    max-height: min(42vh, 320px);
    border: none;
    outline: none;
    resize: vertical;
    background: transparent;
    color: inherit;
    padding: 8px 10px;
    font: inherit;
    line-height: inherit;
    tab-size: 2;
  }

  .empty-block {
    border: 1px dashed var(--ws-border-soft, #dbe4ef);
    border-radius: 8px;
    background: transparent;
    color: var(--ws-muted, #64748b);
    min-height: 84px;
    text-align: left;
    padding: 10px;
  }
</style>
