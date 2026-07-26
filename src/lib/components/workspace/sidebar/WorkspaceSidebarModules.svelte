<script>
  import {
    WORKSPACE_MAIN_TAB_FOCUS,
    WORKSPACE_MAIN_TAB_REVIEW,
  } from "$lib/workspace/workspace-tabs.js";

  let {
    strings,
    collapsed = false,
    mainTabs = [],
    mainTab,
    onSetMainTab = () => {},
  } = $props();
</script>

<div class="block-title">{strings.workspaceModules}</div>
<div class="main-nav-list">
  {#each mainTabs as tab (tab.key)}
    <button
      type="button"
      class="main-nav-row"
      class:active={mainTab === tab.key}
      onclick={() => onSetMainTab(tab.key)}
      title={tab.label}
    >
      <span class="nav-icon" aria-hidden="true">
        {#if tab.key === WORKSPACE_MAIN_TAB_FOCUS}
          {@render iconFocus()}
        {:else if tab.key === WORKSPACE_MAIN_TAB_REVIEW}
          {@render iconReview()}
        {:else}
          {@render iconNotes()}
        {/if}
      </span>
      {#if !collapsed}
        <span class="nav-label">{tab.label}</span>
      {/if}
    </button>
  {/each}
</div>

{#snippet iconNotes()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 4h14v10l-6 6H5z"></path>
    <path d="M13 20v-6h6"></path>
  </svg>
{/snippet}

{#snippet iconFocus()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="8"></circle>
    <circle cx="12" cy="12" r="4"></circle>
    <circle cx="12" cy="12" r="0.6" fill="currentColor"></circle>
  </svg>
{/snippet}

{#snippet iconReview()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19V5"></path>
    <path d="M4 19h16"></path>
    <path d="M8 15v-4M12 15V8M16 15v-6"></path>
  </svg>
{/snippet}

<style>
  .block-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-muted, #71809b);
    margin: 0 0 5px;
    padding: 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .main-nav-list {
    display: grid;
    gap: 2px;
  }

  .main-nav-row {
    border: 0;
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    text-align: left;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    transition: background 0.16s ease, color 0.16s ease;
  }

  .nav-icon {
    flex: 0 0 auto;
    display: inline-grid;
    place-items: center;
    color: var(--ws-muted, #71809b);
    transition: color 0.16s ease;
  }

  .nav-label {
    min-width: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .main-nav-row:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 7%, transparent);
  }

  .main-nav-row:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .main-nav-row.active {
    color: var(--ws-accent, #2563eb);
    font-weight: 700;
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 11%, transparent);
  }

  .main-nav-row.active .nav-icon {
    color: var(--ws-accent, #2563eb);
  }

  :global(.sidebar.collapsed) .main-nav-row {
    justify-content: center;
    padding: 0 4px;
    min-height: 34px;
  }

  :global(.sidebar.compact) .main-nav-row {
    padding: 6px 9px;
    font-size: 12px;
  }

  :global(.sidebar.collapsed) .block-title {
    display: none;
  }

  @container (max-width: 230px) {
    .main-nav-row {
      font-size: 11px;
      padding: 6px 8px;
      gap: 7px;
    }
  }
</style>
