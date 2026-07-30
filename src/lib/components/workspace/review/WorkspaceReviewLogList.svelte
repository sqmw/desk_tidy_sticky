<script>
  let {
    strings,
    records = [],
    isFiltered = false,
    selectedTag = "",
    onOpenCalendarDay = () => {},
    onOpenNote = () => {},
    onToggleDone = () => {},
    onSelectTag = () => {},
  } = $props();
</script>

<section class="log-list">
  {#if records.length === 0}
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8.4"></circle>
          <path d="m8.6 12.2 2.3 2.3 4.5-4.7"></path>
        </svg>
      </span>
      <h3>{isFiltered ? strings.workspaceReviewLogFilteredEmptyTitle : strings.workspaceReviewLogEmptyTitle}</h3>
      <p>{isFiltered ? strings.workspaceReviewLogFilteredEmptyBody : strings.workspaceReviewLogEmptyBody}</p>
    </div>
  {:else}
    <div class="timeline">
      {#each records as record (record.id)}
        <article class="record-row">
          <div class="record-head">
            <strong class="record-title">{record.title}</strong>
            <span class="record-source" class:is-note={record.source !== "done_log"}>
              {record.source === "done_log" ? strings.workspaceReviewRecordSourceDoneLog : strings.workspaceReviewRecordSourceDoneNote}
            </span>
            <span class="record-time" title={record.completedExactLabel}>{record.completedLabel}</span>
          </div>
          {#if record.excerpt}
            <p class="record-excerpt">{record.excerpt}</p>
          {/if}
          <div class="record-foot">
            {#if record.tags.length > 0}
              <div class="record-tags">
                {#each record.tags.slice(0, 4) as tag (tag)}
                  <button
                    type="button"
                    class="record-tag-btn"
                    class:active={selectedTag === tag}
                    onclick={() => onSelectTag(tag)}
                  >
                    #{tag}
                  </button>
                {/each}
              </div>
            {/if}
            <div class="record-actions">
              <button type="button" class="record-action-btn" onclick={() => onOpenCalendarDay(record.dateKey)}>
                {strings.workspaceReviewOpenCalendarDay}
              </button>
              <button type="button" class="record-action-btn accent" onclick={() => onOpenNote(record.note)}>
                {strings.workspaceReviewOpenSource}
              </button>
              <button type="button" class="record-action-btn" onclick={() => onToggleDone(record.note)}>
                {strings.markUndone}
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .log-list {
    display: grid;
    min-height: 0;
  }

  .empty-state {
    min-height: 240px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 6px;
    text-align: center;
    padding: 20px;
  }

  .empty-icon {
    display: inline-grid;
    place-items: center;
    width: 48px;
    height: 48px;
    margin-bottom: 4px;
    border-radius: var(--ws-radius-lg, 16px);
    color: var(--ws-muted, #71809b);
    background: color-mix(in srgb, var(--ws-muted, #71809b) 10%, transparent);
  }

  .empty-state h3,
  .empty-state p {
    margin: 0;
  }

  .empty-state h3 {
    color: var(--ws-text, #3a4557);
    font-size: 14px;
    font-weight: 700;
  }

  .empty-state p {
    max-width: 480px;
    color: var(--ws-muted, #71809b);
    font-size: 12.5px;
    line-height: 1.6;
  }

  .timeline {
    display: grid;
  }

  .record-row {
    position: relative;
    padding: 12px 10px 14px 30px;
    border-radius: var(--ws-radius-md, 12px);
    transition: background 0.16s ease;
  }

  /* Timeline rail: continuous line trimmed at the first/last node. */
  .record-row::before {
    content: "";
    position: absolute;
    left: 9px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 90%, transparent);
  }

  .record-row:first-child::before {
    top: 19px;
  }

  .record-row:last-child::before {
    bottom: calc(100% - 19px);
  }

  .record-row::after {
    content: "";
    position: absolute;
    left: 5px;
    top: 14px;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: var(--ws-card-bg, #ffffff);
    border: 2px solid color-mix(in srgb, var(--ws-accent, #2563eb) 55%, transparent);
    transition: border-color 0.16s ease;
  }

  .record-row:hover {
    background: color-mix(in srgb, var(--ws-muted, #71809b) 7%, transparent);
  }

  .record-row:hover::after {
    border-color: var(--ws-accent, #2563eb);
  }

  .record-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .record-title {
    color: var(--ws-text-strong, #101828);
    font-size: 14.5px;
    font-weight: 700;
    line-height: 1.35;
    min-width: 0;
  }

  .record-source {
    flex: 0 0 auto;
    align-self: center;
    white-space: nowrap;
    border-radius: 999px;
    padding: 2px 8px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 10%, transparent);
    color: var(--ws-muted, #71809b);
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1.4;
  }

  .record-source.is-note {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    color: var(--ws-accent, #2563eb);
  }

  .record-time {
    margin-left: auto;
    flex: 0 0 auto;
    color: var(--ws-muted, #71809b);
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .record-excerpt {
    margin: 6px 0 0;
    color: var(--ws-text, #3a4557);
    font-size: 13px;
    line-height: 1.6;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }

  .record-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
    min-height: 26px;
  }

  .record-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .record-tag-btn {
    border: none;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    color: color-mix(in srgb, var(--ws-accent, #2563eb) 52%, var(--ws-muted, #71809b));
    background: color-mix(in srgb, var(--ws-badge-bg, #e9f0ff) 72%, transparent);
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease;
  }

  .record-tag-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 14%, transparent);
    color: var(--ws-accent, #2563eb);
  }

  .record-tag-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .record-tag-btn.active {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 16%, transparent);
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .record-actions {
    margin-left: auto;
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    opacity: 0;
    transition: opacity 0.14s ease;
  }

  .record-row:hover .record-actions,
  .record-row:focus-within .record-actions {
    opacity: 1;
  }

  .record-action-btn {
    min-height: 26px;
    padding: 0 10px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.14s ease, color 0.14s ease;
  }

  .record-action-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 10%, transparent);
    color: var(--ws-text-strong, #101828);
  }

  .record-action-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
    opacity: 1;
  }

  .record-action-btn.accent {
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
  }

  .record-action-btn.accent:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 12%, transparent);
    color: var(--ws-accent, #2563eb);
  }
</style>
