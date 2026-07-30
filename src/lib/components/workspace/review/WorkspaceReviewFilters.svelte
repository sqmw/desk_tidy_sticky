<script>
  let {
    strings,
    rangeOptions = [],
    selectedRange = "",
    selectedTag = "",
    tagOptions = [],
    searchText = "",
    onSelectRange = () => {},
    onSelectTag = () => {},
    onChangeSearch = () => {},
    onClear = () => {},
  } = $props();

  const hasActiveFilters = $derived.by(() =>
    Boolean(
      String(selectedRange || "") !== "all" ||
        String(selectedTag || "").trim() ||
        String(searchText || "").trim(),
    ),
  );
</script>

<section class="review-filters">
  <div class="search-box">
    <span class="search-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <circle cx="11" cy="11" r="6.5"></circle>
        <path d="m20 20-4.4-4.4"></path>
      </svg>
    </span>
    <input
      type="text"
      class="filter-search"
      value={searchText}
      placeholder={strings.workspaceReviewFiltersSearchPlaceholder}
      aria-label={strings.workspaceReviewFiltersSearchLabel}
      oninput={(event) => onChangeSearch(event.currentTarget.value)}
    />
  </div>

  <select
    class="filter-select"
    value={selectedRange}
    aria-label={strings.workspaceReviewFiltersRangeLabel}
    onchange={(event) => onSelectRange(event.currentTarget.value)}
  >
    {#each rangeOptions as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>

  <select
    class="filter-select"
    value={selectedTag}
    aria-label={strings.workspaceReviewFiltersTagLabel}
    onchange={(event) => onSelectTag(event.currentTarget.value)}
  >
    <option value="">{strings.workspaceReviewFiltersTagAll}</option>
    {#each tagOptions as tag (tag)}
      <option value={tag}>{tag}</option>
    {/each}
  </select>

  {#if hasActiveFilters}
    <button type="button" class="clear-btn" onclick={() => onClear()}>
      {strings.workspaceReviewFiltersClear}
    </button>
  {/if}
</section>

<style>
  .review-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .search-box {
    position: relative;
    flex: 1 1 260px;
    min-width: 200px;
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

  .filter-search {
    width: 100%;
    min-height: 36px;
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 72%, transparent);
    color: var(--ws-text-strong, #101828);
    font-size: 13px;
    padding: 7px 10px 7px 33px;
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      box-shadow 0.16s ease;
  }

  .filter-search::placeholder {
    color: color-mix(in srgb, var(--ws-muted, #71809b) 82%, transparent);
  }

  .filter-search:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-border, #e3e9f2));
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .filter-select {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 180px;
    min-height: 36px;
    padding: 0 8px 0 12px;
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-card-bg, #ffffff) 72%, transparent);
    color: var(--ws-text, #3a4557);
    font-size: 12.5px;
    font-weight: 600;
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .filter-select:hover {
    border-color: var(--ws-border-hover, #cdd9ea);
  }

  .filter-select:focus-visible {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-border, #e3e9f2));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .clear-btn {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--ws-muted, #71809b);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease;
  }

  .clear-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 8%, transparent);
    color: var(--ws-accent, #2563eb);
  }

  .clear-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  @media (max-width: 640px) {
    .search-box {
      flex-basis: 100%;
    }
  }
</style>
