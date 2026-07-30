<script>
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";

  let {
    strings,
    isMac = false,
    priority = null,
    tags = /** @type {string[]} */ ([]),
    tagSuggestions = /** @type {string[]} */ ([]),
    onExit = () => {},
    onChangePriority = () => {},
    onChangeTags = () => {},
  } = $props();
</script>

<div class="note-control-header" class:mac={isMac} class:windows={!isMac}>
  <button
    type="button"
    class="control-exit"
    onclick={() => onExit()}
    title={strings.noteFinishEditing}
    aria-label={strings.noteFinishEditing}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M6 6l12 12"></path>
      <path d="M18 6 6 18"></path>
    </svg>
  </button>

  <div class="tag-area">
    <NoteTagBar
      {strings}
      isEditing={true}
      isControlMode={true}
      priority={priority}
      {tags}
      {tagSuggestions}
      onChangePriority={onChangePriority}
      onChangeTags={onChangeTags}
    />
  </div>
</div>

<style>
  .note-control-header {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    box-sizing: border-box;
  }

  .note-control-header.windows {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .note-control-header.windows .control-exit {
    grid-column: 2;
  }

  .note-control-header.windows .tag-area {
    grid-column: 1;
    grid-row: 1;
  }

  .tag-area {
    min-width: 0;
  }

  .control-exit {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid color-mix(in srgb, white 54%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, #ff5f57 72%, white);
    color: rgba(122, 18, 18, 0.76);
    box-shadow: 0 5px 14px rgba(15, 23, 42, 0.11);
    cursor: pointer;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .note-control-header.windows .control-exit {
    border-radius: 6px;
  }

  .control-exit:hover {
    background: color-mix(in srgb, #ff5f57 82%, white);
  }

  .control-exit:focus-visible {
    outline: 2px solid rgba(29, 78, 216, 0.42);
    outline-offset: 1px;
  }

  .control-exit svg {
    width: 16px;
    height: 16px;
  }
</style>
