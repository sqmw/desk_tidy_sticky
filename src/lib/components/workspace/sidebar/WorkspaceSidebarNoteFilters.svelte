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
        {@render viewButton(mode)}
      {/each}
    </div>
    <div class="view-separator"></div>
    <div class="view-list view-list-secondary">
      {#each secondaryViewModes as mode}
        {@render viewButton(mode)}
      {/each}
    </div>
  </div>
</div>

{#snippet viewButton(/** @type {string} */ mode)}
  <button
    type="button"
    class="view-btn"
    class:active={viewMode === mode}
    title={getWorkspaceViewModeLabel(strings, mode)}
    onclick={() => onSetViewMode(mode)}
  >
    <span class="view-icon" aria-hidden="true">{@render viewIcon(mode)}</span>
    {#if !collapsed}
      <span class="view-label">{getWorkspaceViewModeLabel(strings, mode)}</span>
      <span class="view-count">{viewCount(mode)}</span>
    {/if}
  </button>
{/snippet}

{#snippet viewIcon(/** @type {string} */ mode)}
  {#if mode === WORKSPACE_NOTE_VIEW_TODO}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8.4"></circle>
      <path d="m8.6 12.2 2.3 2.3 4.5-4.7"></path>
    </svg>
  {:else if mode === WORKSPACE_NOTE_VIEW_QUADRANT}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.6"></rect>
      <rect x="13" y="4" width="7" height="7" rx="1.6"></rect>
      <rect x="4" y="13" width="7" height="7" rx="1.6"></rect>
      <rect x="13" y="13" width="7" height="7" rx="1.6"></rect>
    </svg>
  {:else if mode === WORKSPACE_NOTE_VIEW_ARCHIVED}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3.5" y="4.5" width="17" height="4.4" rx="1.2"></rect>
      <path d="M5.4 8.9V18a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V8.9"></path>
      <path d="M10 12.6h4"></path>
    </svg>
  {:else if mode === WORKSPACE_NOTE_VIEW_TRASH}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 6.6h15"></path>
      <path d="M9.4 6.4V5a1.2 1.2 0 0 1 1.2-1.2h2.8A1.2 1.2 0 0 1 14.6 5v1.4"></path>
      <path d="M6.4 6.8 7.2 19a1.6 1.6 0 0 0 1.6 1.5h6.4a1.6 1.6 0 0 0 1.6-1.5l.8-12.2"></path>
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3.6 8.4 4.4L12 12.4 3.6 8z"></path>
      <path d="m3.6 12.6 8.4 4.4 8.4-4.4"></path>
      <path d="m3.6 16.6 8.4 4.4 8.4-4.4"></path>
    </svg>
  {/if}
{/snippet}

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
    color: var(--ws-muted, #71809b);
    margin: 0 0 5px;
    padding: 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .view-sections {
    display: grid;
    gap: 6px;
    min-height: 0;
    max-height: none;
    overflow: visible;
    padding-right: 0;
    scrollbar-width: none;
  }

  .view-list {
    display: grid;
    gap: 2px;
  }

  .view-separator {
    height: 1px;
    margin: 2px 8px;
    background: color-mix(in srgb, var(--ws-border-soft, #e7ecf5) 90%, transparent);
  }

  .view-btn {
    border: 1px solid transparent;
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    text-align: left;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.16s ease, color 0.16s ease;
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .view-icon {
    flex: 0 0 auto;
    display: inline-grid;
    place-items: center;
    color: var(--ws-muted, #71809b);
    transition: color 0.16s ease;
  }

  .view-label {
    min-width: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-filters-block.collapsed .view-btn {
    justify-content: center;
    padding: 0 4px;
    min-height: 34px;
  }

  .note-filters-block.compact .view-btn {
    padding: 6px 9px;
    font-size: 12px;
    gap: 7px;
  }

  .view-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 7%, transparent);
  }

  .view-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .view-btn.active {
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 11%, transparent);
  }

  .view-btn.active .view-icon {
    color: var(--ws-accent, #2563eb);
  }

  .view-count {
    flex: 0 0 auto;
    min-width: 18px;
    text-align: right;
    color: var(--ws-muted, #71809b);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .view-btn.active .view-count {
    color: color-mix(in srgb, var(--ws-accent, #2563eb) 74%, var(--ws-muted, #71809b));
  }

  @container (max-width: 230px) {
    .note-filters-block {
      padding: 0;
    }

    .view-btn {
      font-size: 11px;
      padding: 6px 8px;
      gap: 7px;
    }
  }
</style>
