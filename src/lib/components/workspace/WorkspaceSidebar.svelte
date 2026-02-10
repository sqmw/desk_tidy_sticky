<script>
  import {
    WORKSPACE_MAIN_TAB_NOTES,
    getWorkspaceMainTabDefs,
    getWorkspaceViewModeLabel,
  } from "$lib/workspace/workspace-tabs.js";

  let {
    strings,
    mainTab = /** @type {string} */ (WORKSPACE_MAIN_TAB_NOTES),
    viewModes,
    viewMode,
    collapsed = false,
    onDragStart,
    onSetMainTab,
    onSetViewMode,
    stickiesVisible,
    interactionDisabled = false,
    focusDeadlines = [],
    onDeadlineAction = () => {},
    onToggleLanguage,
    onToggleStickiesVisibility,
    onToggleInteraction,
  } = $props();

  const mainTabs = $derived(getWorkspaceMainTabDefs(strings));

  function interactionLabel() {
    return interactionDisabled ? strings.trayInteractionStateOff : strings.trayInteractionStateOn;
  }

  /** @param {{ isOverdue: boolean; minutesLeft: number; started?: boolean; minutesUntilStart?: number }} item */
  function deadlineLabel(item) {
    if (item.isOverdue) return `${strings.workspaceDeadlineOverdue} ${Math.abs(item.minutesLeft)}m`;
    if (!item.started) return `${strings.workspaceDeadlineStartsIn} ${Math.max(0, item.minutesUntilStart ?? 0)}m`;
    return `${strings.workspaceDeadlineDueIn} ${Math.max(0, item.minutesLeft)}m`;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<aside class="sidebar" class:collapsed>
  <div class="brand" data-drag-handle="workspace" onpointerdown={onDragStart}>
    <span class="brand-pill">{strings.workspaceBrandTag}</span>
    <h1>{collapsed ? "WS" : strings.workspaceTitle}</h1>
    {#if !collapsed}
      <p>{strings.workspaceHint}</p>
    {/if}
  </div>

  <div class="sidebar-block">
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
  </div>

  {#if mainTab === WORKSPACE_MAIN_TAB_NOTES}
    <div class="sidebar-block">
      <div class="block-title">{collapsed ? "•" : strings.workspaceNoteFilters}</div>
      <div class="view-list">
        {#each viewModes as mode}
          <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
            {#if collapsed}
              <span title={getWorkspaceViewModeLabel(strings, mode)}>{getWorkspaceViewModeLabel(strings, mode).slice(0, 1)}</span>
            {:else}
              {getWorkspaceViewModeLabel(strings, mode)}
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="sidebar-block">
      <div class="block-title">{collapsed ? "•" : strings.workspaceDeadlineTitle}</div>
      {#if collapsed}
        <div class="deadline-count">{focusDeadlines.length}</div>
      {:else if focusDeadlines.length === 0}
        <div class="deadline-empty">{strings.workspaceDeadlineEmpty}</div>
      {:else}
        <div class="deadline-list">
          {#each focusDeadlines as item (item.id)}
            <button
              type="button"
              class="deadline-item"
              class:overdue={item.isOverdue}
              onclick={() => onDeadlineAction(item.id)}
            >
              <div class="deadline-title">{item.title}</div>
              <div class="deadline-meta">
                <span>{item.startTime} - {item.endTime}</span>
                <span>{deadlineLabel(item)}</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <div class="sidebar-actions">
    <div class="block-title">{collapsed ? "•" : strings.settings}</div>
    <button type="button" class="ghost-btn" onclick={onToggleLanguage}>{collapsed ? "语" : strings.language}</button>
    <button type="button" class="ghost-btn" onclick={onToggleStickiesVisibility}>
      {collapsed ? "贴" : stickiesVisible ? strings.trayStickiesClose : strings.trayStickiesShow}
    </button>
    <button type="button" class="ghost-btn" onclick={onToggleInteraction}>{collapsed ? "交" : interactionLabel()}</button>
  </div>
</aside>

<style>
  .sidebar {
    border-right: 1px solid #dbe4f2;
    background: var(--ws-panel-bg, rgba(255, 255, 255, 0.86));
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    padding: 16px 14px;
    gap: 14px;
    position: relative;
    color: var(--ws-text, #111827);
    cursor: default;
  }

  .sidebar.collapsed {
    padding: 14px 8px;
    gap: 10px;
  }

  .brand-pill {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ws-accent, #1d4ed8);
    background: var(--ws-badge-bg, #e8f0ff);
    border: 1px solid var(--ws-badge-border, #d7e5ff);
    padding: 4px 8px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .brand h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--ws-text-strong, #0f172a);
  }

  .sidebar.collapsed .brand h1 {
    font-size: 18px;
    text-align: center;
  }

  .sidebar.collapsed .brand-pill {
    width: 100%;
    text-align: center;
    padding: 4px 2px;
    font-size: 9px;
  }

  .brand p {
    margin: 6px 0 0;
    font-size: 12px;
    color: var(--ws-muted, #64748b);
  }

  .sidebar-block {
    border: 1px solid var(--ws-border, #dce5f3);
    border-radius: 12px;
    background: var(--ws-card-bg, #fdfefe);
    padding: 10px;
  }

  .sidebar.collapsed .sidebar-block {
    padding: 8px 6px;
  }

  .block-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .view-list {
    display: grid;
    gap: 6px;
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

  .sidebar.collapsed .main-tab-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .view-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fbfdff);
    color: var(--ws-text, #334155);
    text-align: left;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.16s ease;
  }

  .sidebar.collapsed .view-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
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

  .deadline-empty {
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.45;
    padding: 10px;
  }

  .deadline-count {
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    color: var(--ws-text-strong, #0f172a);
    border: 1px dashed var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px 0;
  }

  .deadline-list {
    display: grid;
    gap: 6px;
  }

  .deadline-item {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px;
    background: var(--ws-btn-bg, #fbfdff);
    min-width: 0;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      transform 0.16s ease;
  }

  .deadline-item:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  .deadline-item.overdue {
    border-color: color-mix(in srgb, #ef4444 45%, var(--ws-border-soft, #d9e2ef));
    background: color-mix(in srgb, #ef4444 10%, var(--ws-btn-bg, #fbfdff));
  }

  .deadline-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-text, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .deadline-meta {
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
    color: var(--ws-muted, #64748b);
  }

  .sidebar-actions {
    margin-top: auto;
    display: grid;
    gap: 6px;
    border-top: 1px dashed var(--ws-border-soft, #d8e2ef);
    padding-top: 12px;
  }

  .ghost-btn {
    border: 1px solid var(--ws-border-soft, #d9e2ef);
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--ws-btn-bg, #fdfefe);
    color: var(--ws-text, #334155);
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    transition: all 0.16s ease;
  }

  .sidebar.collapsed .ghost-btn {
    text-align: center;
    padding: 8px 4px;
    font-size: 12px;
  }

  .ghost-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  @media (max-width: 920px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid #dce3ef;
    }
  }
</style>
