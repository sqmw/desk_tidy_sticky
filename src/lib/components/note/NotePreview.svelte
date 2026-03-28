<script>
  let { html = "" } = $props();
</script>

<div class="preview-text preview-markdown">{@html html}</div>

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
