<script>
  let {
    strings,
    searchQuery = $bindable(""),
  } = $props();
</script>

<div class="query-bar">
  <input type="text" class="search" placeholder={strings.searchHint} bind:value={searchQuery} />
</div>

<style>
  .query-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    align-items: center;
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

  .search {
    flex: 1 1 100%;
  }
</style>
