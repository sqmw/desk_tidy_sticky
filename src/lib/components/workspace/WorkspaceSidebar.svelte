<script>
  import {
    WORKSPACE_MAIN_TAB_NOTES,
    WORKSPACE_MAIN_TAB_FOCUS,
    getWorkspaceMainTabDefs,
  } from "$lib/workspace/workspace-tabs.js";
  import WorkspaceSidebarDeadlines from "$lib/components/workspace/sidebar/WorkspaceSidebarDeadlines.svelte";
  import WorkspaceSidebarModules from "$lib/components/workspace/sidebar/WorkspaceSidebarModules.svelte";
  import WorkspaceSidebarNoteFilters from "$lib/components/workspace/sidebar/WorkspaceSidebarNoteFilters.svelte";

  let {
    strings,
    isMac = false,
    mainTab = /** @type {string} */ (WORKSPACE_MAIN_TAB_NOTES),
    viewModes,
    viewMode,
    noteViewCounts = {},
    collapsed = false,
    compact = false,
    viewSectionMaxHeight = 240,
    deadlineSectionMaxHeight = 320,
    onDragStart,
    onSetMainTab,
    onSetViewMode,
    stickiesVisible,
    globalControlDisabled = false,
    showMacTrafficLights = false,
    focusDeadlines = [],
    onDeadlineAction = () => {},
    onToggleStickiesVisibility = () => {},
    onToggleGlobalControl = () => {},
  } = $props();

  const mainTabs = $derived(getWorkspaceMainTabDefs(strings));

  const noteFiltersBlockStyle = $derived.by(() =>
    `--section-max-height:${viewSectionMaxHeight}px;`,
  );
  const deadlineBlockStyle = $derived.by(() =>
    `--section-max-height:${deadlineSectionMaxHeight}px;`,
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<aside
  class="sidebar"
  class:collapsed
  class:compact
>
  <div class="brand" data-drag-handle="workspace" onpointerdown={onDragStart}>
    {#if isMac}
      <span
        class="brand-pill"
        class:traffic-reserved={showMacTrafficLights}
        class:traffic-hidden={isMac && !showMacTrafficLights}
      >
        {strings.workspaceBrandTag}
      </span>
    {/if}
    <h1>{collapsed ? "WS" : strings.workspaceTitle}</h1>
    {#if !collapsed}
      <p>{strings.workspaceHint}</p>
    {/if}
  </div>

  <div class="sidebar-body">
    <div class="sidebar-block modules-block">
      <WorkspaceSidebarModules {strings} {collapsed} {mainTabs} {mainTab} {onSetMainTab} />
    </div>
    <div class="sidebar-section-divider" aria-hidden="true"></div>

    {#if mainTab === WORKSPACE_MAIN_TAB_NOTES}
      <WorkspaceSidebarNoteFilters
        {strings}
        {collapsed}
        {compact}
        blockStyle={noteFiltersBlockStyle}
        {viewModes}
        {viewMode}
        {noteViewCounts}
        {onSetViewMode}
      />
    {:else if mainTab === WORKSPACE_MAIN_TAB_FOCUS}
      <WorkspaceSidebarDeadlines
        {strings}
        {collapsed}
        {compact}
        blockStyle={deadlineBlockStyle}
        {focusDeadlines}
        {onDeadlineAction}
      />
    {/if}
  </div>

  <div class="sidebar-actions">
    <button
      type="button"
      class="footer-toggle"
      class:active={stickiesVisible}
      title={stickiesVisible ? strings.trayStickiesShow : strings.trayStickiesClose}
      aria-label={strings.overlay}
      onclick={() => onToggleStickiesVisibility()}
    >
      <span class="footer-toggle-icon" aria-hidden="true"></span>
      {#if !collapsed}
        <span class="footer-toggle-label">{strings.overlay}</span>
      {/if}
      {#if !collapsed}
        <span class="footer-toggle-state">{stickiesVisible ? "ON" : "OFF"}</span>
      {/if}
    </button>
    <button
      type="button"
      class="footer-toggle"
      class:active={!globalControlDisabled}
      title={globalControlDisabled ? strings.trayInteractionStateOff : strings.trayInteractionStateOn}
      aria-label={strings.overlayClickThrough}
      onclick={() => onToggleGlobalControl()}
    >
      <span class="footer-toggle-icon" aria-hidden="true"></span>
      {#if !collapsed}
        <span class="footer-toggle-label">{strings.overlayClickThrough}</span>
      {/if}
      {#if !collapsed}
        <span class="footer-toggle-state">{globalControlDisabled ? "OFF" : "ON"}</span>
      {/if}
    </button>
  </div>
</aside>

<style>
  .sidebar {
    --sidebar-divider-inset: 22px;
    --sidebar-divider-color: color-mix(in srgb, var(--ws-border-soft, #d8e2ef) 76%, transparent);
    border-right: 1px solid #dbe4f2;
    background: var(--ws-panel-bg, rgba(255, 255, 255, 0.86));
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    padding: 12px 10px;
    gap: 10px;
    position: relative;
    color: var(--ws-text, #111827);
    cursor: default;
    min-height: 0;
    overflow: hidden;
    container-type: inline-size;
    scrollbar-width: none;
  }

  .sidebar::-webkit-scrollbar {
    display: none;
  }

  .sidebar.collapsed {
    padding: 8px 6px;
    gap: 6px;
  }

  .sidebar.compact {
    gap: 8px;
    padding: 10px 9px;
  }

  .sidebar-body {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 7px;
    overflow: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding-right: 0;
    padding-bottom: 8px;
    align-items: stretch;
    scrollbar-width: none;
  }

  .sidebar-body::-webkit-scrollbar {
    display: none;
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
    padding: 3px 7px;
    border-radius: 999px;
    margin-bottom: 6px;
  }

  .brand-pill.traffic-reserved {
    visibility: hidden;
    pointer-events: none;
  }

  .brand-pill.traffic-hidden {
    display: none;
  }

  .brand h1 {
    margin: 0;
    font-size: clamp(23px, 2.1vw, 31px);
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--ws-text-strong, #0f172a);
  }

  .sidebar.collapsed .brand h1 {
    font-size: 16px;
    text-align: center;
  }

  .sidebar.collapsed .brand-pill {
    width: 100%;
    text-align: center;
    padding: 2px 2px;
    font-size: 8px;
  }

  .brand p {
    margin: 4px 0 0;
    font-size: 10px;
    color: var(--ws-muted, #64748b);
  }

  .sidebar-block {
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 0;
    min-height: 0;
    flex: 0 0 auto;
  }

  .modules-block {
    min-height: 0;
  }

  .sidebar-section-divider {
    position: relative;
    height: 12px;
    flex: 0 0 auto;
  }

  .sidebar-section-divider::before {
    content: "";
    position: absolute;
    left: var(--sidebar-divider-inset);
    right: var(--sidebar-divider-inset);
    top: 50%;
    height: 1px;
    transform: translateY(-50%);
    border-radius: 999px;
    background: var(--sidebar-divider-color);
  }

  .sidebar.collapsed .sidebar-block {
    padding: 4px 0;
  }

  .sidebar-actions {
    margin-top: 0;
    display: grid;
    gap: 4px;
    border-top: none;
    position: relative;
    padding-top: 7px;
    flex: 0 0 auto;
  }

  .sidebar-actions::before {
    content: "";
    position: absolute;
    left: var(--sidebar-divider-inset);
    right: var(--sidebar-divider-inset);
    top: 0;
    height: 1px;
    border-radius: 999px;
    background: var(--sidebar-divider-color);
  }

  .footer-toggle {
    width: 100%;
    min-height: 24px;
    padding: 0 5px;
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.15s ease;
  }

  .footer-toggle:hover {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
    border-color: transparent;
  }

  .footer-toggle.active {
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, transparent);
    border-color: transparent;
    color: var(--ws-text-strong, #0f172a);
  }

  .footer-toggle-icon {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
  }

  .footer-toggle-icon::before {
    content: "";
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--ws-muted, #64748b);
    border-radius: 999px;
    background: transparent;
    opacity: 0.72;
  }

  .footer-toggle.active .footer-toggle-icon::before {
    border-color: var(--ws-accent, #1d4ed8);
    background:
      radial-gradient(circle, var(--ws-accent, #1d4ed8) 0 4px, transparent 4.5px);
    opacity: 1;
  }

  .footer-toggle-label {
    min-width: 0;
    flex: 1;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
  }

  .footer-toggle-state {
    flex: 0 0 auto;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--ws-muted, #64748b);
  }

  .sidebar.compact .brand h1 {
    font-size: 19px;
  }

  .sidebar.compact .brand p {
    font-size: 9px;
    margin-top: 3px;
  }

  @container (max-width: 230px) {
    .sidebar {
      padding: 8px 6px;
      gap: 6px;
    }

    .sidebar-body {
      gap: 6px;
    }

    .sidebar-section-divider {
      height: 10px;
    }

    .brand p {
      font-size: 9px;
      margin-top: 2px;
    }

    .sidebar-block {
      padding: 0;
    }

    .footer-toggle {
      min-height: 22px;
      padding: 0 4px;
    }

    .footer-toggle-label,
    .footer-toggle-state {
      display: none;
    }

    .footer-toggle {
      justify-content: center;
    }
  }

  @media (max-width: 920px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid #dce3ef;
    }

    .sidebar-body {
      max-height: min(56vh, 360px);
    }
  }
</style>
