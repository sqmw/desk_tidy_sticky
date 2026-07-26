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
    <div class="brand-row">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 4h14v10l-6 6H5z"></path>
          <path d="M13 20v-6h6"></path>
        </svg>
      </span>
      {#if !collapsed}
        <h1>{strings.workspaceTitle}</h1>
      {/if}
    </div>
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
      aria-pressed={stickiesVisible}
      onclick={() => onToggleStickiesVisibility()}
    >
      {#if !collapsed}
        <span class="footer-toggle-label">{strings.overlay}</span>
      {/if}
      <span class="footer-switch" aria-hidden="true"><span class="footer-switch-knob"></span></span>
    </button>
    <button
      type="button"
      class="footer-toggle"
      class:active={!globalControlDisabled}
      title={globalControlDisabled ? strings.trayInteractionStateOff : strings.trayInteractionStateOn}
      aria-label={strings.overlayClickThrough}
      aria-pressed={!globalControlDisabled}
      onclick={() => onToggleGlobalControl()}
    >
      {#if !collapsed}
        <span class="footer-toggle-label">{strings.overlayClickThrough}</span>
      {/if}
      <span class="footer-switch" aria-hidden="true"><span class="footer-switch-knob"></span></span>
    </button>
  </div>
</aside>

<style>
  .sidebar {
    --sidebar-divider-inset: 22px;
    --sidebar-divider-color: color-mix(in srgb, var(--ws-border-soft, #d8e2ef) 76%, transparent);
    border-right: 1px solid var(--ws-border, #e3e9f2);
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

  .brand {
    padding: 4px 6px 2px;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .brand-mark {
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
    display: inline-grid;
    place-items: center;
    border-radius: var(--ws-radius-sm, 8px);
    background: linear-gradient(
      135deg,
      var(--ws-accent, #2563eb) 0%,
      color-mix(in srgb, var(--ws-accent, #2563eb) 58%, #38bdf8) 100%
    );
    color: #fff;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06));
  }

  .brand h1 {
    margin: 0;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: var(--ws-text-strong, #101828);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar.collapsed .brand {
    padding: 2px 0;
  }

  .sidebar.collapsed .brand-row {
    justify-content: center;
  }

  .sidebar.collapsed .brand-pill {
    width: 100%;
    text-align: center;
    padding: 2px 2px;
    font-size: 8px;
  }

  .brand p {
    margin: 6px 0 0 1px;
    font-size: 11px;
    line-height: 1.35;
    color: var(--ws-muted, #71809b);
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
    min-width: 0;
    min-height: 30px;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: var(--ws-radius-sm, 8px);
    background: transparent;
    color: var(--ws-text, #3a4557);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .footer-toggle:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 7%, transparent);
  }

  .footer-toggle:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .footer-toggle.active {
    color: var(--ws-text-strong, #101828);
  }

  .footer-toggle-label {
    min-width: 0;
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .footer-switch {
    flex: 0 0 auto;
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ws-muted, #71809b) 32%, transparent);
    position: relative;
    transition: background 0.18s ease;
  }

  .footer-toggle.active .footer-switch {
    background: var(--ws-accent, #2563eb);
  }

  .footer-switch-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.24);
    transition: transform 0.18s ease;
  }

  .footer-toggle.active .footer-switch-knob {
    transform: translateX(12px);
  }

  .sidebar.compact .brand h1 {
    font-size: 14px;
  }

  .sidebar.compact .brand p {
    font-size: 10px;
    margin-top: 4px;
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
      min-height: 26px;
      padding: 2px 6px;
      gap: 6px;
    }

    .footer-toggle-label {
      font-size: 11px;
    }
  }

  @media (max-width: 920px) {
    .sidebar {
      border-right: none;
      border-bottom: 1px solid var(--ws-border, #e3e9f2);
    }

    .sidebar-body {
      max-height: min(56vh, 360px);
    }
  }
</style>
