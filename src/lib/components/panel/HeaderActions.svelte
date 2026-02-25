<script>
  let {
    strings,
    windowPinned,
    glassOpacity,
    toggleWindowPinned,
    toggleLanguage,
    adjustGlass,
    hideWindow,
    minimizeWindow,
    onOpenSettings,
    switchToWorkspace,
  } = $props();
</script>

<div class="header-actions">
  <button
    type="button"
    class="icon-btn"
    class:active={windowPinned}
    title={windowPinned ? strings.unpinWindow : strings.pinWindow}
    onclick={toggleWindowPinned}
  >
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      fill-rule="evenodd"
      style="transform: translateY(0.5px);"
    >
      {#if windowPinned}
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      {:else}
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z" />
      {/if}
    </svg>
  </button>

  <button type="button" class="icon-btn" title={strings.language} onclick={toggleLanguage}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path
        d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
      />
    </svg>
  </button>

  <button type="button" class="icon-btn" title={strings.settings} onclick={onOpenSettings}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path
        d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
  </button>

  <button type="button" class="icon-btn" title={strings.switchToWorkspace} onclick={switchToWorkspace}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 3h8v8H3V3zm10 0h8v5h-2V5h-6v6h3v2h-5V3zm-10 10h5v2H5v4h4v-3h2v5H3v-8zm10 2h8v6h-8v-6zm2 2v2h4v-2h-4z" />
    </svg>
  </button>

  <button
    type="button"
    class="icon-btn glass-btn"
    title={strings.glassAdjust}
    onwheel={(e) => {
      e.preventDefault();
      adjustGlass(-e.deltaY * 0.0005);
    }}
  >
    <span class="glass-pct">{Math.round(glassOpacity * 100)}%</span>
  </button>

  <button type="button" class="icon-btn" title={strings.minimizeWindow} onclick={minimizeWindow}>-</button>
  <button type="button" class="icon-btn" title={strings.hideWindow} onclick={hideWindow}>✕</button>
</div>

<style>
  .header-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    font-size: 14px;
    opacity: 0.7;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    opacity: 1;
  }

  .icon-btn.active {
    opacity: 1;
    color: var(--primary);
  }

  .glass-btn {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 1;
    width: auto;
    padding: 0 4px;
    font-variant-numeric: tabular-nums;
  }

  .glass-pct {
    font-size: 11px;
    font-weight: 500;
    min-width: 24px;
    text-align: center;
    color: #666;
  }
</style>
