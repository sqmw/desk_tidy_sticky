<script>
  let {
    strings,
    records = [],
    selectedRecordId = "",
    onSelect = () => {},
    onOpenNote = () => {},
  } = $props();
</script>

<section class="log-list">
  {#if records.length === 0}
    <div class="empty-state">
      <h3>{strings.workspaceReviewLogEmptyTitle}</h3>
      <p>{strings.workspaceReviewLogEmptyBody}</p>
    </div>
  {:else}
    {#each records as record (record.id)}
      <button
        type="button"
        class="record-card"
        class:selected={selectedRecordId === record.id}
        onclick={() => onSelect(record.id)}
        ondblclick={() => onOpenNote(record.note)}
      >
        <div class="record-head">
          <div class="record-title-wrap">
            <strong>{record.title}</strong>
            <span>{record.completedLabel}</span>
          </div>
          <span class="record-source">
            {record.source === "done_log" ? strings.workspaceReviewRecordSourceDoneLog : strings.workspaceReviewRecordSourceDoneNote}
          </span>
        </div>
        <p>{record.excerpt}</p>
        {#if record.tags.length > 0}
          <div class="record-tags">
            {#each record.tags.slice(0, 4) as tag (tag)}
              <span>{tag}</span>
            {/each}
          </div>
        {/if}
      </button>
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
    padding: 14px 16px;
    text-align: left;
    transition:
      border-color 0.16s ease,
      transform 0.16s ease,
      box-shadow 0.16s ease,
      background 0.16s ease;
  }

  .record-card:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    transform: translateY(-1px);
  }

  .record-card.selected {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 34%, var(--ws-border, #dbe5f2));
    background:
      radial-gradient(circle at 100% 0, color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent), transparent 38%),
      color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.9)) 98%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 78%, transparent),
      0 12px 24px color-mix(in srgb, #1d4ed8 10%, transparent);
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

  .record-tags span {
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-accent, #1d4ed8);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #fff);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 18%, var(--ws-border-soft, #d9e2ef));
  }
</style>
