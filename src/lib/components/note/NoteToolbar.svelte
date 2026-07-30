<script>
  let {
    placement = "inside",
    strings,
    isEditing = false,
    isControlMode = false,
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
    onToggleTopmost = () => {},
    onToggleWallpaper = () => {},
    onToggleAutoHide = () => {},
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
    onUnpin = () => {},
    onMoveToTrash = () => {},
    onSetBackgroundColor = () => {},
    onSetTextColor = () => {},
    onBackgroundColorPickerChange = () => {},
    onTextColorPickerChange = () => {},
  } = $props();

  /** @param {PointerEvent} event */
  function keepEditorSelection(event) {
    const target = /** @type {HTMLElement | null} */ (event.target);
    if (target?.closest?.('input[type="range"], input[type="color"]')) return;
    event.preventDefault();
  }

</script>

<div
  class="toolbar"
  role="toolbar"
  tabindex="-1"
  aria-label={strings.noteToolbar}
  class:editing={isEditing}
  class:control={isControlMode}
  class:outside={placement === "outside"}
  onpointerdown={keepEditorSelection}
>
  <div class="toolbar-actions">
    <div class="tool-group">
      <button
        type="button"
        class="tool-btn"
        class:active={!!note?.isAlwaysOnTop}
        onclick={() => onToggleTopmost()}
        title={note?.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
      >
        {#if note?.isAlwaysOnTop}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="5" y="14.5" width="14" height="4.5" rx="1.6"></rect>
            <path d="M12 4.5v8"></path>
            <path d="M8.8 9.6 12 12.8l3.2-3.2"></path>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="5" y="4.8" width="14" height="4.5" rx="1.6"></rect>
            <path d="M12 19.5v-8"></path>
            <path d="M8.8 14.4 12 11.2l3.2 3.2"></path>
          </svg>
        {/if}
      </button>

      {#if note?.isPinned && !note?.isAlwaysOnTop}
        <button
          type="button"
          class="tool-btn"
          class:active={!!note?.isWallpaper}
          onclick={() => onToggleWallpaper()}
          title={note?.isWallpaper ? strings.pinToDesktopLayer : strings.pinToWallpaper}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="4.5" y="5" width="15" height="10" rx="2"></rect>
            <path d="M6 19h12M7 13l3-3 3 3 2.5-2.5 2 2"></path>
          </svg>
        </button>
      {/if}

      {#if note?.isPinned && note?.isAlwaysOnTop}
        <button
          type="button"
          class="tool-btn"
          class:active={!!note?.autoHideEnabled}
          onclick={() => onToggleAutoHide()}
          title={note?.autoHideEnabled ? strings.stickyAutoHideDisable : strings.stickyAutoHideEnable}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="5" y="6" width="14" height="12" rx="2"></rect>
            <path d="M3 12h4M17 12h4M12 4v4M12 16v4"></path>
          </svg>
        </button>
      {/if}
    </div>

    <div class="tool-group">
    <div class="tool-popover-anchor">
      <button
        type="button"
        class="tool-btn color-trigger"
        class:active={showPalette}
        onclick={() => onTogglePalette()}
        title={strings.changeColor}
      >
        <span class="color-swatch" style="--swatch-color: {noteBgColor};"></span>
      </button>
      {#if showPalette}
        <div class="color-popover">
          {#each noteColors as color}
            <button
              type="button"
              class="color-dot"
              class:active={color === noteBgColor}
              style="background:{color};"
              title={color}
              onclick={() => onSetBackgroundColor(color)}
            ></button>
          {/each}
          <div class="color-picker-row">
            <span>{strings.customColor}</span>
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
    </div>

    <div class="tool-popover-anchor">
      <button
        type="button"
        class="tool-btn text-color-trigger"
        class:active={showTextColorPalette}
        onpointerdown={keepEditorSelection}
        onclick={() => onToggleTextColorPalette()}
        title={strings.textColor}
      >
        <span class="text-color-icon" style="--text-swatch-color: {noteTextColor};">A</span>
      </button>
      {#if showTextColorPalette}
        <div class="text-color-popover">
          {#each noteTextColors as color}
            <button
              type="button"
              class="color-dot"
              class:active={color === noteTextColor}
              style="background:{color};"
              title={color}
              onpointerdown={keepEditorSelection}
              onclick={() => onSetTextColor(color)}
            ></button>
          {/each}
          <div class="color-picker-row">
            <span>{strings.customColor}</span>
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

    <div class="tool-popover-anchor">
      <button
        type="button"
        class="tool-btn opacity-trigger"
        class:active={showOpacityPanel}
        onclick={() => onToggleOpacityPanel()}
        onwheel={(event) => onOpacityIconWheel(event)}
        title={strings.glassAdjust}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5"></circle>
          <path d="M12 3.5v17"></path>
        </svg>
      </button>
      {#if showOpacityPanel}
        <div class="range-popover opacity-popover">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacityDraft}
            aria-label={strings.glassAdjust}
            oninput={(event) => onOpacityInput(event)}
            onwheel={(event) => onOpacityWheel(event)}
          />
        </div>
      {/if}
    </div>

    <div class="tool-popover-anchor">
      <button
        type="button"
        class="tool-btn frost-trigger"
        class:active={showFrostPanel}
        onclick={() => onToggleFrostPanel()}
        onwheel={(event) => onFrostIconWheel(event)}
        title={strings.frost}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"></path>
          <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"></path>
        </svg>
      </button>
      {#if showFrostPanel}
        <div class="range-popover frost-popover">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={frostDraft}
            aria-label={strings.frost}
            oninput={(event) => onFrostInput(event)}
            onwheel={(event) => onFrostWheel(event)}
          />
        </div>
      {/if}
    </div>
    </div>

    <div class="tool-group">
      <button
        type="button"
        class="tool-btn"
        class:active={!!note?.isDone}
        onclick={() => onToggleDone()}
        title={note?.isDone ? strings.markUndone : strings.markDone}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5"></circle>
          {#if note?.isDone}<path d="m8 12 2.7 2.7L16.5 9"></path>{/if}
        </svg>
      </button>

      <button
        type="button"
        class="tool-btn"
        onclick={() => onToggleArchive()}
        title={note?.isArchived ? strings.unarchive : strings.archive}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6"></path>
        </svg>
      </button>

      <button type="button" class="tool-btn" onclick={() => onUnpin()} title={strings.unpinNote}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M8 4h8M9 4v7l-3 3h12l-3-3V4M12 14v7"></path>
        </svg>
      </button>
    </div>

    <div class="tool-group danger-group">
      <button type="button" class="tool-btn danger" onclick={() => onMoveToTrash()} title={strings.delete}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .toolbar {
    position: absolute;
    left: 50%;
    bottom: 10px;
    z-index: 7;
    transform: translateX(-50%) translateY(5px);
    padding: 5px;
    opacity: 0;
    pointer-events: none;
    border: 1px solid color-mix(in srgb, white 52%, transparent);
    border-radius: 7px;
    background: color-mix(in srgb, white 78%, transparent);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(14px) saturate(1.08);
    -webkit-backdrop-filter: blur(14px) saturate(1.08);
    transition:
      opacity 0.16s ease,
      transform 0.16s ease;
  }

  .toolbar.outside {
    position: relative;
    left: auto;
    bottom: auto;
    width: max-content;
    max-width: none;
    margin: 0 auto;
    padding: 7px 9px;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    box-sizing: border-box;
    border-color: rgba(255, 255, 255, 0.68);
    border-radius: 999px;
    background: rgba(248, 250, 252, 0.78);
    box-shadow:
      0 8px 24px rgba(15, 23, 42, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(18px) saturate(1.14);
    -webkit-backdrop-filter: blur(18px) saturate(1.14);
    transform-origin: top center;
    animation: outside-toolbar-enter 180ms cubic-bezier(0.2, 0.78, 0.2, 1) both;
  }

  :global(.note-window[data-toolbar-visible="true"]:hover) .toolbar,
  .toolbar.editing,
  .toolbar.control {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }

  .toolbar.outside {
    transform: none;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .toolbar.outside .toolbar-actions {
    gap: 7px;
    flex-wrap: nowrap;
  }

  .tool-group {
    position: relative;
    display: flex;
    align-items: center;
    gap: 3px;
    flex: 0 0 auto;
  }

  .toolbar.outside .tool-group + .tool-group {
    padding-left: 8px;
  }

  .toolbar.outside .tool-group + .tool-group::before {
    content: "";
    position: absolute;
    left: 0;
    top: 7px;
    width: 1px;
    height: 16px;
    background: rgba(100, 116, 139, 0.22);
  }

  .tool-btn {
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: #475569;
    cursor: pointer;
  }

  .tool-btn:hover,
  .tool-btn.active {
    border-color: rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.76);
    color: #0f4c81;
  }

  .tool-btn:focus-visible {
    outline: 2px solid rgba(29, 78, 216, 0.42);
    outline-offset: 1px;
  }

  .tool-btn svg {
    width: 17px;
    height: 17px;
  }

  .tool-btn.danger {
    color: #b91c1c;
  }

  .tool-btn.danger:hover {
    background: #fef2f2;
    color: #991b1b;
  }

  .toolbar.outside .danger-group {
    margin-left: 1px;
  }

  .tool-popover-anchor {
    position: relative;
    display: inline-flex;
  }

  .color-swatch {
    width: 17px;
    height: 17px;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 4px;
    background: var(--swatch-color);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.48);
  }

  .text-color-icon {
    height: 19px;
    min-width: 17px;
    display: grid;
    place-items: start center;
    border-bottom: 3px solid var(--text-swatch-color);
    font: 600 15px/16px Georgia, serif;
  }

  .color-popover,
  .text-color-popover,
  .range-popover {
    position: absolute;
    bottom: calc(100% + 8px);
    z-index: 12;
    border: 1px solid rgba(148, 163, 184, 0.38);
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .color-popover,
  .text-color-popover {
    left: 50%;
    transform: translateX(-50%);
    width: 112px;
    padding: 7px;
    display: grid;
    grid-template-columns: repeat(4, 20px);
    gap: 6px;
  }

  .color-dot {
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid rgba(15, 23, 42, 0.2);
    border-radius: 50%;
    cursor: pointer;
  }

  .color-dot.active {
    outline: 2px solid #334155;
    outline-offset: 1px;
  }

  .color-picker-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 5px;
    border-top: 1px solid rgba(148, 163, 184, 0.3);
    color: #475569;
    font-size: 11px;
  }

  .color-picker-input {
    width: 26px;
    height: 20px;
    padding: 0;
    border: 1px solid rgba(15, 23, 42, 0.18);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }

  .range-popover {
    right: 0;
    width: 136px;
    padding: 8px;
  }

  .range-popover input {
    display: block;
    width: 100%;
    margin: 0;
  }

  @keyframes outside-toolbar-enter {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toolbar.outside {
      animation: none;
    }
  }

</style>
