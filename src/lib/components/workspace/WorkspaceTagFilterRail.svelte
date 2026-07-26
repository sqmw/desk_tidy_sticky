<script>
  let {
    strings,
    noteTags = [],
    selectedTag = "",
    taggedNoteCount = 0,
    onSetSelectedTag = () => {},
  } = $props();
</script>

<aside class="tag-filter-rail" aria-label={strings.workspaceTagsFilter}>
  <div class="tag-filter-head">
    <div class="tag-filter-title">{strings.workspaceTagsFilter}</div>
  </div>

  {#if noteTags.length === 0}
    <div class="tag-empty">{strings.workspaceTagsEmpty}</div>
  {:else}
    <div class="tag-list">
      <button
        type="button"
        class="tag-filter-btn"
        class:active={selectedTag === ""}
        onclick={() => onSetSelectedTag("")}
      >
        <span>{strings.workspaceTagsAll}</span>
        <span class="tag-count">{taggedNoteCount}</span>
      </button>
      {#each noteTags as item (item.tag)}
        <button
          type="button"
          class="tag-filter-btn"
          class:active={selectedTag === item.tag}
          onclick={() => onSetSelectedTag(item.tag)}
          title={`#${item.tag}`}
        >
          <span class="tag-name">#{item.tag}</span>
          <span class="tag-count">{item.count}</span>
        </button>
      {/each}
    </div>
  {/if}
</aside>

<style>
  .tag-filter-rail {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-left: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 62%, transparent);
    padding-left: 10px;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 8px;
    color: var(--ws-text, #334155);
  }

  .tag-filter-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .tag-filter-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .tag-empty {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.45;
    padding: 4px 0;
  }

  .tag-list {
    min-height: 0;
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 4px;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .tag-list::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .tag-list::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 78%, transparent);
    border-radius: 999px;
  }

  .tag-list::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .tag-filter-btn {
    min-width: 0;
    border: 1px solid transparent;
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    text-align: left;
    padding: 7px 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.16s ease, color 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tag-filter-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 7%, transparent);
  }

  .tag-filter-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .tag-filter-btn.active {
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 11%, transparent);
  }

  .tag-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-count {
    flex: 0 0 auto;
    min-width: 18px;
    text-align: right;
    color: var(--ws-muted, #71809b);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  @media (max-width: 920px) {
    .tag-filter-rail {
      border-left: none;
      border-top: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 62%, transparent);
      padding-left: 0;
      padding-top: 10px;
      max-height: 190px;
    }

  }
</style>
