<script>
  let {
    strings,
    compact = false,
    searchQuery = $bindable(""),
    selectedTag = "",
    tagFilterOpen = false,
    onToggleTagFilter = () => {},
  } = $props();
</script>

<div class="query-bar" class:compact>
  <input type="text" class="search" placeholder={strings.searchHint} bind:value={searchQuery} />
  <button
    type="button"
    class="tag-filter-btn"
    class:active={tagFilterOpen || !!selectedTag}
    title={strings.workspaceTagsFilter}
    aria-label={strings.workspaceTagsFilter}
    aria-pressed={tagFilterOpen}
    onclick={() => onToggleTagFilter()}
  >
    <span aria-hidden="true">#</span>
    <span class="tag-filter-label">{strings.workspaceTagsFilter}</span>
  </button>
</div>

<style>
  .query-bar {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    min-width: 0;
    align-items: center;
  }

  .query-bar.compact {
    gap: 6px;
  }

  .search {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
    min-width: 0;
  }

  .query-bar.compact .search {
    min-height: 38px;
    padding: 8px 10px;
  }

  .search {
    flex: 1 1 auto;
  }

  .tag-filter-btn {
    flex: 0 0 auto;
    min-height: 38px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 62%, transparent);
    border-radius: 999px;
    background: transparent;
    color: var(--ws-muted, #64748b);
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }

  .tag-filter-btn:hover,
  .tag-filter-btn.active {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 9%, transparent);
    color: var(--ws-text-strong, #0f172a);
  }

  .query-bar.compact .tag-filter-label {
    display: none;
  }
</style>
