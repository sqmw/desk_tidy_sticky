<script>
  import CreateTagSelect from "$lib/components/note/CreateTagSelect.svelte";
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";

  let {
    strings,
    viewMode = "active",
    newNoteText = $bindable(""),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    onSave = () => {},
    onCreateLongDoc = () => {},
  } = $props();

  const isQuadrantView = $derived(viewMode === "quadrant");
</script>

<div class="create-bar">
  <input
    type="text"
    class="add-input"
    placeholder={strings.workspaceQuickNoteHint || strings.inputHint}
    bind:value={newNoteText}
    onkeydown={(e) => e.key === "Enter" && onSave()}
  />

  {#if isQuadrantView}
    <CreateTagSelect
      {strings}
      label={strings.quadrantTag || strings.priority}
      allowUnassigned={false}
      bind:value={newNotePriority}
    />
  {/if}
  <NoteTagsEditor {strings} compact={true} bind:tags={newNoteTags} />

  <div class="create-actions">
    <button type="button" class="primary-btn" onclick={() => onSave()}>
      {strings.workspaceCreateNote || strings.saveNote}
    </button>
    <button type="button" class="ghost-btn" onclick={() => onCreateLongDoc()}>
      {strings.workspaceCreateLongDoc || strings.edit}
    </button>
  </div>
</div>

<style>
  .create-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    align-items: center;
  }

  .create-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .add-input {
    flex: 2 1 320px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
    min-width: 0;
  }

  .create-bar :global(.tag-select) {
    flex: 0 0 118px;
    min-width: 108px;
  }

  .create-bar :global(.tags-editor.compact) {
    flex: 1 1 240px;
    min-width: 170px;
  }

  .primary-btn {
    border: 1px solid var(--ws-border-active, #2f4368);
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ws-accent, #1d4ed8) 26%, #334155) 0%, #273a57 100%);
    color: #f8fbff;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    transition: transform 0.15s ease;
    min-width: 94px;
    white-space: nowrap;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
  }

  .ghost-btn {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    min-width: 96px;
    white-space: nowrap;
    transition:
      border-color 0.16s ease,
      background 0.16s ease,
      transform 0.15s ease;
  }

  .ghost-btn:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
    transform: translateY(-1px);
  }

  @media (max-width: 920px) {
    .create-bar :global(.tags-editor.compact) {
      flex-basis: 100%;
      min-width: 0;
    }

    .create-actions {
      justify-content: flex-start;
    }
  }
</style>
