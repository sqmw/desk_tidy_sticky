<script>
  let {
    strings,
    showWindowControls = true,
    hideWindow,
    minimizeWindow,
    onOpenSettings,
    switchToWorkspace,
  } = $props();
</script>

<div class="header-actions">

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
  {#if showWindowControls}
    <button type="button" class="icon-btn window-btn" title={strings.minimizeWindow} onclick={minimizeWindow}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 12.5h12" stroke-linecap="round" />
      </svg>
    </button>
    <button type="button" class="icon-btn window-btn close-btn" title={strings.hideWindow} onclick={hideWindow}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 7l10 10M17 7 7 17" stroke-linecap="round" />
      </svg>
    </button>
  {/if}
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

  .window-btn {
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 5px;
    border: none;
    background: transparent;
    transition:
      opacity 0.16s ease,
      background-color 0.16s ease,
      color 0.16s ease;
  }

  .window-btn:hover {
    background: color-mix(in srgb, #f5f7fa 88%, transparent);
  }

  .close-btn:hover {
    color: #a12f2f;
    background: color-mix(in srgb, #fff1f1 90%, transparent);
  }
</style>
