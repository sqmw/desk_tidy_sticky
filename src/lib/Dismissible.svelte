<script>
  let {
    content,
    leftBg = "#e53935",
    leftIcon = "🗑",
    rightBg = "#607d8b",
    rightIcon = "📁",
    onSwipeLeft,
    onSwipeRight,
    threshold = 80,
  } = $props();

  let offset = $state(0);
  let startX = 0;

  /** @param {TouchEvent | MouseEvent} e */
  function getClientX(e) {
    // @ts-ignore
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  /** @param {TouchEvent | MouseEvent} e */
  function handleStart(e) {
    startX = getClientX(e);
  }

  /** @param {TouchEvent | MouseEvent} e */
  function handleMove(e) {
    const x = getClientX(e);
    offset = Math.max(-150, Math.min(150, x - startX));
  }

  function handleEnd() {
    if (offset <= -threshold) {
      onSwipeLeft?.();
    } else if (offset >= threshold) {
      onSwipeRight?.();
    }
    offset = 0;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div
  class="dismissible"
  role="group"
  style="--offset: {offset}px"
  ontouchstart={handleStart}
  ontouchmove={handleMove}
  ontouchend={handleEnd}
  onmousedown={handleStart}
  onmousemove={(e) => e.buttons === 1 && handleMove(e)}
  onmouseup={handleEnd}
  onmouseleave={handleEnd}
>
  <div class="dismissible-bg left" style="background: {leftBg}">
    <span class="dismissible-icon">{leftIcon}</span>
  </div>
  <div class="dismissible-bg right" style="background: {rightBg}">
    <span class="dismissible-icon">{rightIcon}</span>
  </div>
  <div class="dismissible-content">
    {@render content?.()}
  </div>
</div>

<style>
  .dismissible {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
  }

  .dismissible-bg {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  }

  .dismissible-bg.left {
    left: 0;
    padding-left: 20px;
    justify-content: flex-start;
  }

  .dismissible-bg.right {
    right: 0;
    padding-right: 20px;
    justify-content: flex-end;
  }

  .dismissible-content {
    position: relative;
    background: rgba(255, 255, 255, 0.85);
    transform: translateX(var(--offset, 0));
    transition: transform 0.1s ease-out;
  }
</style>
