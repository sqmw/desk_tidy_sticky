<script>
  import { buildQuadrants, filterNotesByQuadrant, nextPriority, priorityBadge } from "$lib/panel/note-priority.js";

  let {
    strings,
    renderedNotes = [],
    formatDate,
    openEdit,
    toggleDone,
    updatePriority,
  } = $props();

  const quadrants = $derived(buildQuadrants(strings));

  /** @param {number} quadrant */
  function quadrantNotes(quadrant) {
    return filterNotesByQuadrant(renderedNotes, quadrant);
  }

  /** @param {number | undefined | null} priority */
  function priorityActionLabel(priority) {
    const badge = priorityBadge(priority);
    return badge || strings.priorityUnassigned;
  }
</script>

<div class="quadrant-board">
  {#each quadrants as quadrant (quadrant.key)}
    <section class="quadrant-cell">
      <header class="quadrant-head">
        <h4>{quadrant.title}</h4>
        <p>{quadrant.subtitle}</p>
      </header>
      <div class="quadrant-list">
        {#if quadrantNotes(quadrant.key).length === 0}
          <div class="quadrant-empty">{strings.emptyInQuadrant}</div>
        {:else}
          {#each quadrantNotes(quadrant.key) as note (note.id)}
            <div class="quadrant-note" role="listitem">
              <div class="note-content">
                <div class="note-text rendered" class:done={note.isDone}>{@html note.renderedHtml}</div>
                <span class="note-date">{formatDate(note.updatedAt)}</span>
              </div>
              <div class="note-actions">
                <button type="button" class="action-btn" title={strings.edit} onclick={() => openEdit(note)}
                  >{@render iconEdit()}</button
                >
                <button
                  type="button"
                  class="action-btn"
                  title={note.isDone ? strings.markUndone : strings.markDone}
                  onclick={() => toggleDone(note)}
                >
                  {#if note.isDone}
                    {@render iconCheckBox()}
                  {:else}
                    {@render iconCheckBoxOutline()}
                  {/if}
                </button>
                <button
                  type="button"
                  class="action-btn priority-btn"
                  title={`${strings.priority}: ${priorityActionLabel(note.priority)}`}
                  onclick={() => updatePriority(note, nextPriority(note.priority))}
                >
                  {priorityActionLabel(note.priority)}
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  {/each}
</div>

{#snippet iconEdit()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBoxOutline()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBox()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
{/snippet}

<style>
  .quadrant-board {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    scrollbar-width: thin;
    scrollbar-color: #aeb7c4 transparent;
  }

  .quadrant-board::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  .quadrant-board::-webkit-scrollbar-track {
    background: transparent;
  }

  .quadrant-board::-webkit-scrollbar-thumb {
    background: rgba(120, 130, 145, 0.72);
    border-radius: 999px;
  }

  .quadrant-board::-webkit-scrollbar-thumb:hover {
    background: rgba(95, 105, 120, 0.82);
  }

  .quadrant-cell {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #e4e8ef;
    border-radius: 10px;
    padding: 8px;
    min-height: 160px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .quadrant-head h4 {
    margin: 0;
    font-size: 12px;
    color: #1f2937;
  }

  .quadrant-head p {
    margin: 2px 0 0;
    font-size: 10px;
    color: #64748b;
  }

  .quadrant-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    overflow: auto;
    scrollbar-width: none;
  }

  .quadrant-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .quadrant-empty {
    font-size: 11px;
    color: #94a3b8;
    padding: 6px 2px;
  }

  .quadrant-note {
    border: 1px solid #e6ebf3;
    border-radius: 8px;
    background: #fff;
    padding: 8px;
    display: flex;
    gap: 6px;
    justify-content: space-between;
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-text.rendered {
    display: block;
    max-height: 62px;
    overflow: hidden;
  }

  .note-text.rendered :global(*) {
    margin: 0;
    font-size: 13px;
    line-height: 1.35;
  }

  .note-text.rendered :global(ul),
  .note-text.rendered :global(ol) {
    padding-left: 16px;
  }

  .note-text.rendered :global(p + p),
  .note-text.rendered :global(li + li) {
    margin-top: 2px;
  }

  .note-text.done {
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
    text-decoration-color: #9aa3af;
    color: #8a92a0;
  }

  .note-date {
    font-size: 11px;
    color: #9aa3af;
    margin-top: 6px;
    display: block;
  }

  .note-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 8px;
  }

  .action-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 4px;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #f0f2f5;
    color: #333;
    border-color: #e4e7ed;
  }

  .action-btn.priority-btn {
    width: auto;
    min-width: 28px;
    font-size: 10px;
    font-weight: 700;
    color: #334155;
    border-color: #dbe3ee;
  }

  @media (max-width: 760px) {
    .quadrant-board {
      grid-template-columns: 1fr;
    }
  }
</style>
