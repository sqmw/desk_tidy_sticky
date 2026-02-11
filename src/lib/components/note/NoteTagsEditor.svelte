<script>
  let {
    strings,
    tags = $bindable(/** @type {string[]} */ ([])),
    suggestions = /** @type {string[]} */ ([]),
    compact = false,
    onChange = () => {},
  } = $props();

  let inputValue = $state("");
  let focused = $state(false);

  /** @param {string} raw */
  function normalizeTag(raw) {
    const trimmed = String(raw || "").trim().replace(/^#+/, "").trim();
    if (!trimmed) return "";
    return trimmed.slice(0, 32);
  }

  /** @param {string} raw */
  function normalizedKey(raw) {
    return normalizeTag(raw).toLocaleLowerCase();
  }

  /** @param {string} raw */
  function pushTag(raw) {
    const next = normalizeTag(raw);
    if (!next) return;
    const exists = tags.some((/** @type {string} */ item) => normalizedKey(item) === normalizedKey(next));
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
    if (e.key === "Escape") {
      focused = false;
    }
  }

  function onInputBlur() {
    focused = false;
    if (!inputValue.trim()) return;
    pushTag(inputValue);
    inputValue = "";
  }

  const filteredSuggestions = $derived.by(() => {
    const query = normalizeTag(inputValue).toLocaleLowerCase();
    const existed = new Set(tags.map((/** @type {string} */ t) => normalizedKey(t)).filter(Boolean));
    const unique = new Set();
    /** @type {string[]} */
    const items = [];
    for (const raw of suggestions) {
      const text = normalizeTag(raw);
      const key = text.toLocaleLowerCase();
      if (!text || existed.has(key) || unique.has(key)) continue;
      if (query && !key.includes(query)) continue;
      unique.add(key);
      items.push(text);
    }
    return items.slice(0, 12);
  });

  /** @param {string} tag */
  function pickSuggestion(tag) {
    pushTag(tag);
    inputValue = "";
    focused = true;
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
    onfocus={() => (focused = true)}
    onblur={onInputBlur}
  />

  {#if focused && filteredSuggestions.length > 0}
    <div class="tag-suggestions">
      {#each filteredSuggestions as item (item)}
        <button
          type="button"
          class="tag-suggestion-item"
          onmousedown={(e) => e.preventDefault()}
          onclick={() => pickSuggestion(item)}
          title={`#${item}`}
        >
          #{item}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tags-editor {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
    position: relative;
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

  .tag-suggestions {
    position: absolute;
    z-index: 18;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ws-panel-bg, #ffffff) 94%, transparent);
    backdrop-filter: blur(8px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 7px;
    max-height: 148px;
    overflow: auto;
  }

  .tag-suggestion-item {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    padding: 4px 8px;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tag-suggestion-item:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
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

  .tags-editor.compact .tag-suggestions {
    padding: 6px;
    gap: 4px;
    max-height: 132px;
  }
</style>
