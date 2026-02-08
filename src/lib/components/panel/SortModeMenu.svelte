<script>
  let {
    strings,
    sortMode,
    isSortMenuOpen = $bindable(),
    setSortMode,
  } = $props();

  /** @param {"custom" | "newest" | "oldest"} mode */
  function applySortMode(mode) {
    setSortMode(mode);
    isSortMenuOpen = false;
  }
</script>

<div class="sort-dropdown">
  <button
    type="button"
    class="sort-trigger"
    onclick={() => (isSortMenuOpen = !isSortMenuOpen)}
    title={strings.sortMode}
  >
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="sort-icon">
      <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
    </svg>
    <span class="sort-label">
      {sortMode === "custom"
        ? strings.sortByCustom
        : sortMode === "newest"
          ? strings.sortByNewest
          : strings.sortByOldest}
    </span>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="sort-arrow">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  </button>

  {#if isSortMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sort-menu-overlay" onclick={() => (isSortMenuOpen = false)}></div>
    <div class="sort-menu">
      <button class="sort-item" class:selected={sortMode === "custom"} onclick={() => applySortMode("custom")}>
        {strings.sortByCustom}
      </button>
      <button class="sort-item" class:selected={sortMode === "newest"} onclick={() => applySortMode("newest")}>
        {strings.sortByNewest}
      </button>
      <button class="sort-item" class:selected={sortMode === "oldest"} onclick={() => applySortMode("oldest")}>
        {strings.sortByOldest}
      </button>
    </div>
  {/if}
</div>

<style>
  .sort-dropdown {
    position: relative;
    flex-shrink: 0;
  }

  .sort-trigger {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1px solid var(--divider);
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    user-select: none;
    height: 22px;
  }

  .sort-trigger:hover {
    border-color: #bbb;
    background: #fafafa;
  }

  .sort-icon {
    opacity: 0.7;
    margin-right: 4px;
  }

  .sort-label {
    font-size: 10px;
    color: var(--neutral);
    margin-right: 2px;
  }

  .sort-arrow {
    opacity: 0.5;
  }

  .sort-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: #fff;
    border: 1px solid var(--divider);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 100px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sort-menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 99;
    cursor: default;
  }

  .sort-item {
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 8px;
    font-size: 11px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--neutral);
    display: block;
    width: 100%;
  }

  .sort-item:hover {
    background: var(--surface);
  }

  .sort-item.selected {
    background: rgba(58, 111, 247, 0.1);
    color: var(--primary);
    font-weight: 600;
  }
</style>
