<script>
  let {
    strings,
    viewModes,
    viewMode,
    collapsed = false,
    onDragStart,
    onSetViewMode,
    stickiesVisible,
    onToggleLanguage,
    onToggleStickiesVisibility,
    onToggleInteraction,
    onHideWindow,
  } = $props();

  /** @param {string} mode */
  function modeLabel(mode) {
    return strings[
      mode === "active"
        ? "active"
        : mode === "todo"
          ? "todo"
          : mode === "quadrant"
            ? "quadrant"
            : mode === "archived"
              ? "archived"
              : "trash"
    ];
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<aside class="sidebar" class:collapsed onpointerdown={onDragStart}>
  <div class="brand">
    <span class="brand-pill">Workspace</span>
    <h1>{collapsed ? "WS" : strings.workspaceTitle}</h1>
    {#if !collapsed}
      <p>{strings.workspaceHint}</p>
    {/if}
  </div>

  <div class="sidebar-block">
    <div class="block-title">{collapsed ? "V" : strings.sortMode}</div>
    <div class="view-list">
      {#each viewModes as mode}
        <button type="button" class="view-btn" class:active={viewMode === mode} onclick={() => onSetViewMode(mode)}>
          {collapsed ? modeLabel(mode).slice(0, 1) : modeLabel(mode)}
        </button>
      {/each}
    </div>
  </div>

  <div class="sidebar-actions">
    <div class="block-title">{collapsed ? "S" : strings.settings}</div>
    <button type="button" class="ghost-btn" onclick={onToggleLanguage}>{collapsed ? "语" : strings.language}</button>
    <button type="button" class="ghost-btn" onclick={onToggleStickiesVisibility}>
      {collapsed ? "贴" : stickiesVisible ? strings.trayStickiesClose : strings.trayStickiesShow}
    </button>
    <button type="button" class="ghost-btn" onclick={onToggleInteraction}>{collapsed ? "交" : strings.trayInteraction}</button>
    <button type="button" class="ghost-btn" onclick={onHideWindow}>{collapsed ? "隐" : strings.hideWindow}</button>
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
    cursor: all-scroll;
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
