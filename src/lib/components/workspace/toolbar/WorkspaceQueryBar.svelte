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
  <div class="search-box">
    <span class="search-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="11" cy="11" r="6.5"></circle>
        <path d="m20 20-4.4-4.4"></path>
      </svg>
    </span>
    <input type="text" class="search" placeholder={strings.searchHint} bind:value={searchQuery} />
  </div>
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

  .search-box {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-grid;
    place-items: center;
    color: var(--ws-muted, #71809b);
    pointer-events: none;
  }

  .search {
    width: 100%;
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-md, 12px);
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 72%, transparent);
    color: var(--ws-text-strong, #101828);
    font-size: 13.5px;
    padding: 8px 10px 8px 33px;
    outline: none;
    min-width: 0;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      box-shadow 0.16s ease;
  }

  .search::placeholder {
    color: color-mix(in srgb, var(--ws-muted, #71809b) 82%, transparent);
  }

  .search:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-border, #e3e9f2));
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .query-bar.compact .search {
    min-height: 38px;
    padding-top: 7px;
    padding-bottom: 7px;
  }

  .tag-filter-btn {
    flex: 0 0 auto;
    min-height: 38px;
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-md, 12px);
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 72%, transparent);
    color: var(--ws-muted, #71809b);
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }

  .tag-filter-btn:hover,
  .tag-filter-btn.active {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 32%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 9%, transparent);
    color: var(--ws-accent, #2563eb);
  }

  .tag-filter-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .query-bar.compact .tag-filter-label {
    display: none;
  }
</style>
