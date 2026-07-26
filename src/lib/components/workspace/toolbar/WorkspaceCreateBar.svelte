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
  <div class="composer">
    <span class="composer-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17z"></path>
        <path d="M13.5 6.5 17 10"></path>
      </svg>
    </span>
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

    <button type="button" class="primary-btn" onclick={() => onCreateNote()}>
      <svg class="primary-btn-icon" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
      {strings.workspaceCreateNote || strings.saveNote}
    </button>
  </div>
</div>

<style>
  .create-bar {
    display: flex;
    min-width: 0;
    align-items: stretch;
  }

  .composer {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    padding: 5px 6px 5px 12px;
    border: 1px solid var(--ws-border, #e3e9f2);
    border-radius: var(--ws-radius-md, 12px);
    background: var(--ws-card-bg, #ffffff);
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06));
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .composer:focus-within {
    border-color: color-mix(in srgb, var(--ws-accent, #2563eb) 45%, var(--ws-border, #e3e9f2));
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  .composer-icon {
    flex: 0 0 auto;
    display: inline-grid;
    place-items: center;
    color: var(--ws-muted, #71809b);
  }

  .add-input {
    flex: 1 1 240px;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--ws-text-strong, #101828);
    font-size: 14px;
    padding: 6px 0;
    outline: none;
  }

  .add-input::placeholder {
    color: color-mix(in srgb, var(--ws-muted, #71809b) 82%, transparent);
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
    flex: 0 0 auto;
    border: none;
    border-radius: var(--ws-radius-sm, 8px);
    background: var(--ws-accent, #2563eb);
    color: #fff;
    padding: 0 14px;
    min-height: 34px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
    box-shadow: var(--ws-shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06));
    transition: background 0.16s ease, box-shadow 0.16s ease, transform 0.12s ease;
  }

  .primary-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #2563eb) 88%, #0f172a);
  }

  .primary-btn:active {
    transform: scale(0.98);
  }

  .primary-btn:focus-visible {
    outline: none;
    box-shadow: var(--ws-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.16));
  }

  /* Dark presets use a light accent; a solid fill with white text loses contrast there,
     so switch to a tinted button that keeps the accent hue. */
  :global(.workspace.theme-dark) .primary-btn {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent, #7aa2ff) 42%, transparent);
    color: var(--ws-text-strong, #eef2f9);
  }

  :global(.workspace.theme-dark) .primary-btn:hover {
    background: color-mix(in srgb, var(--ws-accent, #7aa2ff) 32%, transparent);
  }

  .primary-btn-icon {
    flex-shrink: 0;
  }

  @media (max-width: 920px) {
    .composer {
      flex-wrap: wrap;
      padding: 6px 8px 6px 12px;
    }

    .create-bar :global(.tags-editor.compact) {
      flex-basis: 100%;
      min-width: 0;
    }

    .create-bar.compact .add-input {
      flex-basis: 100%;
    }
  }
</style>
