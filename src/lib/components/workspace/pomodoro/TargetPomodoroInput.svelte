<script>
  let {
    value = $bindable(1),
    min = 1,
    max = 24,
    title = "",
  } = $props();

  /**
   * @param {unknown} next
   */
  function clamp(next) {
    const n = Number(next);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  /**
   * @param {number} delta
   */
  function step(delta) {
    value = clamp(Number(value || min) + delta);
  }

  /** @param {WheelEvent} e */
  function onWheelAdjust(e) {
    e.preventDefault();
    step(e.deltaY > 0 ? -1 : 1);
  }

  /** @param {Event} e */
  function onInput(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    value = clamp(target.value);
  }

  /** @param {Event} e */
  function onBlur(e) {
    const target = /** @type {HTMLInputElement} */ (e.currentTarget);
    value = clamp(target.value);
    target.value = String(value);
  }
</script>

<div class="target-input" onwheel={onWheelAdjust} title={title}>
  <button type="button" class="step-btn" onclick={() => step(-1)} aria-label="decrease target">
    -
  </button>
  <input
    type="text"
    inputmode="numeric"
    pattern="[0-9]*"
    value={String(value)}
    oninput={onInput}
    onblur={onBlur}
    aria-label={title}
  />
  <button type="button" class="step-btn" onclick={() => step(1)} aria-label="increase target">
    +
  </button>
</div>

<style>
  .target-input {
    height: 36px;
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 11px;
    background: var(--ws-card-bg, #fff);
    display: grid;
    grid-template-columns: 28px 1fr 28px;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 3px 10px color-mix(in srgb, #0f172a 8%, transparent);
  }

  .target-input:focus-within {
    border-color: var(--ws-border-active, #94a3b8);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent),
      0 0 0 3px color-mix(in srgb, var(--ws-accent, #1d4ed8) 12%, transparent);
  }

  .step-btn {
    border: none;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 15px;
    font-weight: 700;
    width: 100%;
    height: 100%;
    cursor: pointer;
    transition: background 0.16s ease;
  }

  .step-btn:hover {
    background: var(--ws-btn-hover, #f4f8ff);
  }

  .target-input input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: var(--ws-text-strong, #0f172a);
    background: var(--ws-card-bg, #fff);
  }

  .target-input .step-btn:first-child {
    border-right: 1px solid color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 92%, transparent);
  }

  .target-input .step-btn:last-child {
    border-left: 1px solid color-mix(in srgb, var(--ws-border-soft, #d6e0ee) 92%, transparent);
  }
</style>
