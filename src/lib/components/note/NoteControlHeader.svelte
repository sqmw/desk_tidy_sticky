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
      external={true}
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
    width: max-content;
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.78);
    box-shadow:
      0 8px 24px rgba(15, 23, 42, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(18px) saturate(1.14);
    -webkit-backdrop-filter: blur(18px) saturate(1.14);
    transform-origin: bottom center;
    animation: control-header-enter 180ms cubic-bezier(0.2, 0.78, 0.2, 1) both;
  }

  .note-control-header.windows {
    flex-direction: row-reverse;
  }

  .tag-area {
    min-width: 0;
    max-width: 462px;
  }

  .control-exit {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(185, 28, 28, 0.16);
    border-radius: 999px;
    background: rgba(254, 226, 226, 0.9);
    color: #9f2b2b;
    box-shadow: none;
    cursor: pointer;
  }

  .note-control-header.windows .control-exit {
    border-radius: 6px;
  }

  .control-exit:hover {
    background: rgba(254, 202, 202, 0.94);
  }

  .control-exit:focus-visible {
    outline: 2px solid rgba(29, 78, 216, 0.42);
    outline-offset: 1px;
  }

  .control-exit svg {
    width: 15px;
    height: 15px;
  }

  @keyframes control-header-enter {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .note-control-header {
      animation: none;
    }
  }
</style>
