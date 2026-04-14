<script>
  let {
    strings,
    collapsed = false,
    mainTabs = [],
    mainTab,
    onSetMainTab = () => {},
  } = $props();
</script>

<div class="block-title">{collapsed ? "•" : strings.workspaceModules}</div>
<div class="main-tabs">
  {#each mainTabs as tab (tab.key)}
    <button
      type="button"
      class="main-tab-btn"
      class:active={mainTab === tab.key}
      onclick={() => onSetMainTab(tab.key)}
      title={tab.label}
    >
      {collapsed ? tab.label.slice(0, 1) : tab.label}
    </button>
  {/each}
</div>

<style>
  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .main-tabs {
    display: grid;
    gap: 6px;
  }

  .main-tab-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 9px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    transition: all 0.16s ease;
  }

  .main-tab-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateX(2px);
  }

  .main-tab-btn.active {
    border-color: var(--ws-border-active, #94a3b8);
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-btn-active, linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%));
  }

  :global(.sidebar.collapsed) .main-tab-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  :global(.sidebar.compact) .main-tab-btn {
    padding: 8px 10px;
    font-size: 12px;
  }

  @container (max-width: 230px) {
    .main-tab-btn {
      font-size: 12px;
      padding: 7px 9px;
    }
  }
</style>
