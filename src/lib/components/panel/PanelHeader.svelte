<script>
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";
  import HeaderActions from "$lib/components/panel/HeaderActions.svelte";
  import SortModeMenu from "$lib/components/panel/SortModeMenu.svelte";
  import SearchBar from "$lib/components/panel/SearchBar.svelte";

  let {
    strings,
    NOTE_VIEW_MODES,
    showSettings = $bindable(),
    newNoteText = $bindable(),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    noteTagOptions = /** @type {string[]} */ ([]),
    noteInputEl = $bindable(),
    viewMode,
    sortMode,
    isSortMenuOpen = $bindable(),
    searchQuery = $bindable(),
    proMode,
    showStickyToggleOnHome,
    stickiesVisible,
    toggleStickiesVisibility,
    startWindowDragPointer,
    hideWindow,
    minimizeWindow,
    switchToWorkspace,
    saveNote,
    setViewMode,
    setSortMode,
    emptyTrash,
  } = $props();

  const isMac =
    typeof navigator !== "undefined" &&
    /mac/i.test(String(navigator.userAgent || navigator.platform || ""));

  const inputPlaceholder = $derived(
    proMode
      ? strings.inputHint.replace(/([（(]回车保存[）)])|([（(]Enter to save[）)])/, "").trim()
      : strings.inputHint
  );

  const appTitle = $derived(
    proMode
      ? strings.appName.replace(/便签|便笺|Sticky/i, "").trim().toUpperCase()
      : strings.appName.toUpperCase()
  );
</script>

<header class="panel-header">
  <div class="header-row">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="header-drag" onpointerdown={startWindowDragPointer}>
      {#if isMac}
        <div class="mac-traffic-controls" onpointerdown={(e) => e.stopPropagation()}>
          <button
            type="button"
            class="mac-traffic-btn traffic-close"
            title={strings.hideWindow}
            onclick={hideWindow}
            onpointerdown={(e) => e.stopPropagation()}
          >
            <span class="traffic-glyph">×</span>
          </button>
          <button
            type="button"
            class="mac-traffic-btn traffic-minimize"
            title={strings.minimizeWindow}
            onclick={minimizeWindow}
            onpointerdown={(e) => e.stopPropagation()}
          >
            <span class="traffic-glyph">−</span>
          </button>
        </div>
      {/if}
      <span class="app-title">{appTitle}</span>
    </div>

    <HeaderActions
      {strings}
      showWindowControls={!isMac}
      {hideWindow}
      {minimizeWindow}
      {switchToWorkspace}
      onOpenSettings={() => (showSettings = true)}
    />
  </div>

  <div class="input-row" data-tauri-drag-region="false">
    <input
      type="text"
      class="note-input"
      placeholder={inputPlaceholder}
      bind:value={newNoteText}
      bind:this={noteInputEl}
      onkeydown={(e) => e.key === "Enter" && saveNote(false)}
    />
    <NoteTagsEditor
      {strings}
      compact={true}
      bind:tags={newNoteTags}
      bind:priority={newNotePriority}
      showPriority={true}
      suggestions={noteTagOptions}
    />
    <button type="button" class="send-btn" onclick={() => saveNote(false)} title={strings.saveNote}>
      ➤
    </button>
  </div>

  <div class="tabs-row" data-tauri-drag-region="false">
    <div class="tabs-main">
      <div class="view-tabs">
        {#each NOTE_VIEW_MODES as mode}
          <button
            type="button"
            class="tab"
            class:active={viewMode === mode}
            onclick={() => setViewMode(mode)}
          >
            {mode === "active"
              ? strings.compactActive
              : mode === "archived"
                ? strings.archived
                : strings.trash}
          </button>
        {/each}
      </div>

      <SortModeMenu {strings} {sortMode} bind:isSortMenuOpen {setSortMode} />

      {#if viewMode === "trash"}
        <button
          type="button"
          class="icon-btn"
          title={strings.emptyTrash}
          onclick={emptyTrash}
          style="margin-left: 2px;"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="color: #ef5350;">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      {/if}
    </div>

    <div class="tabs-actions">
      {#if showStickyToggleOnHome}
        <button
          type="button"
          class="icon-btn"
          class:active={stickiesVisible}
          title={stickiesVisible ? strings.trayStickiesClose : strings.trayStickiesShow}
          onclick={toggleStickiesVisibility}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            {#if stickiesVisible}
              <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            {:else}
              <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="13" rx="2" />
                <path d="M12 16v4 M8 20h8" />
              </g>
            {/if}
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <SearchBar {strings} bind:searchQuery {proMode} />
</header>

<style>
  .panel-header {
    background: var(--surface);
    border-bottom: 1px solid var(--divider);
    padding: 0 12px;
    flex-shrink: 0;
    user-select: none;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-drag {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    cursor: default;
  }

  .mac-traffic-controls {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-right: 2px;
    flex-shrink: 0;
  }

  .mac-traffic-btn {
    width: 12px;
    height: 12px;
    min-width: 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .traffic-close {
    background: #ff5f57;
    border-color: #de4941;
    color: #7a0d08;
  }

  .traffic-minimize {
    background: #ffbd2e;
    border-color: #dfa123;
    color: #7a4d00;
  }

  .traffic-glyph {
    font-size: 9px;
    line-height: 1;
    font-weight: 700;
    opacity: 0;
    transition: opacity 0.14s ease;
    transform: translateY(-0.25px);
  }

  .mac-traffic-controls:hover .traffic-glyph,
  .mac-traffic-btn:focus-visible .traffic-glyph {
    opacity: 0.72;
  }

  .app-title {
    font-size: 11px;
    letter-spacing: 0.6px;
    color: #666;
    font-weight: 600;
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .note-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    padding: 2px 0;
    outline: none;
    user-select: text;
  }

  .send-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: var(--primary);
  }

  .tabs-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .input-row :global(.tags-editor.compact) {
    flex: 0 1 188px;
    min-width: 132px;
  }

  .tabs-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }

  .tabs-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .view-tabs {
    display: flex;
    background: #fff;
    border-radius: 6px;
    border: 1px solid var(--divider);
    padding: 1px;
    flex-shrink: 0;
  }

  .tab {
    padding: 2px 6px;
    font-size: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
  }

  .tab.active {
    background: var(--primary);
    color: #fff;
    font-weight: 600;
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


  .tabs-main::-webkit-scrollbar {
    height: 4px;
  }

  .tabs-main::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--divider, #e4e7ed) 75%, #8fa3b8);
    border-radius: 999px;
  }
</style>
