<script>
  let {
    strings,
    isMaximized = false,
    onMinimize = () => {},
    onToggleMaximize = () => {},
    onHide = () => {},
  } = $props();
</script>

<div class="workspace-mac-traffic">
  <button
    type="button"
    class="traffic-btn traffic-close"
    onclick={() => onHide()}
    onpointerdown={(e) => e.stopPropagation()}
    title={strings.hideWindow}
  >
    <span class="traffic-glyph" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none">
        <path d="M3 3 9 9M9 3 3 9"></path>
      </svg>
    </span>
  </button>
  <button
    type="button"
    class="traffic-btn traffic-minimize"
    onclick={() => onMinimize()}
    onpointerdown={(e) => e.stopPropagation()}
    title={strings.minimizeWindow}
  >
    <span class="traffic-glyph" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6h7"></path>
      </svg>
    </span>
  </button>
  <button
    type="button"
    class="traffic-btn traffic-maximize"
    onclick={() => onToggleMaximize()}
    onpointerdown={(e) => e.stopPropagation()}
    title={isMaximized ? strings.restoreWindow : strings.maximizeWindow}
  >
    <span class="traffic-glyph" aria-hidden="true">
      <svg class="maximize-glyph" viewBox="0 0 12 12" fill="none">
        <path d="M6 2.9v6.2"></path>
        <path d="M2.9 6h6.2"></path>
      </svg>
    </span>
  </button>
</div>

<style>
  .workspace-mac-traffic {
    position: absolute;
    left: 14px;
    top: 16px;
    z-index: 4200;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    pointer-events: auto;
  }

  .traffic-btn {
    appearance: none;
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    min-width: 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
  }

  .traffic-close {
    background: #ff5f57;
    border-color: #e0443e;
    color: #4d0f0c;
  }

  .traffic-minimize {
    background: #febc2e;
    border-color: #d8a128;
    color: #5f3e03;
  }

  .traffic-maximize {
    background: #28c840;
    border-color: #1faa36;
    color: #0f4d1d;
  }

  .traffic-glyph {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.9;
    transition: opacity 0.14s ease, transform 0.14s ease;
    pointer-events: none;
  }

  .traffic-glyph svg {
    width: 7.2px;
    height: 7.2px;
    stroke: currentColor;
    stroke-width: 1.45;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: translate(0.24px, 0.24px);
  }

  .traffic-maximize .maximize-glyph {
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .traffic-btn:hover .traffic-glyph,
  .traffic-btn:focus-visible .traffic-glyph {
    opacity: 1;
    transform: scale(1.03);
  }
</style>
