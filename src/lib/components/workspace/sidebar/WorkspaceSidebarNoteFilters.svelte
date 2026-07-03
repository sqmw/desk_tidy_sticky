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
    blockStyle = "",
    viewModes = [],
    viewMode,
    noteViewCounts = {},
    onSetViewMode = () => {},
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

</script>

<div
  class="note-filters-block"
  class:collapsed
  class:compact
  style={blockStyle}
>
  <div class="sidebar-block-head">
    <div class="block-title">{strings.workspaceNoteFilters}</div>
  </div>
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
  </div>
</div>

<style>
  .note-filters-block {
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
  }

  .note-filters-block.collapsed {
    padding: 6px 0;
  }

  .note-filters-block.collapsed .block-title {
    display: none;
  }

  .sidebar-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .block-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .view-sections {
    display: grid;
    gap: 5px;
    min-height: 0;
    max-height: none;
    overflow: visible;
    padding-right: 0;
    scrollbar-width: none;
  }

  .view-list {
    display: grid;
    gap: 0;
  }

  .view-list-secondary .view-btn {
    opacity: 0.95;
  }

  .view-separator {
    height: 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 90%, transparent);
  }

  .view-btn {
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 8px 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.16s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .note-filters-block.collapsed .view-btn {
    text-align: center;
    padding: 0 4px;
    min-height: 34px;
    font-size: 11px;
    justify-content: center;
    white-space: nowrap;
  }

  .note-filters-block.compact .view-btn {
    padding: 6px 8px;
    font-size: 11px;
    gap: 6px;
  }

  .view-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .view-btn.active {
    color: var(--ws-text-strong, #0f172a);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent);
  }

  .view-count {
    display: inline-flex;
    min-width: 21px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 40%, transparent);
    background: transparent;
    color: var(--ws-muted, #64748b);
    font-size: 10px;
    font-weight: 700;
    justify-content: center;
    line-height: 1.1;
  }

  @container (max-width: 230px) {
    .note-filters-block {
      padding: 0;
    }

    .view-btn {
      font-size: 11px;
      padding: 6px 8px;
    }
  }
</style>
