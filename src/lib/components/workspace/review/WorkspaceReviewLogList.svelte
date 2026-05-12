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
      <h3>{isFiltered ? strings.workspaceReviewLogFilteredEmptyTitle : strings.workspaceReviewLogEmptyTitle}</h3>
      <p>{isFiltered ? strings.workspaceReviewLogFilteredEmptyBody : strings.workspaceReviewLogEmptyBody}</p>
    </div>
  {:else}
    {#each records as record (record.id)}
      <article
        class="record-card"
      >
        <div class="record-head">
          <div class="record-title-wrap">
            <strong>{record.title}</strong>
            <span title={record.completedExactLabel}>{record.completedLabel}</span>
          </div>
          <span class="record-source">
            {record.source === "done_log" ? strings.workspaceReviewRecordSourceDoneLog : strings.workspaceReviewRecordSourceDoneNote}
          </span>
        </div>
        {#if record.excerpt}
          <p>{record.excerpt}</p>
        {/if}
        {#if record.tags.length > 0}
          <div class="record-tags">
            {#each record.tags.slice(0, 4) as tag (tag)}
              <button
                type="button"
                class="record-tag-btn"
                class:active={selectedTag === tag}
                onclick={() => onSelectTag(tag)}
              >
                {tag}
              </button>
            {/each}
          </div>
        {/if}
        <div class="record-actions">
          <button type="button" class="record-action-btn secondary" onclick={() => onOpenCalendarDay(record.dateKey)}>
            {strings.workspaceReviewOpenCalendarDay}
          </button>
          <button type="button" class="record-action-btn primary" onclick={() => onOpenNote(record.note)}>
            {strings.workspaceReviewOpenSource}
          </button>
          <button type="button" class="record-action-btn subtle" onclick={() => onToggleDone(record.note)}>
            {strings.markUndone}
          </button>
        </div>
      </article>
    {/each}
  {/if}
</section>

<style>
  .log-list {
    display: grid;
    gap: 10px;
    min-height: 0;
  }

  .empty-state,
  .record-card {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 16px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 96%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 72%, transparent),
      0 8px 18px color-mix(in srgb, #0f172a 6%, transparent);
  }

  .empty-state {
    min-height: 240px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    text-align: center;
    padding: 20px;
  }

  .empty-state h3,
  .empty-state p {
    margin: 0;
  }

  .empty-state h3 {
    color: var(--ws-text-strong, #0f172a);
    font-size: 18px;
  }

  .empty-state p {
    max-width: 520px;
    color: var(--ws-muted, #64748b);
    line-height: 1.6;
  }

  .record-card {
    position: relative;
    padding: 14px 16px;
    text-align: left;
    transition:
      border-color 0.16s ease,
      transform 0.16s ease,
      box-shadow 0.16s ease,
      background 0.16s ease;
  }

  .record-card:hover {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-hover, #c6d5e8));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 4%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86))),
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 1%, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)))
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 74%, transparent),
      0 14px 26px color-mix(in srgb, var(--ws-accent, #1d4ed8) 9%, transparent);
    transform: translateY(-2px);
  }

  .record-card:hover::after {
    content: "";
    position: absolute;
    inset: 14px auto 14px 0;
    width: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 78%, #ffffff);
  }

  .record-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .record-title-wrap {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .record-title-wrap strong {
    color: var(--ws-text-strong, #0f172a);
    font-size: 16px;
    line-height: 1.35;
    transition: color 0.16s ease;
  }

  .record-card:hover .record-title-wrap strong {
    color: var(--ws-accent-strong, #163ea8);
  }

  .record-title-wrap span,
  .record-source {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
  }

  .record-source {
    white-space: nowrap;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 999px;
    padding: 4px 8px;
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 92%, transparent);
    transition:
      border-color 0.16s ease,
      color 0.16s ease,
      background 0.16s ease;
  }

  .record-card:hover .record-source {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, var(--ws-border-soft, #d9e2ef));
    color: var(--ws-accent-strong, #163ea8);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 8%, #ffffff);
  }

  .record-card p {
    margin: 10px 0 0;
    color: var(--ws-text, #334155);
    line-height: 1.65;
  }

  .record-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .record-tag-btn {
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-accent, #1d4ed8);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, var(--ws-border-soft, #d9e2ef));
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;
  }

  .record-tag-btn:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 28%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, #fff);
  }

  .record-tag-btn.active {
    color: var(--ws-accent-strong, #163ea8);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, #ffffff);
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 32%, var(--ws-border-soft, #d9e2ef));
  }

  .record-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .record-action-btn {
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 94%, transparent);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 76%, transparent);
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;
  }

  .record-card:hover .record-action-btn:not(.primary) {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 4%, #ffffff);
  }

  .record-action-btn.primary {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 34%, var(--ws-border-soft, #d9e2ef));
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 88%, #ffffff),
      color-mix(in srgb, var(--ws-accent-strong, #163ea8) 92%, #ffffff)
    );
    color: #ffffff;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent),
      0 8px 18px color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, transparent);
  }

  .record-action-btn.secondary {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, var(--ws-border-soft, #d9e2ef));
    color: var(--ws-accent-strong, #163ea8);
  }

  .record-action-btn.subtle {
    border-color: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 92%, transparent);
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 92%, transparent);
    color: color-mix(in srgb, var(--ws-muted, #64748b) 86%, var(--ws-text, #334155));
  }
</style>
