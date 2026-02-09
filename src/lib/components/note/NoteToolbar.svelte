<script>
  let {
    strings,
    isEditing = false,
    isBlockEditor = false,
    note = null,
    showPalette = false,
    showTextColorPalette = false,
    showOpacityPanel = false,
    showFrostPanel = false,
    showOpacityValue = false,
    showFrostValue = false,
    opacityDraft = 1,
    frostDraft = 0,
    noteBgColor = "",
    noteTextColor = "",
    backgroundPickerValue = "#fff9c4",
    textPickerValue = "#1f2937",
    noteColors = [],
    noteTextColors = [],
    onToggleEdit = () => {},
    onToggleEditorLayoutMode = () => {},
    editorModeHint = () => "",
    onToggleTopmost = () => {},
    onToggleMouseInteraction = () => {},
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
</script>

<div class="toolbar-mask" aria-hidden="true"></div>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="toolbar">
  <div class="toolbar-drag-pad"></div>
  <button class="tool-btn" onclick={() => onToggleEdit()} title={isEditing ? strings.saveNote : strings.edit}>
    {#if isEditing}
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5a2 2 0 00-2 2v14l4-4h10a2 2 0 002-2V5a2 2 0 00-2-2zm-1 8H8V9h8v2z"/></svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0L15.13 5.1l3.75 3.75 1.83-1.81z"/></svg>
    {/if}
  </button>

  {#if isEditing}
    <button class="tool-btn" onclick={() => onToggleEditorLayoutMode()} title={editorModeHint()}>
      {#if isBlockEditor}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="6" width="14" height="12" rx="2"></rect>
          <path d="M8 10h8"></path>
          <path d="M8 13h6"></path>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="5" width="16" height="14" rx="2"></rect>
          <path d="M7.5 9h9"></path>
          <path d="M7.5 12h9"></path>
          <path d="M7.5 15h6"></path>
        </svg>
      {/if}
    </button>
  {/if}

  <button
    class="tool-btn"
    class:active={!!note?.isAlwaysOnTop}
    onclick={() => onToggleTopmost()}
    title={note?.isAlwaysOnTop ? strings.pinToBottom : strings.pinToTop}
  >
    {#if note?.isAlwaysOnTop}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="14.5" width="14" height="4.5" rx="1.6"></rect>
        <path d="M12 4.5v8"></path>
        <path d="M8.8 9.6 12 12.8l3.2-3.2"></path>
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="4.8" width="14" height="4.5" rx="1.6"></rect>
        <path d="M12 19.5v-8"></path>
        <path d="M8.8 14.4 12 11.2l3.2 3.2"></path>
      </svg>
    {/if}
  </button>

  <button class="tool-btn" onclick={() => onToggleMouseInteraction()} title={strings.overlayClickThrough}>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3.87 0-7 3.13-7 7v6c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7zm5 13c0 2.76-2.24 5-5 5s-5-2.24-5-5v-4h10v4zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5H7z"/></svg>
  </button>

  <button class="tool-btn color-trigger" onclick={() => onTogglePalette()} title="Change color">🎨</button>
  <button class="tool-btn text-color-trigger" onclick={() => onToggleTextColorPalette()} title={strings.textColor}>A</button>

  <div class="tool-popover-anchor">
    <button
      class="tool-btn opacity-trigger"
      onclick={() => onToggleOpacityPanel()}
      onwheel={(event) => onOpacityIconWheel(event)}
      title={strings.glassAdjust}
    >◐</button>
    {#if showOpacityPanel}
      <div class="opacity-popover">
        <input
          class="opacity-slider"
          type="range"
          min="0.35"
          max="1"
          step="0.01"
          value={opacityDraft}
          oninput={(event) => onOpacityInput(event)}
          onwheel={(event) => onOpacityWheel(event)}
        />
        {#if showOpacityValue}
          <div class="opacity-value">{Math.round(opacityDraft * 100)}%</div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="tool-popover-anchor">
    <button
      class="tool-btn frost-trigger"
      onclick={() => onToggleFrostPanel()}
      onwheel={(event) => onFrostIconWheel(event)}
      title={strings.frost}
    >❆</button>
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
        {#if showFrostValue}
          <div class="frost-value">{Math.round(frostDraft * 100)}%</div>
        {/if}
      </div>
    {/if}
  </div>

  <button class="tool-btn" onclick={() => onToggleDone()} title={note?.isDone ? strings.markUndone : strings.markDone}>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z"/></svg>
  </button>

  <button class="tool-btn" onclick={() => onToggleArchive()} title={note?.isArchived ? strings.unarchive : strings.archive}>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>
  </button>

  <button class="tool-btn" onclick={() => onUnpin()} title={strings.unpinNote}>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2zm-2-2h-4V4h4v6z"/></svg>
  </button>

  <button class="tool-btn danger" onclick={() => onMoveToTrash()} title={strings.delete}>
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
  </button>

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
    left: 8px;
    right: 8px;
    bottom: 8px;
    min-height: 36px;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    opacity: 0;
    transition: opacity 0.2s;
    gap: 2px;
    pointer-events: none;
    z-index: 2;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
  }

  .toolbar-drag-pad {
    flex: 1;
    min-height: 28px;
  }

  .toolbar-mask {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 96px;
    background: linear-gradient(to top, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.78) 45%, rgba(255, 255, 255, 0) 100%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 1;
  }

  :global(.note-window:hover) .toolbar {
    opacity: 1;
    pointer-events: auto;
  }

  :global(.note-window:hover) .toolbar-mask {
    opacity: 1;
  }

  .tool-btn {
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.52);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    padding: 0;
    font-size: 13px;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.8);
    color: #111827;
  }

  .tool-btn.active {
    color: #0f4c81;
  }

  .tool-btn svg {
    width: 14px;
    height: 14px;
    display: block;
  }

  .tool-btn.danger {
    color: #b91c1c;
  }

  .tool-popover-anchor {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .color-popover {
    position: absolute;
    right: 84px;
    bottom: 34px;
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
    right: 114px;
    bottom: 34px;
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

  .opacity-popover {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 34px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  .opacity-slider {
    width: 110px;
    cursor: pointer;
  }

  .opacity-value {
    font-size: 11px;
    color: #1f2937;
    text-align: right;
    font-weight: 600;
    user-select: none;
  }

  .frost-popover {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 34px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  .frost-slider {
    width: 110px;
    cursor: pointer;
  }

  .frost-value {
    font-size: 11px;
    color: #1f2937;
    text-align: right;
    font-weight: 600;
    user-select: none;
  }

  .color-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    padding: 0;
  }

  .text-color-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    padding: 0;
  }

  .color-dot.active {
    outline: 2px solid #374151;
    outline-offset: 1px;
  }

  .text-color-dot.active {
    outline: 2px solid #374151;
    outline-offset: 1px;
  }
</style>
