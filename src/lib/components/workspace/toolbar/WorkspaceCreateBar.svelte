<script>
  import NoteTagsEditor from "$lib/components/note/NoteTagsEditor.svelte";

  let {
    strings,
    viewMode = "active",
    compact = false,
    newNoteText = $bindable(""),
    newNotePriority = $bindable(/** @type {number | null} */ (null)),
    newNoteTags = $bindable(/** @type {string[]} */ ([])),
    noteTagOptions = /** @type {string[]} */ ([]),
    onCreateNote = () => {},
  } = $props();

</script>

<div class="create-bar" class:compact>
  <input
    type="text"
    class="add-input"
    placeholder={strings.workspaceQuickNoteHint || strings.inputHint}
    bind:value={newNoteText}
    onkeydown={(e) => e.key === "Enter" && onCreateNote()}
  />

  <NoteTagsEditor
    {strings}
    compact={true}
    bind:tags={newNoteTags}
    bind:priority={newNotePriority}
    showPriority={true}
    suggestions={noteTagOptions}
  />

  <div class="create-actions">
    <button type="button" class="primary-btn" onclick={() => onCreateNote()}>
      <span class="primary-btn-icon" aria-hidden="true">+</span>
      {strings.workspaceCreateNote || strings.saveNote}
    </button>
  </div>
</div>

<style>
  .create-bar {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    min-width: 0;
    align-items: center;
  }

  .create-bar.compact {
    align-items: stretch;
    gap: 7px;
  }

  .create-actions {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    align-items: center;
    flex: 0 0 auto;
  }

  .create-bar.compact .create-actions {
    margin-left: auto;
  }

  .add-input {
    flex: 1 1 280px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 12px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 14px;
    padding: 9px 10px;
    outline: none;
    min-width: 0;
  }

  .create-bar.compact .add-input {
    flex: 1 1 320px;
    min-height: 38px;
  }

  .create-bar :global(.tags-editor.compact) {
    flex: 0 1 220px;
    min-width: 170px;
  }

  .create-bar.compact :global(.tags-editor.compact) {
    flex: 0 1 200px;
    min-width: 150px;
  }

  .primary-btn {
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 22%, var(--ws-border-soft, #d6e0ee));
    border-radius: 12px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, #ffffff) 0%,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 15%, #f8fbff) 100%
    );
    color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 68%, #1e293b);
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(37, 99, 235, 0.06);
    transition:
      transform 0.15s ease,
      border-color 0.16s ease,
      background 0.16s ease,
      box-shadow 0.16s ease;
    min-width: 0;
    white-space: nowrap;
  }

  .create-bar.compact .primary-btn {
    min-height: 36px;
    padding: 8px 10px;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 32%, var(--ws-border-soft, #d6e0ee));
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 14%, #ffffff) 0%,
      color-mix(in srgb, var(--ws-accent, #1d4ed8) 20%, #f4f8ff) 100%
    );
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  }

  .primary-btn-icon {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, white);
    color: color-mix(in srgb, var(--ws-accent, #1d4ed8) 78%, #1e293b);
    font-size: 14px;
    line-height: 1;
    font-weight: 800;
    flex-shrink: 0;
  }

  @media (max-width: 920px) {
    .create-bar {
      flex-wrap: wrap;
    }

    .create-bar :global(.tags-editor.compact) {
      flex-basis: 100%;
      min-width: 0;
    }

    .create-bar.compact .add-input {
      flex-basis: 100%;
    }

    .create-actions {
      justify-content: flex-start;
    }
  }
</style>
