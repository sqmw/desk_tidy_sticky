<script>
  import {
    WORKSPACE_NOTE_VIEW_ACTIVE,
    WORKSPACE_NOTE_VIEW_ARCHIVED,
    WORKSPACE_NOTE_VIEW_QUADRANT,
    WORKSPACE_NOTE_VIEW_TODO,
    WORKSPACE_NOTE_VIEW_TRASH,
    getWorkspaceViewModeLabel,
  } from "$lib/workspace/workspace-tabs.js";

  let {
    strings,
    collapsed = false,
    compact = false,
    manualLayoutEnabled = false,
    blockStyle = "",
    sectionCollapsed = false,
    viewModes = [],
    viewMode,
    noteViewCounts = {},
    noteTags = [],
    selectedTag = "",
    taggedNoteCount = 0,
    onToggleSectionCollapsed = () => {},
    onSetViewMode = () => {},
    onSetSelectedTag = () => {},
  } = $props();

  const PRIMARY_VIEW_MODES = [WORKSPACE_NOTE_VIEW_ACTIVE, WORKSPACE_NOTE_VIEW_TODO, WORKSPACE_NOTE_VIEW_QUADRANT];
  const SECONDARY_VIEW_MODES = [WORKSPACE_NOTE_VIEW_ARCHIVED, WORKSPACE_NOTE_VIEW_TRASH];
  const primaryViewModes = $derived(
    viewModes.filter((/** @type {string} */ mode) => PRIMARY_VIEW_MODES.includes(mode)),
  );
  const secondaryViewModes = $derived(
    viewModes.filter((/** @type {string} */ mode) => SECONDARY_VIEW_MODES.includes(mode)),
  );

  /** @param {string} mode */
  function viewCount(mode) {
    const value = Number(noteViewCounts?.[mode] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  /** @param {boolean} value */
  function sectionToggleIcon(value) {
    return value ? "▸" : "▾";
  }

</script>

<div
  class="note-filters-block"
  class:collapsed
  class:compact
  class:manual-layout={manualLayoutEnabled}
  style={blockStyle}
>
  <div class="sidebar-block-head">
    <div class="block-title">{collapsed ? "•" : strings.workspaceNoteFilters}</div>
    {#if compact && !collapsed}
      <button
        type="button"
        class="section-toggle"
        onclick={() => onToggleSectionCollapsed()}
        aria-label={strings.workspaceNoteFilters}
      >
        {sectionToggleIcon(sectionCollapsed)}
      </button>
    {/if}
  </div>
  {#if !compact || !sectionCollapsed || collapsed}
    <div class="view-sections">
      <div class="view-list">
        {#each primaryViewModes as mode}
          <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
            {#if collapsed}
              <span title={getWorkspaceViewModeLabel(strings, mode)}>{getWorkspaceViewModeLabel(strings, mode).slice(0, 1)}</span>
            {:else}
              <span>{getWorkspaceViewModeLabel(strings, mode)}</span>
              <span class="view-count">{viewCount(mode)}</span>
            {/if}
          </button>
        {/each}
      </div>
      <div class="view-separator"></div>
      <div class="view-list view-list-secondary">
        {#each secondaryViewModes as mode}
          <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
            {#if collapsed}
              <span title={getWorkspaceViewModeLabel(strings, mode)}>{getWorkspaceViewModeLabel(strings, mode).slice(0, 1)}</span>
            {:else}
              <span>{getWorkspaceViewModeLabel(strings, mode)}</span>
              <span class="view-count">{viewCount(mode)}</span>
            {/if}
          </button>
        {/each}
      </div>
      {#if !collapsed}
        <div class="tag-filter">
          <div class="filter-label">{strings.workspaceTagsFilter}</div>
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
                <span class="view-count">{taggedNoteCount}</span>
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
                  <span class="view-count">{item.count}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .note-filters-block {
    border: 1px solid var(--ws-border, #dce5f3);
    border-radius: 12px;
    background: var(--ws-card-bg, #fdfefe);
    padding: 10px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
  }

  .note-filters-block.manual-layout {
    height: var(--manual-block-height, auto);
    max-height: var(--manual-block-height, none);
    overflow: hidden;
  }

  .note-filters-block.collapsed {
    padding: 8px 6px;
  }

  .sidebar-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .section-toggle {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 8px;
    min-width: 22px;
    height: 22px;
    padding: 0;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
  }

  .view-sections {
    display: grid;
    gap: 8px;
    min-height: 0;
    max-height: var(--section-max-height, 240px);
    overflow: auto;
    padding-right: 2px;
    scrollbar-width: thin;
  }

  .note-filters-block.manual-layout .view-sections {
    height: var(--section-max-height, 240px);
  }

  .view-list {
    display: grid;
    gap: 6px;
  }

  .view-list-secondary .view-btn {
    opacity: 0.95;
  }

  .view-separator {
    height: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 90%, transparent);
  }

  .view-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .note-filters-block.collapsed .view-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .note-filters-block.compact .view-btn {
    padding: 8px 10px;
    font-size: 12px;
    gap: 8px;
  }

  .view-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateX(2px);
  }

  .view-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .view-count {
    display: inline-flex;
    min-width: 22px;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    background: var(--ws-card-bg, #fdfefe);
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    font-weight: 700;
    justify-content: center;
    line-height: 1.1;
  }

  .tag-filter {
    display: grid;
    gap: 6px;
  }

  .filter-label {
    font-size: 11px;
    color: var(--ws-muted, #64748b);
    font-weight: 600;
  }

  .tag-empty {
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 9px;
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    line-height: 1.4;
    padding: 8px;
  }

  .tag-list {
    display: grid;
    gap: 5px;
    max-height: 160px;
    overflow: auto;
    padding-right: 3px;
    scrollbar-width: thin;
    scrollbar-color: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45))
      var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14));
  }

  .tag-list::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .tag-list::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--ws-scrollbar-track, rgba(148, 163, 184, 0.14)) 80%, transparent);
    border-radius: 999px;
  }

  .tag-list::-webkit-scrollbar-thumb {
    background: var(--ws-scrollbar-thumb, rgba(71, 85, 105, 0.45));
    border-radius: 999px;
  }

  .tag-filter-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tag-filter-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .tag-filter-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  .tag-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @container (max-width: 230px) {
    .note-filters-block {
      padding: 8px;
    }

    .view-btn {
      font-size: 12px;
      padding: 7px 9px;
    }
  }
</style>
