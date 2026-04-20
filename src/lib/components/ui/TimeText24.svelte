<script>
  /**
   * 24-hour time input (`HH:MM`), independent from OS 12h/24h locale UI.
   * The value is normalized on blur (and on Enter).
   */
  let {
    value = $bindable("09:00"),
    class: className = "",
    disabled = false,
    placeholder = "HH:MM",
    id = "",
    listId = "",
    stepMinutes = 15,
  } = $props();

  /**
   * @param {unknown} raw
   * @param {string} fallback
   */
  function normalizeTimeText(raw, fallback) {
    const text = String(raw ?? "").trim();
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(text);
    if (!m) return fallback;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallback;
    const safeH = Math.max(0, Math.min(23, Math.floor(hh)));
    const safeM = Math.max(0, Math.min(59, Math.floor(mm)));
    return `${String(safeH).padStart(2, "0")}:${String(safeM).padStart(2, "0")}`;
  }

  function commit() {
    value = normalizeTimeText(value, "09:00");
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (e.key === "Enter") commit();
  }

  /**
   * @param {number} step
   */
  function buildTimeOptions(step) {
    const safeStep = Math.max(1, Math.min(60, Math.floor(Number(step || 15))));
    /** @type {string[]} */
    const options = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += safeStep) {
      const hh = Math.floor(minutes / 60);
      const mm = minutes % 60;
      options.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
    return options;
  }

  const timeOptions = $derived(buildTimeOptions(stepMinutes));
  const effectiveListId = $derived(listId || (id ? `${id}-time-list` : ""));
</script>

<input
  type="text"
  {id}
  class={`time-text-24 ${className}`.trim()}
  inputmode="numeric"
  autocapitalize="off"
  autocomplete="off"
  spellcheck="false"
  placeholder={placeholder}
  disabled={disabled}
  bind:value
  pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
  list={effectiveListId || undefined}
  onblur={commit}
  onkeydown={onKeyDown}
/>

{#if effectiveListId}
  <datalist id={effectiveListId}>
    {#each timeOptions as t}
      <option value={t}></option>
    {/each}
  </datalist>
{/if}

<style>
  .time-text-24 {
    width: 100%;
  }
</style>
