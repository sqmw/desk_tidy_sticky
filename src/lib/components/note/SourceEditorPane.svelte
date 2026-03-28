<script>
  let {
    text = $bindable(""),
    editorEl = $bindable(null),
    placeholder = "",
    compact = false,
    showCommandSuggestions = false,
    commandSuggestionItems = [],
    commandActiveIndex = 0,
    onInput = () => {},
    onPaste = () => {},
    onKeydown = () => {},
    onApplyCommandSuggestion = () => {},
  } = $props();
</script>

<div class="editor-pane" class:compact>
  <div class="editor-shell" class:compact>
    <textarea
      bind:value={text}
      bind:this={editorEl}
      {placeholder}
      oninput={(event) => onInput(event)}
      onpaste={(event) => onPaste(event)}
      onkeydown={(event) => onKeydown(event)}
      class="editor"
      class:compact
      spellcheck="false"
    ></textarea>
  </div>

  {#if showCommandSuggestions && commandSuggestionItems.length > 0}
    <div class="command-popover">
      {#each commandSuggestionItems as cmd, idx (cmd.name)}
        <button
          class="command-item"
          class:active={idx === commandActiveIndex}
          onclick={() => onApplyCommandSuggestion(idx)}
          type="button"
        >
          <span class="command-name">{cmd.name}</span>
          <span class="command-preview">{cmd.preview}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .editor-pane {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .editor {
    flex: 1;
    background: transparent;
    border: none;
    resize: none;
    padding: 20px 20px 28px;
    font-family: "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
    font-size: 15.5px;
    line-height: 1.72;
    letter-spacing: 0.01em;
    outline: none;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    color: var(--note-text-color, #1f2937);
    caret-color: color-mix(in srgb, var(--note-text-color, #1f2937) 70%, #0f4c81);
    tab-size: 2;
  }

  .editor-shell {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .editor.compact {
    padding: 14px 16px 18px;
    font-size: 15px;
    line-height: 1.66;
  }

  .editor::placeholder {
    color: color-mix(in srgb, var(--note-text-color, #1f2937) 34%, transparent);
  }

  .editor::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .command-popover {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 14px;
    max-height: 180px;
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    background: color-mix(in srgb, white 94%, transparent);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
    z-index: 4;
    padding: 4px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .editor-pane.compact .command-popover {
    left: 12px;
    right: 12px;
    bottom: 10px;
  }

  .command-item {
    width: 100%;
    border: none;
    border-radius: 8px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    cursor: pointer;
    text-align: left;
  }

  .command-item:hover,
  .command-item.active {
    background: rgba(15, 76, 129, 0.1);
  }

  .command-name {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
  }

  .command-preview {
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: auto;
  }
</style>
