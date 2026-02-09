<script>
  let { html = "" } = $props();
</script>

<div class="preview-text preview-markdown">{@html html}</div>

<style>
  .preview-text {
    flex: 1;
    padding: 16px;
    font-family: "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.4;
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
  .preview-markdown :global(h3) {
    margin: 0 0 8px;
    line-height: 1.3;
  }

  .preview-markdown :global(h1) {
    font-size: 1.15rem;
  }

  .preview-markdown :global(h2) {
    font-size: 1.05rem;
  }

  .preview-markdown :global(h3) {
    font-size: 0.98rem;
  }

  .preview-markdown :global(p) {
    margin: 0 0 8px;
  }

  .preview-markdown :global(ul),
  .preview-markdown :global(ol) {
    margin: 0 0 8px 18px;
    padding: 0;
  }

  .preview-markdown :global(blockquote) {
    margin: 0 0 8px;
    padding: 4px 10px;
    border-left: 3px solid rgba(15, 76, 129, 0.38);
    background: rgba(255, 255, 255, 0.28);
    border-radius: 4px;
  }

  .preview-markdown :global(hr) {
    border: none;
    height: 1px;
    background: rgba(55, 65, 81, 0.2);
    margin: 8px 0;
  }

  .preview-markdown :global(code) {
    font-family: Consolas, "Cascadia Code", monospace;
    background: rgba(15, 23, 42, 0.08);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 0.88em;
  }

  .preview-markdown :global(pre) {
    margin: 0 0 8px;
    padding: 8px;
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
    margin: 0 0 8px;
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

  .preview-markdown :global(ul.task-list) {
    list-style: none;
    margin-left: 0;
  }

  .preview-markdown :global(li.task-item) {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .preview-markdown :global(li.task-item input[type="checkbox"]) {
    margin-top: 2px;
    accent-color: #0f4c81;
  }
</style>
