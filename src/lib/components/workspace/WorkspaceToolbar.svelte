<script>
  let {
    strings,
    newNoteText = $bindable(),
    searchQuery = $bindable(),
    sortMode,
    sortModes,
    onSave,
    onSetSortMode,
  } = $props();
</script>

<div class="toolbar">
  <input
    type="text"
    class="add-input"
    placeholder={strings.workspaceQuickNoteHint || strings.inputHint}
    bind:value={newNoteText}
    onkeydown={(e) => e.key === "Enter" && onSave()}
  />
  <button type="button" class="primary-btn" onclick={onSave}>{strings.workspaceCreateNote || strings.saveNote}</button>
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
  .toolbar {
    display: grid;
    grid-template-columns: minmax(200px, 1fr) auto minmax(220px, 1fr) auto;
    gap: 8px;
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    padding: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.75)) 90%, transparent);
    backdrop-filter: blur(8px);
    align-items: stretch;
  }

  .add-input,
  .search,
  .sort {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
  }

  .primary-btn {
    border: 1px solid var(--ws-border-active, #2f4368);
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    transition: transform 0.15s ease;
    min-width: 84px;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 920px) {
    .toolbar {
      grid-template-columns: 1fr;
    }
  }
</style>
