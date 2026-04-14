<script>
  let {
    priorityMenuNote = null,
    strings,
    usedTags = [],
    noteTags = () => [],
    hasTagText = () => false,
    priorityMenuStyle = "",
    priorityMenuTagDraft = $bindable(""),
    priorityMenuOverlayEl = $bindable(/** @type {HTMLDivElement | null} */ (null)),
    priorityMenuInputEl = $bindable(/** @type {HTMLInputElement | null} */ (null)),
    selectPriority = async () => {},
    toggleCustomTag = async () => {},
    onPriorityTagInput = async () => {},
    createCustomTag = async () => {},
  } = $props();
</script>

{#if priorityMenuNote}
  <div class="priority-menu priority-menu-overlay" bind:this={priorityMenuOverlayEl} style={priorityMenuStyle} data-no-drag="true">
    <button type="button" class="priority-item" onclick={() => selectPriority(priorityMenuNote, null)}>
      {strings.priorityUnassigned}
    </button>
    <button type="button" class="priority-item" onclick={() => selectPriority(priorityMenuNote, 1)}>Q1</button>
    <button type="button" class="priority-item" onclick={() => selectPriority(priorityMenuNote, 2)}>Q2</button>
    <button type="button" class="priority-item" onclick={() => selectPriority(priorityMenuNote, 3)}>Q3</button>
    <button type="button" class="priority-item" onclick={() => selectPriority(priorityMenuNote, 4)}>Q4</button>
    {#if usedTags.length > 0}
      <div class="priority-menu-divider"></div>
      <div class="priority-menu-caption">{strings.workspaceTagsFilter || strings.tags}</div>
      <div class="priority-tag-list">
        {#each usedTags as tag (tag)}
          <button
            type="button"
            class="priority-tag-item"
            class:active={hasTagText(noteTags(priorityMenuNote), tag)}
            onclick={() => toggleCustomTag(priorityMenuNote, tag)}
            title={`#${tag}`}
          >
            #{tag}
          </button>
        {/each}
      </div>
    {/if}
    <div class="priority-menu-divider"></div>
    <div class="priority-tag-create">
      <input
        type="text"
        class="priority-tag-input"
        bind:this={priorityMenuInputEl}
        value={priorityMenuTagDraft}
        placeholder={strings.tagsPlaceholder}
        oninput={(e) => onPriorityTagInput(e)}
        onkeydown={(e) => e.key === "Enter" && createCustomTag(priorityMenuNote)}
      />
      <div class="priority-tag-actions">
        <button type="button" class="priority-tag-add" onclick={() => createCustomTag(priorityMenuNote)}>
          {strings.workspaceCreateTag || strings.tags}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .priority-menu {
    position: fixed;
    z-index: 50;
    border: 1px solid var(--ws-border, #dbe5f1);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, #ffffff) 92%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
    display: flex;
    flex-direction: column;
    padding: 4px;
    gap: 2px;
  }

  .priority-menu-overlay {
    max-width: calc(100vw - 32px);
  }

  .priority-item {
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--ws-text, #334155);
    font-size: 12px;
    text-align: left;
    padding: 6px 8px;
    cursor: pointer;
  }

  .priority-item:hover {
    border-color: var(--ws-border-soft, #d7dfec);
    background: var(--ws-btn-hover, #f4f8ff);
    color: var(--ws-text-strong, #1f2937);
  }

  .priority-menu-divider {
    height: 1px;
    margin: 2px 2px 1px;
    background: color-mix(in srgb, var(--ws-border-soft, #d7dfec) 80%, transparent);
  }

  .priority-menu-caption {
    font-size: 10px;
    line-height: 1.2;
    color: var(--ws-muted, #64748b);
    padding: 4px 6px 2px;
  }

  .priority-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 2px 4px 4px;
    max-width: 100%;
  }

  .priority-tag-item {
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 999px;
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-text, #334155);
    font-size: 11px;
    line-height: 1;
    padding: 5px 8px;
    max-width: 180px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .priority-tag-item:hover {
    border-color: var(--ws-border-hover, #c9d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .priority-tag-item.active {
    border-color: var(--ws-border-active, #94a3b8);
    background: color-mix(in srgb, var(--ws-btn-active, #e2e8f0) 86%, transparent);
    color: var(--ws-text-strong, #1f2937);
  }

  .priority-tag-create {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 4px 4px;
  }

  .priority-tag-input {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 8px;
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-text, #334155);
    padding: 7px 10px;
    font-size: 11px;
    line-height: 1.2;
    outline: none;
  }

  .priority-tag-input:focus {
    border-color: var(--ws-border-active, #94a3b8);
  }

  .priority-tag-actions {
    display: flex;
    justify-content: flex-end;
  }

  .priority-tag-add {
    border: 1px solid var(--ws-border-soft, #d7dfec);
    border-radius: 8px;
    background: var(--ws-btn-bg, #f8fafc);
    color: var(--ws-text, #334155);
    font-size: 11px;
    font-weight: 700;
    min-height: 30px;
    padding: 6px 10px;
    cursor: pointer;
    white-space: nowrap;
  }

  .priority-tag-add:hover {
    border-color: var(--ws-border-hover, #c9d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }
</style>
