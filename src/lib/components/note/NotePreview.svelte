<script>
  let {
    html = "",
    interactiveTasks = false,
    onToggleTask = () => {},
    onAppendTask = () => {},
  } = $props();

  /** @param {MouseEvent} event */
  function handleClick(event) {
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

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === " " || event.key === "Enter") {
      handleClick(/** @type {any} */ (event));
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="preview-text preview-markdown"
  class:interactive-tasks={interactiveTasks}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {@html html}
</div>

<style>
  .preview-text {
    flex: 1;
    padding: 20px 20px 28px;
    font-family: "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
    font-size: 15.5px;
    line-height: 1.72;
    letter-spacing: 0.01em;
    color: var(--note-text-color, #1f2937);
    white-space: pre-wrap;
    word-break: break-word;
    overflow: auto;
    user-select: none;
    cursor: default;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .preview-text::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .preview-markdown :global(h1),
  .preview-markdown :global(h2),
  .preview-markdown :global(h3),
  .preview-markdown :global(h4),
  .preview-markdown :global(h5),
  .preview-markdown :global(h6) {
    margin: 0 0 12px;
    line-height: 1.24;
  }

  .preview-markdown :global(h1) {
    font-size: 1.42rem;
  }

  .preview-markdown :global(h2) {
    font-size: 1.24rem;
  }

  .preview-markdown :global(h3) {
    font-size: 1.12rem;
  }

  .preview-markdown :global(h4) {
    font-size: 0.92rem;
  }

  .preview-markdown :global(h5) {
    font-size: 0.88rem;
  }

  .preview-markdown :global(h6) {
    font-size: 0.84rem;
  }

  .preview-markdown :global(p) {
    margin: 0 0 12px;
  }

  .preview-markdown :global(ul),
  .preview-markdown :global(ol) {
    margin: 0 0 12px 20px;
    padding: 0;
  }

  .preview-markdown :global(blockquote) {
    margin: 0 0 12px;
    padding: 10px 14px;
    border-left: 3px solid rgba(15, 76, 129, 0.38);
    background: rgba(255, 255, 255, 0.34);
    border-radius: 10px;
  }

  .preview-markdown :global(hr) {
    border: none;
    height: 1px;
    background: rgba(55, 65, 81, 0.2);
    margin: 14px 0;
  }

  .preview-markdown :global(code) {
    font-family: Consolas, "Cascadia Code", monospace;
    background: rgba(15, 23, 42, 0.08);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 0.88em;
  }

  .preview-markdown :global(pre) {
    margin: 0 0 12px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.1);
    overflow: auto;
  }

  .preview-markdown :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .preview-markdown :global(table) {
    border-collapse: collapse;
    margin: 0 0 12px;
    width: 100%;
    font-size: 0.92em;
  }

  .preview-markdown :global(img) {
    max-width: 100%;
    height: auto;
    display: inline-block;
    vertical-align: middle;
    margin: 2px 4px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
  }

  .preview-markdown :global(th),
  .preview-markdown :global(td) {
    border: 1px solid rgba(55, 65, 81, 0.25);
    padding: 4px 6px;
  }

  .preview-markdown :global(th) {
    background: rgba(255, 255, 255, 0.45);
    text-align: left;
  }

  .preview-markdown :global(.task-block) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 6px;
    margin: 0 0 12px;
    padding: 7px 8px;
    border: 1px solid color-mix(in srgb, var(--note-text-color, #1f2937) 14%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, white 42%, transparent);
  }

  .preview-markdown :global(ul.task-list) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .preview-markdown :global(li.task-item) {
    min-height: 26px;
  }

  .preview-markdown :global(.task-row) {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    align-items: start;
    gap: 7px;
    min-width: 0;
  }

  .preview-markdown :global(.task-row input[type="checkbox"]) {
    width: 15px;
    height: 15px;
    margin: 4px 0 0;
    accent-color: #0f4c81;
  }

  .preview-markdown :global(.task-text) {
    min-width: 0;
    line-height: 1.58;
  }

  .preview-markdown :global(.task-item.is-done .task-text) {
    opacity: 0.68;
    text-decoration: line-through;
  }

  .preview-markdown :global(.task-add) {
    width: 24px;
    height: 24px;
    border: 1px solid color-mix(in srgb, var(--note-text-color, #1f2937) 16%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, white 58%, transparent);
    color: var(--note-text-color, #1f2937);
    font-size: 17px;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0;
  }

  .preview-markdown :global(.task-add:hover) {
    background: color-mix(in srgb, #0f4c81 12%, white);
    border-color: color-mix(in srgb, #0f4c81 36%, transparent);
  }

  .preview-markdown:not(.interactive-tasks) :global(.task-add) {
    display: none;
  }

  .preview-markdown.interactive-tasks :global(.task-row input[type="checkbox"]) {
    cursor: pointer;
  }
</style>
