<script>
  let {
    placement = "inside",
    strings,
    isEditing = false,
    isControlMode = false,
    showControlExit = false,
    isMac = false,
    note = null,
    showPalette = false,
    showTextColorPalette = false,
    showOpacityPanel = false,
    showFrostPanel = false,
    opacityDraft = 1,
    frostDraft = 0,
    noteBgColor = "",
    noteTextColor = "",
    backgroundPickerValue = "#fff9c4",
    textPickerValue = "#1f2937",
    noteColors = [],
    noteTextColors = [],
    onToggleEdit = () => {},
    onToggleTopmost = () => {},
    onToggleWallpaper = () => {},
    onTogglePalette = () => {},
    onToggleTextColorPalette = () => {},
    onToggleOpacityPanel = () => {},
    onOpacityIconWheel = () => {},
    onOpacityInput = () => {},
    onOpacityWheel = () => {},
    onToggleFrostPanel = () => {},
    onFrostIconWheel = () => {},
    onFrostInput = () => {},
    onFrostWheel = () => {},
    onToggleDone = () => {},
    onToggleArchive = () => {},
    onExitControlMode = () => {},
    onUnpin = () => {},
    onMoveToTrash = () => {},
    onSetBackgroundColor = () => {},
    onSetTextColor = () => {},
    onBackgroundColorPickerChange = () => {},
    onTextColorPickerChange = () => {},
  } = $props();
</script>

{#if placement === "inside"}
  <div class="toolbar-mask" class:editing={isEditing} class:control={isControlMode} aria-hidden="true"></div>
{/if}
{#if showControlExit}
  <button
    type="button"
    class="control-exit"
    class:mac={isMac}
    class:windows={!isMac}
    onclick={() => onExitControlMode()}
    title={strings.close}
    aria-label={strings.close}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12"></path>
      <path d="M18 6 6 18"></path>
    </svg>
  </button>
{/if}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="toolbar" class:editing={isEditing} class:control={isControlMode} class:outside={placement === "outside"}>
  <div class="toolbar-actions">
    <button
      class="tool-btn tool-btn-primary"
      class:active={isEditing}
      onclick={() => onToggleEdit()}
      title={isEditing ? strings.saveNote : strings.edit}
    >
      {#if isEditing}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m5 12 4.2 4.2L19 6.5"></path>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0L15.13 5.1l3.75 3.75 1.83-1.81z" />
        </svg>
      {/if}
    </button>

    <button
      class="tool-btn"
      class:active={!!note?.isAlwaysOnTop}
      onclick={() => onToggleTopmost()}
      title={note?.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
    >
      {#if note?.isAlwaysOnTop}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="5" y="14.5" width="14" height="4.5" rx="1.6"></rect>
          <path d="M12 4.5v8"></path>
          <path d="M8.8 9.6 12 12.8l3.2-3.2"></path>
        </svg>
      {:else}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="5" y="4.8" width="14" height="4.5" rx="1.6"></rect>
          <path d="M12 19.5v-8"></path>
          <path d="M8.8 14.4 12 11.2l3.2 3.2"></path>
        </svg>
      {/if}
    </button>

    {#if note?.isPinned && !note?.isAlwaysOnTop}
      <button
        class="tool-btn"
        class:active={!!note?.isWallpaper}
        onclick={() => onToggleWallpaper()}
        title={note?.isWallpaper ? strings.pinToDesktopLayer : strings.pinToWallpaper}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="4.5" y="5" width="15" height="10" rx="2"></rect>
          <path d="M7 13l2.8-2.8 2.8 2.8 2.6-2.6 2.1 2.1"></path>
          <path d="M6 19h12"></path>
        </svg>
      </button>
    {/if}

    <button class="tool-btn color-trigger" onclick={() => onTogglePalette()} title="Change color">
      🎨
    </button>

    <button
      class="tool-btn text-color-trigger"
      onclick={() => onToggleTextColorPalette()}
      title={strings.textColor}
    >
      A
    </button>

    <div class="tool-popover-anchor">
      <button
        class="tool-btn opacity-trigger"
        onclick={() => onToggleOpacityPanel()}
        onwheel={(event) => onOpacityIconWheel(event)}
        title={strings.glassAdjust}
      >
        ◐
      </button>
      {#if showOpacityPanel}
        <div class="opacity-popover">
          <input
            class="opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacityDraft}
            oninput={(event) => onOpacityInput(event)}
            onwheel={(event) => onOpacityWheel(event)}
          />
        </div>
      {/if}
    </div>

    <div class="tool-popover-anchor">
      <button
        class="tool-btn frost-trigger"
        onclick={() => onToggleFrostPanel()}
        onwheel={(event) => onFrostIconWheel(event)}
        title={strings.frost}
      >
        ❆
      </button>
      {#if showFrostPanel}
        <div class="frost-popover">
          <input
            class="frost-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={frostDraft}
            oninput={(event) => onFrostInput(event)}
            onwheel={(event) => onFrostWheel(event)}
          />
        </div>
      {/if}
    </div>

    <button
      class="tool-btn"
      onclick={() => onToggleDone()}
      title={note?.isDone ? strings.markUndone : strings.markDone}
    >
      {#if note?.isDone}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z" />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      {/if}
    </button>

    <button
      class="tool-btn"
      onclick={() => onToggleArchive()}
      title={note?.isArchived ? strings.unarchive : strings.archive}
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
      </svg>
    </button>

    <button class="tool-btn tool-btn-danger-soft" onclick={() => onUnpin()} title={strings.unpinNote}>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z" />
      </svg>
    </button>

    <button class="tool-btn danger" onclick={() => onMoveToTrash()} title={strings.delete}>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
      </svg>
    </button>
  </div>

  {#if showPalette}
    <div class="color-popover">
      {#each noteColors as c}
        <button
          class="color-dot"
          class:active={c === noteBgColor}
          style="background:{c};"
          title={c}
          onclick={() => onSetBackgroundColor(c)}
        ></button>
      {/each}
      <div class="color-picker-row">
        <span class="color-picker-label">{strings.customColor}</span>
        <input
          class="color-picker-input"
          type="color"
          value={backgroundPickerValue}
          onchange={(event) => onBackgroundColorPickerChange(event)}
          aria-label={strings.customColor}
        />
      </div>
    </div>
  {/if}

  {#if showTextColorPalette}
    <div class="text-color-popover">
      {#each noteTextColors as c}
        <button
          class="text-color-dot"
          class:active={c === noteTextColor}
          style="background:{c};"
          title={c}
          onclick={() => onSetTextColor(c)}
        ></button>
      {/each}
      <div class="color-picker-row">
        <span class="color-picker-label">{strings.customColor}</span>
        <input
          class="color-picker-input"
          type="color"
          value={textPickerValue}
          onchange={(event) => onTextColorPickerChange(event)}
          aria-label={strings.customColor}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .toolbar {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 10px;
    padding: 10px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 2;
    border-radius: 14px;
    background: color-mix(in srgb, white 76%, transparent);
    border: 1px solid rgba(255, 255, 255, 0.52);
    backdrop-filter: blur(10px) saturate(1.04);
    -webkit-backdrop-filter: blur(10px) saturate(1.04);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14);
  }

  .toolbar.outside {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    width: calc(100% - 20px);
    margin: 0 auto;
    opacity: 1;
    pointer-events: auto;
  }

  .control-exit {
    position: absolute;
    top: 12px;
    z-index: 3;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.58);
    backdrop-filter: blur(10px) saturate(1.02);
    -webkit-backdrop-filter: blur(10px) saturate(1.02);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.1);
    pointer-events: auto;
    cursor: pointer;
    transition:
      background-color 0.16s ease,
      box-shadow 0.16s ease,
      transform 0.16s ease;
  }

  .control-exit:hover {
    transform: translateY(-1px);
  }

  .control-exit.mac {
    left: 12px;
    border-radius: 999px;
    background: color-mix(in srgb, #ff5f57 72%, white);
    color: rgba(122, 18, 18, 0.76);
  }

  .control-exit.mac:hover {
    background: color-mix(in srgb, #ff5f57 82%, white);
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.18);
  }

  .control-exit.windows {
    right: 12px;
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: color-mix(in srgb, white 70%, transparent);
    color: #64748b;
  }

  .control-exit.windows:hover {
    background: color-mix(in srgb, #fee2e2 70%, white);
    color: #b91c1c;
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.12);
  }

  .control-exit svg {
    width: 10px;
    height: 10px;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar-mask {
    position: absolute;
    left: 1px;
    right: 1px;
    bottom: 1px;
    height: 104px;
    background:
      linear-gradient(
        to top,
        rgba(255, 255, 255, 0.94) 0%,
        rgba(255, 255, 255, 0.72) 48%,
        rgba(255, 255, 255, 0) 100%
      );
    border-radius: 0 0 calc(var(--note-radius, 12px) - 1px) calc(var(--note-radius, 12px) - 1px);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 1;
  }

  :global(.note-window[data-toolbar-visible="true"]:hover) .toolbar {
    opacity: 1;
    pointer-events: auto;
  }

  :global(.note-window[data-toolbar-visible="true"]:hover) .toolbar-mask {
    opacity: 1;
  }

  .toolbar.editing {
    opacity: 1;
    pointer-events: auto;
  }

  .toolbar.control {
    opacity: 1;
    pointer-events: auto;
  }

  .toolbar-mask.editing {
    opacity: 1;
  }

  .toolbar-mask.control {
    opacity: 1;
  }

  .tool-btn {
    width: 30px;
    height: 30px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 9px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    padding: 0;
    font-size: 13px;
    flex: 0 0 auto;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.92);
    color: #111827;
  }

  .tool-btn.active {
    color: #0f4c81;
  }

  .tool-btn-primary {
    color: #0f4c81;
    background: color-mix(in srgb, #e0f2fe 74%, white);
    border-color: color-mix(in srgb, #0f4c81 24%, rgba(15, 23, 42, 0.08));
  }

  .tool-btn-primary:hover {
    background: color-mix(in srgb, #dbeafe 78%, white);
    color: #0b3c67;
  }

  .tool-btn svg {
    width: 15px;
    height: 15px;
    display: block;
    flex: 0 0 auto;
  }

  .tool-btn.danger {
    color: #b91c1c;
    background: rgba(255, 255, 255, 0.42);
  }

  .tool-btn.danger:hover {
    background: rgba(255, 255, 255, 0.82);
    color: #991b1b;
  }

  .tool-btn-danger-soft {
    background: rgba(255, 255, 255, 0.42);
    color: #7c2d12;
  }

  .tool-btn-danger-soft:hover {
    background: rgba(255, 255, 255, 0.82);
    color: #9a3412;
  }

  .tool-popover-anchor {
    position: static;
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .color-popover {
    position: absolute;
    right: 84px;
    bottom: 72px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(4, 18px);
    gap: 6px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    min-width: 104px;
  }

  .text-color-popover {
    position: absolute;
    right: 46px;
    bottom: 72px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(4, 18px);
    gap: 6px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    min-width: 104px;
  }

  .color-picker-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 2px;
    border-top: 1px solid rgba(148, 163, 184, 0.35);
  }

  .color-picker-label {
    font-size: 11px;
    color: #475569;
    user-select: none;
  }

  .color-picker-input {
    width: 24px;
    height: 18px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  .color-picker-input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-picker-input::-webkit-color-swatch {
    border: none;
    border-radius: 3px;
  }

  .opacity-popover,
  .frost-popover {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 42px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    width: min(152px, calc(100% - 24px));
    max-width: calc(100% - 24px);
    justify-content: center;
    box-sizing: border-box;
  }

  .opacity-slider,
  .frost-slider {
    width: 100%;
    cursor: pointer;
  }

  .color-dot,
  .text-color-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    padding: 0;
  }

  .color-dot.active,
  .text-color-dot.active {
    outline: 2px solid #374151;
    outline-offset: 1px;
  }
</style>
