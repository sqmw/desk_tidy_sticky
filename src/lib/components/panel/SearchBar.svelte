<script>
  let {
    strings,
    searchQuery = $bindable(),
  } = $props();
</script>

<div class="search-row" data-tauri-drag-region="false">
  <div class="search-container">
    <svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path
        d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
    <input type="text" class="search-input" placeholder={strings.searchHint} bind:value={searchQuery} />
    {#if searchQuery.trim()}
      <button type="button" class="search-clear" onclick={() => (searchQuery = "")} title={strings.clear}>✕</button>
    {/if}
  </div>
</div>

<style>
  .search-row {
    margin-top: 6px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
  }

  .search-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: #909399;
    pointer-events: none;
  }

  .search-input {
    flex: 1;
    padding: 6px 12px 6px 30px;
    font-size: 13px;
    border: 1px solid var(--divider);
    border-radius: 16px;
    background: #fff;
    user-select: text;
    transition: all 0.2s;
    outline: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  }

  .search-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(58, 111, 247, 0.1);
  }

  .search-clear {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
    color: #bbb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-clear:hover {
    color: #666;
  }
</style>
