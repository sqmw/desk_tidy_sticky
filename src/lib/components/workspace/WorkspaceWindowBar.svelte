<script>
  let {
    strings,
    sidebarCollapsed,
    theme,
    onDragStart,
    onBackToCompact,
    onHide,
    onToggleSidebar,
    onToggleTheme,
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="window-bar" onpointerdown={onDragStart}>
  <div class="drag-area">
    <span class="dot"></span>
    <span class="title">{strings.workspaceTitle}</span>
  </div>
  <div class="window-actions" onpointerdown={(e) => e.stopPropagation()}>
    <button
      type="button"
      class="bar-btn"
      onclick={onToggleSidebar}
      onpointerdown={(e) => e.stopPropagation()}
      title={sidebarCollapsed ? strings.expandSidebar : strings.collapseSidebar}
    >
      {sidebarCollapsed ? "⇥" : "⇤"}
    </button>
    <button
      type="button"
      class="bar-btn"
      onclick={onToggleTheme}
      onpointerdown={(e) => e.stopPropagation()}
      title={theme === "dark" ? strings.themeLight : strings.themeDark}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
    <button type="button" class="bar-btn back" onclick={onBackToCompact} onpointerdown={(e) => e.stopPropagation()}>
      {strings.switchToCompact}
    </button>
    <button type="button" class="bar-btn close" onclick={onHide} onpointerdown={(e) => e.stopPropagation()}>
      {strings.hideWindow}
    </button>
  </div>
</header>

<style>
  .window-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    backdrop-filter: blur(8px);
    cursor: crosshair;
    user-select: none;
  }

  .drag-area {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(180deg, #fb923c, #f97316);
    box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12);
    flex-shrink: 0;
  }

  .title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ws-text-strong, #1f2937);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .window-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
  }

  .bar-btn {
    border: 1px solid var(--ws-border-soft, #d8e2ef);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
  }

  .bar-btn.back {
    border-color: var(--ws-badge-border, #bfd4ff);
    background: var(--ws-badge-bg, linear-gradient(180deg, #eff6ff 0%, #e8f0ff 100%));
    color: var(--ws-accent, #1d4ed8);
    font-weight: 700;
  }

  .bar-btn.close {
    border-color: #fed7d7;
    color: #b91c1c;
    background: #fff5f5;
  }
</style>
