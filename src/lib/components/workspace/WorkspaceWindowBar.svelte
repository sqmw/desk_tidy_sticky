<script>
  let {
    strings,
    theme,
    isMaximized = false,
    compact = false,
    showWindowControls = true,
    onDragStart,
    onBackToCompact,
    onToggleTheme,
    onOpenSettings = () => {},
    onMinimize = () => {},
    onToggleMaximize,
    onHide = () => {},
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="window-bar" class:compact>
  <div class="drag-area" data-drag-handle="workspace" onpointerdown={onDragStart}>
    <span class="dot"></span>
    <span class="title">{strings.workspaceTitle}</span>
  </div>
  <div class="window-actions" onpointerdown={(e) => e.stopPropagation()}>
    <div class="action-cluster quick-cluster">
      <button
        type="button"
        class="bar-btn icon-btn"
        onclick={() => onOpenSettings()}
        onpointerdown={(e) => e.stopPropagation()}
        title={strings.settings}
      >
        {@render iconSettings()}
      </button>
      <button
        type="button"
        class="bar-btn icon-btn"
        onclick={(e) => onToggleTheme(e)}
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

    <div class="action-cluster mode-cluster">
      <button
        type="button"
        class="bar-btn back"
        class:compact-only={compact}
        onclick={onBackToCompact}
        onpointerdown={(e) => e.stopPropagation()}
        title={strings.switchToCompact}
      >
        {@render iconBack()}
        {#if !compact}
          {strings.switchToCompact}
        {/if}
      </button>
    </div>

    {#if showWindowControls}
      <div class="action-cluster window-cluster">
        <button
          type="button"
          class="bar-btn icon-btn window-minimize"
          onclick={() => onMinimize()}
          onpointerdown={(e) => e.stopPropagation()}
          title={strings.minimizeWindow}
        >
          {@render iconMinimizeWindow()}
        </button>
        <button
          type="button"
          class="bar-btn icon-btn window-maximize"
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
          class="bar-btn icon-btn close-btn"
          onclick={() => onHide()}
          onpointerdown={(e) => e.stopPropagation()}
          title={strings.hideWindow}
        >
          {@render iconCloseWindow()}
        </button>
      </div>
    {/if}
  </div>
</header>

{#snippet iconMoon()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z"></path>
  </svg>
{/snippet}

{#snippet iconSettings()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
    <path
      d="M19.4 12.9a7.7 7.7 0 0 0 .05-.9 7.7 7.7 0 0 0-.05-.9l2.05-1.6a.5.5 0 0 0 .12-.64l-1.95-3.38a.5.5 0 0 0-.6-.22l-2.42.97a7.4 7.4 0 0 0-1.55-.9l-.37-2.58a.5.5 0 0 0-.5-.42h-3.9a.5.5 0 0 0-.5.42l-.37 2.58a7.4 7.4 0 0 0-1.55.9l-2.42-.97a.5.5 0 0 0-.6.22L2.43 8.86a.5.5 0 0 0 .12.64l2.05 1.6a7.7 7.7 0 0 0-.05.9c0 .3.02.6.05.9l-2.05 1.6a.5.5 0 0 0-.12.64l1.95 3.38c.12.22.38.31.6.22l2.42-.97c.48.37 1 .68 1.55.9l.37 2.58c.04.24.25.42.5.42h3.9c.25 0 .46-.18.5-.42l.37-2.58c.55-.22 1.07-.53 1.55-.9l2.42.97c.22.09.48 0 .6-.22l1.95-3.38a.5.5 0 0 0-.12-.64l-2.05-1.6Z"
    ></path>
    <circle cx="12" cy="12" r="2.8"></circle>
  </svg>
{/snippet}

{#snippet iconSun()}
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7">
    <circle cx="12" cy="12" r="4.2"></circle>
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"></path>
  </svg>
{/snippet}

{#snippet iconMinimizeWindow()}
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7">
    <path d="M6 12h12"></path>
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

{#snippet iconCloseWindow()}
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="m6 6 12 12M18 6 6 18"></path>
  </svg>
{/snippet}

{#snippet iconBack()}
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M15 18 9 12l6-6"></path>
  </svg>
{/snippet}

<style>
  .window-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: none;
    border-radius: 0;
    padding: 0;
    background: transparent;
    cursor: all-scroll;
    user-select: none;
  }

  .window-bar.compact {
    padding: 7px 8px;
    gap: 6px;
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
    gap: 8px;
    cursor: default;
    flex-wrap: nowrap;
    min-width: 0;
  }

  .window-bar.compact .window-actions {
    gap: 6px;
  }

  .action-cluster {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    border-radius: 0;
    padding: 0;
    background: transparent;
  }

  .window-bar.compact .action-cluster {
    padding: 1px;
    gap: 3px;
  }

  .mode-cluster {
    margin-left: 2px;
  }

  .bar-btn {
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 13px;
    height: 36px;
    padding: 0 10px;
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

  .window-bar.compact .bar-btn {
    height: 34px;
    font-size: 12px;
    padding: 0 8px;
  }

  .bar-btn:hover {
    border-color: transparent;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 6%, transparent);
    transform: translateY(-1px);
  }

  .bar-btn:active {
    transform: translateY(0);
  }

  .bar-btn.icon-btn {
    width: 36px;
    padding: 0;
  }

  .window-bar.compact .bar-btn.icon-btn {
    width: 34px;
  }

  .bar-btn.back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    white-space: nowrap;
  }

  .bar-btn.back.compact-only {
    min-width: 34px;
    padding: 0 8px;
  }

  .window-cluster:not(.mac-traffic) .close-btn {
    color: color-mix(in srgb, #d14343 72%, var(--ws-text, #334155));
    border-color: transparent;
  }

  .window-cluster:not(.mac-traffic) .close-btn:hover {
    color: #b4232d;
    border-color: transparent;
    background: color-mix(in srgb, #ef4444 10%, transparent);
  }

  @media (max-width: 920px) {
    .window-bar {
      flex-wrap: wrap;
      align-items: stretch;
    }

    .drag-area {
      min-width: 140px;
    }

    .window-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .window-actions {
      gap: 6px;
    }

    .bar-btn.back {
      padding: 0 8px;
      font-size: 12px;
    }
  }
</style>
