<script>
  let {
    pointerDragActive = false,
    draggingNote = null,
    dragGhostTop = 0,
    dragGhostLeft = 0,
    dragGhostWidth = 0,
    dragGhostHeight = 0,
    priorityBadge = () => "",
    formatDate = () => "",
  } = $props();
</script>

{#if pointerDragActive && draggingNote}
  <div
    class="quadrant-drag-ghost"
    style={`top:${dragGhostTop}px;left:${dragGhostLeft}px;width:${Math.max(220, dragGhostWidth)}px;height:${Math.max(120, dragGhostHeight)}px;`}
  >
    <div class="ghost-inner">
      <div class="ghost-top">
        {#if priorityBadge(draggingNote.priority)}
          <span class="priority-tag">{priorityBadge(draggingNote.priority)}</span>
        {/if}
        <span class="date">{formatDate(draggingNote.updatedAt)}</span>
      </div>
      <div class="ghost-text" class:done={draggingNote.isDone}>{@html draggingNote.renderedHtml}</div>
    </div>
  </div>
{/if}

<style>
  .quadrant-drag-ghost {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    border-radius: 12px;
    border: 1px dashed var(--ws-border-active, #94a3b8);
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 82%, transparent);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24);
    backdrop-filter: blur(2px);
  }

  .ghost-inner {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    border: 1px dashed color-mix(in srgb, var(--ws-border-active, #94a3b8) 68%, transparent);
    padding: 9px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background:
      linear-gradient(
        100deg,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 8%, transparent) 20%,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 24%, transparent) 50%,
        color-mix(in srgb, var(--ws-border-active, #94a3b8) 8%, transparent) 80%
      );
    animation: ghost-sweep 1s linear infinite;
  }

  .ghost-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ghost-top .date {
    margin-left: auto;
  }

  .ghost-text {
    color: var(--ws-text-strong, #1f2937);
    font-size: 13px;
    line-height: 1.4;
    overflow: hidden;
    display: -webkit-box;
    line-clamp: 4;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }

  .ghost-text.done {
    text-decoration: line-through;
    color: var(--ws-muted, #94a3b8);
  }

  .priority-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-text, #334155);
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    padding: 3px 7px;
  }

  .date {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
    white-space: nowrap;
  }

  @keyframes ghost-sweep {
    0% {
      filter: brightness(0.96);
    }
    50% {
      filter: brightness(1.06);
    }
    100% {
      filter: brightness(0.96);
    }
  }
</style>

