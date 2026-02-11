<script>
  let {
    strings,
    tags = $bindable(/** @type {string[]} */ ([])),
    compact = false,
    onChange = () => {},
  } = $props();

  let inputValue = $state("");

  /** @param {string} raw */
  function normalizeTag(raw) {
    const trimmed = String(raw || "").trim().replace(/^#+/, "").trim();
    if (!trimmed) return "";
    return trimmed.slice(0, 32);
  }

  /** @param {string} raw */
  function pushTag(raw) {
    const next = normalizeTag(raw);
    if (!next) return;
    const exists = tags.some((/** @type {string} */ item) => item.toLowerCase() === next.toLowerCase());
    if (exists) return;
    tags = [...tags, next];
    onChange(tags);
  }

  /** @param {string} tag */
  function removeTag(tag) {
    tags = tags.filter((/** @type {string} */ item) => item !== tag);
    onChange(tags);
  }

  /** @param {KeyboardEvent} e */
  function onInputKeydown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      pushTag(inputValue);
      inputValue = "";
      return;
    }
    if (e.key === "Backspace" && !inputValue.trim() && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  function onInputBlur() {
    if (!inputValue.trim()) return;
    pushTag(inputValue);
    inputValue = "";
  }
</script>

<div class="tags-editor" class:compact>
  {#each tags as tag (tag)}
    <span class="tag-chip" title={tag}>
      <span class="tag-text">{tag}</span>
      <button type="button" class="tag-remove" aria-label="remove tag" onclick={() => removeTag(tag)}>×</button>
    </span>
  {/each}

  <input
    class="tag-input"
    type="text"
    bind:value={inputValue}
    placeholder={strings.tagsPlaceholder}
    onkeydown={onInputKeydown}
    onblur={onInputBlur}
  />
</div>

<style>
  .tags-editor {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    padding: 3px 8px;
    max-width: 160px;
  }

  .tag-text {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tag-remove {
    border: none;
    background: transparent;
    color: var(--ws-muted, #64748b);
    cursor: pointer;
    line-height: 1;
    font-size: 14px;
    padding: 0;
  }

  .tag-remove:hover {
    color: #dc2626;
  }

  .tag-input {
    border: 1px dashed var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #1f2937);
    font-size: 12px;
    padding: 5px 10px;
    min-width: 118px;
    max-width: 180px;
    outline: none;
  }

  .tag-input:focus {
    border-color: var(--ws-border-active, #94a3b8);
  }

  .tags-editor.compact .tag-chip {
    padding: 2px 7px;
  }

  .tags-editor.compact .tag-text {
    font-size: 11px;
  }

  .tags-editor.compact .tag-input {
    min-width: 90px;
    max-width: 130px;
    padding: 4px 8px;
    font-size: 11px;
  }
</style>
