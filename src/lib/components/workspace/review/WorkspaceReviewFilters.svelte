<script>
  let {
    strings,
    rangeOptions = [],
    selectedRange = "",
    selectedTag = "",
    tagOptions = [],
    searchText = "",
    matchedCount = 0,
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
  <div class="filters-main">
    <label class="filter-field filter-search">
      <span>{strings.workspaceReviewFiltersSearchLabel}</span>
      <input
        type="text"
        value={searchText}
        placeholder={strings.workspaceReviewFiltersSearchPlaceholder}
        oninput={(event) => onChangeSearch(event.currentTarget.value)}
      />
    </label>

    <label class="filter-field filter-select">
      <span>{strings.workspaceReviewFiltersRangeLabel}</span>
      <select value={selectedRange} onchange={(event) => onSelectRange(event.currentTarget.value)}>
        {#each rangeOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>

    <label class="filter-field filter-select">
      <span>{strings.workspaceReviewFiltersTagLabel}</span>
      <select value={selectedTag} onchange={(event) => onSelectTag(event.currentTarget.value)}>
        <option value="">{strings.workspaceReviewFiltersTagAll}</option>
        {#each tagOptions as tag (tag)}
          <option value={tag}>{tag}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="filters-meta">
    <span class="result-count">{matchedCount} {strings.workspaceReviewFiltersResultCountSuffix}</span>
    {#if hasActiveFilters}
      <button type="button" class="clear-btn" onclick={() => onClear()}>
        {strings.workspaceReviewFiltersClear}
      </button>
    {/if}
  </div>
</section>

<style>
  .review-filters {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 16px;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, #ffffff) 0%,
        color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.86)) 98%, transparent) 100%
      );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 8px 20px color-mix(in srgb, var(--ws-accent, #1d4ed8) 5%, transparent);
  }

  .filters-main {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(180px, 0.7fr));
    gap: 10px;
  }

  .filter-field {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .filter-field span {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
  }

  .filter-field input,
  .filter-field select {
    min-width: 0;
    min-height: 42px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.92)) 98%, transparent);
    color: var(--ws-text, #334155);
    font-size: 13px;
    outline: none;
    box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent);
  }

  .filter-field input:focus,
  .filter-field select:focus {
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 32%, var(--ws-border-soft, #d9e2ef));
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 88%, transparent),
      0 0 0 3px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .filters-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .result-count {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    font-weight: 700;
  }

  .clear-btn {
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 980px) {
    .filters-main {
      grid-template-columns: 1fr;
    }

    .filters-meta {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
