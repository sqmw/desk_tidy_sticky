<script>
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import NoteTagBar from "$lib/components/note/NoteTagBar.svelte";
  import BlockNoteContent from "$lib/components/note/BlockNoteContent.svelte";

  let {
    strings,
    note = null,
    draftText = $bindable(""),
    tagSuggestions = /** @type {string[]} */ ([]),
    formatDate,
    listCollapsed = false,
    onClose = () => {},
    onChangePriority = () => {},
    onChangeTags = () => {},
    onToggleTask = () => {},
    onAppendTask = () => {},
    onBlockTextChange = () => {},
    onStartResize = /** @type {(event: PointerEvent) => void} */ (() => {}),
    onResetWidth = /** @type {(event: MouseEvent) => void} */ (() => {}),
  } = $props();

  const reduceMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const drawerIn = { x: 24, duration: reduceMotion ? 0 : 200, easing: cubicOut };
  const drawerOut = { x: 24, duration: reduceMotion ? 0 : 150, easing: cubicOut };
</script>

{#if note}
  <aside
    class="inspector"
    class:expanded={listCollapsed}
    data-no-drag="true"
    in:fly={drawerIn}
    out:fly={drawerOut}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize-handle" onpointerdown={onStartResize} ondblclick={onResetWidth}></div>
    <header class="inspector-header">
      <div class="meta">{formatDate(note.updatedAt)}</div>
      <button
        type="button"
        class="close-btn"
        title={strings.close}
        aria-label={strings.close}
        onclick={() => onClose()}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="m6 6 12 12M18 6 6 18"></path>
        </svg>
      </button>
    </header>
    <div class="tagbar-wrap">
      <NoteTagBar
        {strings}
        isEditing={false}
        priority={note.priority ?? null}
        tags={Array.isArray(note.tags) ? note.tags : []}
        {tagSuggestions}
        onChangePriority={onChangePriority}
        onChangeTags={onChangeTags}
      />
    </div>

    <div class="content editor-content">
      <BlockNoteContent
        text={draftText}
        compact
        interactiveTasks
        editTrigger="click"
        placeholder={strings.noteEditorPlaceholder}
        onTextChange={onBlockTextChange}
        onToggleTask={onToggleTask}
        onAppendTask={onAppendTask}
      />
    </div>
  </aside>
{/if}

<style>
  .inspector {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    width: clamp(340px, var(--inspector-width, 430px), calc(100% - 56px));
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 94%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-lg, 16px);
    box-shadow: var(--ws-shadow-lg, 0 20px 48px rgba(15, 23, 42, 0.12));
    overflow: hidden;
  }

  .inspector.expanded {
    width: calc(100% - 12px);
  }

  .resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 12px;
    cursor: col-resize;
    z-index: 3;
    touch-action: none;
  }

  .resize-handle::after {
    content: "";
    position: absolute;
    left: 3px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 44px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-border-active, #94a3b8) 42%, transparent);
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  .resize-handle:hover::after {
    opacity: 1;
  }

  .inspector-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 8px 18px;
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 80%, transparent);
  }

  .meta {
    min-width: 0;
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    color: var(--ws-muted, #71809b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-btn {
    margin-left: auto;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-muted, #71809b);
    display: inline-grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease;
  }

  .close-btn:hover {
    background: color-mix(in srgb, #dc2626 10%, transparent);
    color: #dc2626;
  }

  .close-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .tagbar-wrap {
    flex: 0 0 auto;
    padding: 8px 18px 0;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 18px 14px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .content::-webkit-scrollbar-track {
    background: var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
    border-radius: 999px;
  }

  .content::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .editor-content {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 920px) {
    .inspector {
      width: calc(100% - 8px);
    }
  }
</style>
