<script>
  let {
    strings,
    searchQuery = $bindable(""),
    sortMode,
    sortModes = [],
    onSetSortMode = () => {},
  } = $props();
</script>

<div class="query-bar">
  <input type="text" class="search" placeholder={strings.searchHint} bind:value={searchQuery} />
  <select class="sort" value={sortMode} onchange={(e) => onSetSortMode(/** @type {HTMLSelectElement} */ (e.target).value)}>
    {#each sortModes as mode}
      <option value={mode}>
        {mode === "newest" ? strings.sortByNewest : mode === "oldest" ? strings.sortByOldest : strings.sortByCustom}
      </option>
    {/each}
  </select>
</div>

<style>
  .query-bar {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto;
    gap: 8px;
    min-width: 0;
    align-items: stretch;
  }

  .search,
  .sort {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
    min-width: 0;
  }

  .sort {
    min-width: 96px;
  }

  @media (max-width: 920px) {
    .query-bar {
      grid-template-columns: 1fr;
    }
  }
</style>
