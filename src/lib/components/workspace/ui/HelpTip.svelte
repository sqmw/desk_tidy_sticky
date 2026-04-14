<script>
  let { text = "", ariaLabel = "Help" } = $props();
</script>

<button type="button" class="help-tip" aria-label={ariaLabel} title={text} data-no-drag="true">
  ?
</button>

<style>
  .help-tip {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ws-border-soft, #d9e2ef) 78%, transparent);
    background: color-mix(in srgb, var(--ws-btn-bg, #fbfdff) 86%, transparent);
    color: var(--ws-muted, #64748b);
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    display: inline-grid;
    place-items: center;
    cursor: help;
    padding: 0;
  }

  .help-tip:hover {
    border-color: color-mix(in srgb, var(--ws-border-hover, #c6d5e8) 85%, transparent);
    background: color-mix(in srgb, var(--ws-accent, #1d4ed8) 10%, var(--ws-btn-bg, #fbfdff));
    color: var(--ws-text-strong, #0f172a);
  }

  .help-tip:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ws-accent, #1d4ed8) 16%, transparent);
  }
</style>
