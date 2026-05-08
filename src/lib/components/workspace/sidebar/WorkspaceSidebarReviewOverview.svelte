<script>
  let {
    strings,
    collapsed = false,
  } = $props();

  const reviewItems = $derived([
    strings.workspaceReviewTabLog,
    strings.workspaceReviewTabCalendar,
    strings.workspaceReviewTabStats,
  ]);
</script>

<div class="block-title">{collapsed ? "•" : strings.workspaceReviewSidebarTitle}</div>
{#if collapsed}
  <div class="review-dots" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </div>
{:else}
  <div class="review-copy">
    <p>{strings.workspaceReviewSidebarHint}</p>
    <div class="review-pills">
      {#each reviewItems as item}
        <span class="review-pill">{item}</span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .review-copy {
    display: grid;
    gap: 10px;
  }

  .review-copy p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ws-muted, #64748b);
  }

  .review-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .review-pill {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 700;
  }

  .review-dots {
    display: grid;
    gap: 5px;
    justify-items: center;
    padding: 4px 0;
  }

  .review-dots span {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--ws-border-active, #94a3b8);
    opacity: 0.85;
  }
 </style>
