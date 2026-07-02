<script>
  let {
    strings,
    collapsed = false,
    mainTabs = [],
    mainTab,
    onSetMainTab = () => {},
  } = $props();

  /** @param {string} label */
  function getCollapsedLabel(label) {
    return label ? Array.from(label).slice(0, 2).join("") : "•";
  }
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
      {collapsed ? getCollapsedLabel(tab.label) : tab.label}
    </button>
  {/each}
</div>

<style>
  .block-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .main-nav-list {
    display: grid;
    gap: 0;
  }

  .main-nav-row {
    position: relative;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 8px 10px 8px 12px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    transition: background 0.16s ease, color 0.16s ease;
  }

  .main-nav-row:hover {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
  }

  .main-nav-row.active {
    color: var(--ws-text-strong, #0f172a);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent);
  }

  .main-nav-row.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 2px;
    border-radius: 999px;
    background: var(--ws-accent, #1d4ed8);
  }

  :global(.sidebar.collapsed) .main-nav-row {
    text-align: center;
    padding: 0 4px;
    min-height: 34px;
    font-size: 11px;
    white-space: nowrap;
    word-break: keep-all;
    letter-spacing: 0;
    justify-content: center;
  }

  :global(.sidebar.collapsed) .main-nav-row.active::before {
    display: none;
  }

  :global(.sidebar.compact) .main-nav-row {
    padding: 7px 9px 7px 11px;
    font-size: 12px;
  }

  :global(.sidebar.collapsed) .block-title {
    display: none;
  }

  @container (max-width: 230px) {
    .main-nav-row {
      font-size: 11px;
      padding: 6px 8px;
    }
  }
</style>
