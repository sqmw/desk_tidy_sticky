<script>
  let {
    strings,
    viewMode,
    renderedNotes = [],
    noteTags = () => [],
    formatDate = () => "",
    priorityBadge = () => "",
    priorityActionLabel = () => "",
    restoreNote = () => {},
    toggleArchive = () => {},
    deleteNote = () => {},
    openEdit = () => {},
    openView = () => {},
    togglePin = () => {},
    toggleZOrder = () => {},
    toggleWallpaperLayer = () => {},
    toggleDone = () => {},
    togglePriorityMenu = () => {},
  } = $props();
</script>

<div class="grid">
  {#each renderedNotes as note (note.id)}
    <article class="card" ondblclick={() => openView(note)}>
      <div class="card-top">
        {#if priorityBadge(note.priority)}
          <span class="priority-tag">{priorityBadge(note.priority)}</span>
        {/if}
        <span class="date">{formatDate(note.updatedAt)}</span>
      </div>
      <div class="card-body">
        <div class="text" class:done={note.isDone}>{@html note.renderedHtml}</div>
        {#if noteTags(note).length > 0}
          <div class="tag-row">
            {#each noteTags(note).slice(0, 4) as tag (tag)}
              <span class="tag-chip">#{tag}</span>
            {/each}
          </div>
        {/if}
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
          <div class="priority-wrap">
            <button
              type="button"
              class="action-btn priority"
              title={`${strings.priority}: ${priorityActionLabel(note.priority)}`}
              onclick={(e) =>
                togglePriorityMenu(
                  String(note.id),
                  /** @type {HTMLElement | null} */ (e.currentTarget instanceof HTMLElement ? e.currentTarget : null),
                )}
            >
              {priorityActionLabel(note.priority)}
            </button>
          </div>
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
              {#if !note.isAlwaysOnTop}
                <button
                  type="button"
                  class="action-btn"
                  class:active={note.isWallpaper}
                  title={note.isWallpaper ? strings.pinToDesktopLayer : strings.pinToWallpaper}
                  onclick={() => toggleWallpaperLayer(note)}
                >
                  {@render iconWallpaperLayer()}
                </button>
              {/if}
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
          <button
            type="button"
            class="action-btn danger"
            title={strings.delete}
            onclick={() => deleteNote(note)}
          >
            {@render iconDelete()}
          </button>
        {/if}
      </div>
    </article>
  {/each}
</div>

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

{#snippet iconWallpaperLayer()}
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
    <rect x="4.5" y="5" width="15" height="10" rx="2"></rect>
    <path d="M7 13l2.8-2.8 2.8 2.8 2.6-2.6 2.1 2.1"></path>
    <path d="M6 19h12"></path>
  </svg>
{/snippet}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
    grid-auto-rows: 168px;
  }

  .card {
    position: relative;
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 8px;
    background: var(--ws-card-bg, linear-gradient(180deg, #ffffff 0%, #fbfdff 100%));
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    height: 100%;
    overflow: hidden;
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
    justify-content: flex-start;
    gap: 8px;
  }

  .card-top .date {
    margin-left: auto;
  }

  .card-body {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .text :global(*) {
    margin: 0 0 3px;
    font-size: 13px;
    line-height: 1.4;
  }

  .text :global(h1),
  .text :global(h2),
  .text :global(h3),
  .text :global(h4),
  .text :global(h5),
  .text :global(h6) {
    font-weight: 800;
    color: var(--ws-text-strong, #111827);
    line-height: 1.22;
    margin: 0 0 5px;
  }

  .text :global(h1) {
    font-size: 16px;
  }

  .text :global(h2) {
    font-size: 15px;
  }

  .text :global(h3),
  .text :global(h4),
  .text :global(h5),
  .text :global(h6) {
    font-size: 14px;
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

  .tag-row {
    margin-top: auto;
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    overflow: hidden;
  }

  .tag-chip {
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-muted, #64748b);
    font-size: 10px;
    line-height: 1;
    padding: 4px 7px;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date {
    font-size: 11px;
    color: var(--ws-muted, #94a3b8);
    white-space: nowrap;
  }

  .actions {
    position: absolute;
    right: 8px;
    bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
    max-width: calc(100% - 16px);
    padding: 4px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe3ef) 72%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 88%, transparent);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    opacity: 0;
    pointer-events: none;
    transform: translateY(3px);
    transition:
      opacity 0.14s ease,
      transform 0.14s ease;
  }

  .card:hover .actions,
  .card:focus-within .actions {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
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

  .action-btn.active {
    color: var(--ws-accent-strong, #0f766e);
    background: color-mix(in srgb, var(--ws-accent-soft, rgba(45, 212, 191, 0.18)) 70%, white);
    border-color: color-mix(in srgb, var(--ws-accent, #14b8a6) 34%, rgba(148, 163, 184, 0.24));
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

  .priority-wrap {
    position: relative;
  }
</style>
