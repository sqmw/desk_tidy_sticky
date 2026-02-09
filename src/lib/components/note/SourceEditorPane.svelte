<script>
  let {
    text = $bindable(""),
    editorEl = $bindable(null),
    showCommandSuggestions = false,
    commandSuggestionItems = [],
    commandActiveIndex = 0,
    onInput = () => {},
    onPaste = () => {},
    onKeydown = () => {},
    onApplyCommandSuggestion = () => {},
  } = $props();
</script>

<div class="editor-shell">
  <textarea
    bind:value={text}
    bind:this={editorEl}
    oninput={(event) => onInput(event)}
    onpaste={(event) => onPaste(event)}
    onkeydown={(event) => onKeydown(event)}
    class="editor"
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

<style>
  .editor {
    flex: 1;
    background: transparent;
    border: none;
    resize: none;
    padding: 16px;
    font-family: "Segoe UI", sans-serif;
    font-size: 16px;
    outline: none;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    color: var(--note-text-color, #1f2937);
  }

  .editor-shell {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .editor::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .command-popover {
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 62px;
    max-height: 180px;
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.22);
    z-index: 4;
    padding: 4px;
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
