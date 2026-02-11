<script>
  import CreateTagSelect from "$lib/components/note/CreateTagSelect.svelte";

  let {
    strings,
    priority = null,
    onChangePriority = () => {},
  } = $props();

  /** @param {number | null} next */
  function handlePriorityChange(next) {
    onChangePriority(next);
  }
</script>

<div class="note-tag-bar" data-no-drag="true">
  <div class="meta-title">{strings.priority}</div>
  <CreateTagSelect
    {strings}
    value={priority}
    onChange={handlePriorityChange}
  />
</div>

<style>
  .note-tag-bar {
    border-bottom: 1px solid color-mix(in srgb, var(--ws-border-soft, #dbe4ef) 90%, transparent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--ws-btn-bg, rgba(255, 255, 255, 0.7)) 86%, transparent);
  }

  .meta-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--ws-muted, #64748b);
    white-space: nowrap;
  }

  .note-tag-bar :global(.tag-select) {
    min-width: 128px;
  }
</style>
