<script>
  import { normalizePriority } from "$lib/panel/note-priority.js";

  let {
    strings,
    value = $bindable(/** @type {number | null} */ (null)),
    compact = false,
    label = "",
    allowUnassigned = true,
    onChange = () => {},
  } = $props();

  /** @param {string} raw */
  function setFromRaw(raw) {
    if (raw === "none") {
      value = null;
      onChange(null);
      return;
    }
    value = normalizePriority(Number(raw));
    onChange(value);
  }
</script>

<div class="tag-select" class:compact>
  {#if !compact}
    <span class="tag-label">{label || strings.priority}</span>
  {/if}
  <select
    class="tag-input"
    value={value == null ? "none" : String(value)}
    onchange={(e) => setFromRaw(/** @type {HTMLSelectElement} */ (e.currentTarget).value)}
    title={label || strings.priority}
  >
    {#if allowUnassigned}
      <option value="none">{strings.priorityUnassigned}</option>
    {/if}
    <option value="1">Q1</option>
    <option value="2">Q2</option>
    <option value="3">Q3</option>
    <option value="4">Q4</option>
  </select>
</div>

<style>
  .tag-select {
    min-width: 110px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tag-label {
    font-size: 12px;
    color: var(--ws-muted, #64748b);
    font-weight: 600;
    white-space: nowrap;
  }

  .tag-input {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 700;
    min-height: 34px;
    outline: none;
    cursor: pointer;
    width: 100%;
    transition:
      border-color 0.16s ease,
      background 0.16s ease;
  }

  .tag-input:hover {
    border-color: var(--ws-border-hover, #c6d5e8);
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .tag-select.compact {
    min-width: 76px;
  }

  .tag-select.compact .tag-input {
    min-height: 28px;
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 8px;
  }
</style>
