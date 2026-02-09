<script>
  let {
    strings,
    viewMode,
    renderedNotes,
    formatDate,
    restoreNote,
    toggleArchive,
    deleteNote,
    openEdit,
    togglePin,
    toggleZOrder,
    toggleDone,
    updatePriority,
  } = $props();

  const QUADRANTS = [
    { key: 1, title: () => strings.quadrantQ1, subtitle: () => strings.quadrantQ1Desc },
    { key: 2, title: () => strings.quadrantQ2, subtitle: () => strings.quadrantQ2Desc },
    { key: 3, title: () => strings.quadrantQ3, subtitle: () => strings.quadrantQ3Desc },
    { key: 4, title: () => strings.quadrantQ4, subtitle: () => strings.quadrantQ4Desc },
  ];

  /** @param {number | undefined | null} p */
  function clampPriority(p) {
    return Math.max(1, Math.min(4, Number(p) || 4));
  }

  /** @param {number} p */
  function nextPriority(p) {
    const safe = clampPriority(p);
    return safe >= 4 ? 1 : safe + 1;
  }

  /** @param {number} p */
  function priorityBadge(p) {
    return `Q${clampPriority(p)}`;
  }

  /** @param {number} q */
  function quadrantNotes(q) {
    const safe = clampPriority(q);
    return renderedNotes.filter((/** @type {{ priority?: number }} */ n) => clampPriority(n.priority) === safe);
  }

  const totalCount = $derived(renderedNotes.length);
  const doneCount = $derived(renderedNotes.filter((/** @type {{ isDone?: boolean }} */ n) => !!n.isDone).length);
</script>

<section class="workbench">
  <div class="summary">
    <div class="summary-chip">{strings.workspaceTitle}</div>
    <div class="summary-chip">{totalCount} {strings.active.toLowerCase()}</div>
    <div class="summary-chip">{doneCount} {strings.markDone.toLowerCase()}</div>
  </div>

  {#if viewMode === "quadrant"}
    <div class="quadrant-board">
      {#each QUADRANTS as q (q.key)}
        <section class="quadrant-cell">
          <header class="quadrant-head">
            <h4>{q.title()}</h4>
            <p>{q.subtitle()}</p>
          </header>
          <div class="quadrant-list">
            {#if quadrantNotes(q.key).length === 0}
              <div class="empty">{strings.emptyInQuadrant}</div>
            {:else}
              {#each quadrantNotes(q.key) as note (note.id)}
                <article class="card">
                  <div class="card-top">
                    <span class="priority-tag">{priorityBadge(note.priority)}</span>
                    <span class="date">{formatDate(note.updatedAt)}</span>
                  </div>
                  <div class="card-body">
                    <div class="text" class:done={note.isDone}>{@html note.renderedHtml}</div>
                  </div>
                  <div class="actions">
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
                      class="action-btn priority"
                      title={`${strings.priority}: ${priorityBadge(note.priority)}`}
                      onclick={() => updatePriority(note, nextPriority(note.priority))}
                    >
                      {priorityBadge(note.priority)}
                    </button>
                  </div>
                </article>
              {/each}
            {/if}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <div class="grid">
      {#each renderedNotes as note (note.id)}
        <article class="card">
          <div class="card-top">
            <span class="priority-tag">{priorityBadge(note.priority)}</span>
            <span class="date">{formatDate(note.updatedAt)}</span>
          </div>
          <div class="card-body">
            <div class="text" class:done={note.isDone}>{@html note.renderedHtml}</div>
          </div>
          <div class="actions">
            {#if viewMode === "trash"}
              <button type="button" class="action-btn" title={strings.restore} onclick={() => restoreNote(note)}
                >{@render iconRestore()}</button
              >
              <button
                type="button"
                class="action-btn danger"
                title={strings.permanentlyDelete}
                onclick={() => deleteNote(note)}
              >
                {@render iconDelete()}
              </button>
            {:else}
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
                class="action-btn priority"
                title={`${strings.priority}: ${priorityBadge(note.priority)}`}
                onclick={() => updatePriority(note, nextPriority(note.priority))}
              >
                {priorityBadge(note.priority)}
              </button>
              {#if viewMode === "active"}
                <button
                  type="button"
                  class="action-btn"
                  title={note.isPinned ? strings.unpinNote : strings.pinNote}
                  onclick={() => togglePin(note)}
                >
                  {#if note.isPinned}
                    {@render iconPinFilled()}
                  {:else}
                    {@render iconPinOutline()}
                  {/if}
                </button>
                {#if note.isPinned}
                  <button
                    type="button"
                    class="action-btn"
                    title={note.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
                    onclick={() => toggleZOrder(note)}
                  >
                    {#if note.isAlwaysOnTop}
                      {@render iconLayerTop()}
                    {:else}
                      {@render iconLayerBottom()}
                    {/if}
                  </button>
                {/if}
              {/if}
              <button
                type="button"
                class="action-btn"
                title={note.isArchived ? strings.unarchive : strings.archive}
                onclick={() => toggleArchive(note)}
              >
                {#if note.isArchived}
                  {@render iconUnarchive()}
                {:else}
                  {@render iconArchive()}
                {/if}
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

{#snippet iconRestore()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"
    />
  </svg>
{/snippet}

{#snippet iconDelete()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
    />
  </svg>
{/snippet}

{#snippet iconArchive()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconUnarchive()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"
    />
  </svg>
{/snippet}

{#snippet iconEdit()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
    />
  </svg>
{/snippet}

{#snippet iconPinOutline()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z" />
  </svg>
{/snippet}

{#snippet iconPinFilled()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
  </svg>
{/snippet}

{#snippet iconCheckBoxOutline()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
    />
  </svg>
{/snippet}

{#snippet iconCheckBox()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
{/snippet}

{#snippet iconLayerTop()}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
    <rect x="5" y="15" width="14" height="4" rx="1.3"></rect>
    <path d="M12 5v7"></path>
    <path d="M9 9.8 12 12.8l3-3"></path>
  </svg>
{/snippet}

{#snippet iconLayerBottom()}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
    <rect x="5" y="5" width="14" height="4" rx="1.3"></rect>
    <path d="M12 19v-7"></path>
    <path d="M9 14.2 12 11.2l3 3"></path>
  </svg>
{/snippet}

<style>
  .workbench {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .summary {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .summary-chip {
    font-size: 11px;
    line-height: 1;
    color: var(--ws-text, #334155);
    border: 1px solid var(--ws-border-soft, #d7e1f0);
    background: var(--ws-btn-bg, linear-gradient(180deg, #fbfdff 0%, #f2f7ff 100%));
    border-radius: 999px;
    padding: 7px 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }

  .card {
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 12px;
    background: var(--ws-card-bg, linear-gradient(180deg, #ffffff 0%, #fbfdff 100%));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 176px;
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      border-color 0.16s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    border-color: #ccd9ea;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-body {
    min-height: 0;
    flex: 1;
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

  .text {
    color: var(--ws-text-strong, #1f2937);
    font-size: 14px;
    line-height: 1.45;
    max-height: 132px;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent);
    mask-image: linear-gradient(180deg, #000 78%, transparent);
  }

  .text :global(*) {
    margin: 0 0 4px;
    font-size: 13px;
    line-height: 1.4;
  }

  .text :global(ul),
  .text :global(ol) {
    padding-left: 16px;
  }

  .text :global(img) {
    display: block;
    max-width: 100%;
    max-height: 86px;
    width: auto;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--ws-border-soft, #e5eaf2);
    background: var(--ws-btn-bg, #f8fafc);
  }

  .text :global(pre) {
    overflow: hidden;
    border-radius: 6px;
    font-size: 12px;
  }

  .text :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .text.done {
    text-decoration: line-through;
    color: var(--ws-muted, #94a3b8);
  }

  .date {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
    white-space: nowrap;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .action-btn {
    border: 1px solid var(--ws-border-soft, #dbe3ef);
    border-radius: 6px;
    background: var(--ws-btn-bg, #f9fbff);
    color: var(--ws-text, #4b5563);
    font-size: 11px;
    padding: 4px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.16s ease;
  }

  .action-btn:hover {
    background: var(--ws-btn-hover, #eef3fb);
    border-color: var(--ws-border-hover, #c9d5e8);
    color: var(--ws-text-strong, #1f2937);
  }

  .action-btn.priority {
    font-weight: 700;
    width: auto;
    min-width: 30px;
    padding: 4px 7px;
    color: var(--ws-text, #334155);
  }

  .action-btn.danger {
    color: #b91c1c;
    border-color: #fecaca;
    background: #fef2f2;
  }

  .quadrant-board {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .quadrant-cell {
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 12px;
    background: var(--ws-card-bg, linear-gradient(180deg, #ffffff 0%, #fbfdff 100%));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 220px;
  }

  .quadrant-head h4 {
    margin: 0;
    font-size: 12px;
  }

  .quadrant-head p {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .quadrant-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
    min-height: 0;
    scrollbar-width: none;
  }

  .quadrant-list::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .empty {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
  }

  @media (max-width: 760px) {
    .quadrant-board {
      grid-template-columns: 1fr;
    }
  }
</style>
