<script>
  let {
    strings,
    theme,
    isMaximized = false,
    onDragStart,
    onBackToCompact,
    onHide,
    onToggleTheme,
    onToggleMaximize,
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="window-bar" onpointerdown={onDragStart}>
  <div class="drag-area">
    <span class="dot"></span>
    <span class="title">{strings.workspaceTitle}</span>
  </div>
  <div class="window-actions" onpointerdown={(e) => e.stopPropagation()}>
    <div class="btn-group icon-group">
      <button
        type="button"
        class="bar-btn icon-btn"
        onclick={onToggleTheme}
        onpointerdown={(e) => e.stopPropagation()}
        title={theme === "dark" ? strings.themeLight : strings.themeDark}
      >
        {#if theme === "dark"}
          {@render iconSun()}
        {:else}
          {@render iconMoon()}
        {/if}
      </button>
    </div>

    <div class="btn-group">
      <button type="button" class="bar-btn back" onclick={onBackToCompact} onpointerdown={(e) => e.stopPropagation()}>
        {strings.switchToCompact}
      </button>
    </div>

    <div class="btn-group window-group">
      <button
        type="button"
        class="bar-btn icon-btn"
        onclick={onToggleMaximize}
        onpointerdown={(e) => e.stopPropagation()}
        title={isMaximized ? strings.restoreWindow : strings.maximizeWindow}
      >
        {#if isMaximized}
          {@render iconRestoreWindow()}
        {:else}
          {@render iconMaximizeWindow()}
        {/if}
      </button>
      <button
        type="button"
        class="bar-btn icon-btn close"
        onclick={onHide}
        onpointerdown={(e) => e.stopPropagation()}
        title={strings.hideWindow}
      >
        {@render iconClose()}
      </button>
    </div>
  </div>
</header>

{#snippet iconMoon()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z"></path>
  </svg>
{/snippet}

{#snippet iconSun()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7">
    <circle cx="12" cy="12" r="4.2"></circle>
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"></path>
  </svg>
{/snippet}

{#snippet iconMaximizeWindow()}
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7">
    <rect x="5" y="5" width="14" height="14" rx="1.8"></rect>
  </svg>
{/snippet}

{#snippet iconRestoreWindow()}
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7">
    <rect x="8" y="5" width="11" height="11" rx="1.4"></rect>
    <path d="M16 8H5v11h11"></path>
  </svg>
{/snippet}

{#snippet iconClose()}
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
    <path d="M6 6l12 12M18 6 6 18"></path>
  </svg>
{/snippet}

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
    cursor: all-scroll;
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
    gap: 10px;
    cursor: default;
    flex-wrap: wrap;
  }

  .btn-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .icon-group {
    padding-right: 2px;
    border-right: 1px solid color-mix(in srgb, var(--ws-border-soft, #d8e2ef) 80%, transparent);
  }

  .window-group {
    padding-left: 2px;
    border-left: 1px solid color-mix(in srgb, var(--ws-border-soft, #d8e2ef) 80%, transparent);
  }

  .bar-btn {
    border: 1px solid var(--ws-border-soft, #d8e2ef);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 13px;
    height: 38px;
    padding: 0 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      color 0.16s ease,
      transform 0.16s ease;
  }

  .bar-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  .bar-btn:active {
    transform: translateY(0);
  }

  .bar-btn.icon-btn {
    width: 38px;
    padding: 0;
  }

  .bar-btn.back {
    font-weight: 600;
  }

  .bar-btn.close {
    border-color: color-mix(in srgb, #ef4444 34%, var(--ws-border-soft, #d8e2ef));
    color: color-mix(in srgb, #b91c1c 84%, var(--ws-text, #334155));
    background: color-mix(in srgb, #fff1f2 65%, var(--ws-btn-bg, #fff));
  }

  .bar-btn.close:hover {
    border-color: color-mix(in srgb, #ef4444 46%, var(--ws-border-hover, #c6d5e8));
    background: color-mix(in srgb, #ffe4e6 74%, var(--ws-btn-hover, #f4f8ff));
  }
</style>
