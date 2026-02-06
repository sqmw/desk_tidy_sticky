<script>
  let {
    content,
    leftBg = "#e53935",
    leftIcon,
    rightBg = "#607d8b",
    rightIcon,
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
    // Limit swipe to reasonable bounds but enough to feel "smooth" (e.g., 500px or window width)
    // Or just let it slide freely. User asked for "not dragging to the end".
    offset = x - startX;
  }

  function handleEnd() {
    let dismissed = false;
    if (offset <= -threshold) {
      onSwipeLeft?.();
      dismissed = true;
    } else if (offset >= threshold) {
      onSwipeRight?.();
      dismissed = true;
    }

    // Only snap back if NOT dismissed.
    // If dismissed, we leave the offset as is so it slides out (via parent transition)
    // without jumping back to center first.
    if (!dismissed) {
      offset = 0;
    }
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
  <div
    class="dismissible-bg-container"
    style="
      background-color: {offset > 0 ? leftBg : rightBg};
      opacity: {Math.abs(offset) > 0 ? 1 : 0};
    "
  >
    <div class="dismissible-icon left" style="opacity: {offset > 0 ? 1 : 0}">
      {#if typeof leftIcon === "function"}
        {@render leftIcon()}
      {/if}
    </div>
    <div class="dismissible-icon right" style="opacity: {offset < 0 ? 1 : 0}">
      {#if typeof rightIcon === "function"}
        {@render rightIcon()}
      {/if}
    </div>
  </div>
  <div class="dismissible-content">
    {#if typeof content === "function"}
      {@render content()}
    {/if}
  </div>
</div>

<style>
  .dismissible {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 6px; /* Moved margin here to ensure size match */
  }

  .dismissible-bg-container {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    color: white;
    font-size: 20px;
    transition: background-color 0.2s;
  }

  /* Icons absolute positioning to stay fixed while container fills */
  .dismissible-icon {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
  }

  .dismissible-icon.left {
    left: 20px;
  }

  .dismissible-icon.right {
    right: 20px;
  }

  .dismissible-content {
    position: relative;
    background: rgba(255, 255, 255, 0.85); /* Default bg, opaque enough */
    transform: translateX(var(--offset, 0));
    transition: transform 0.1s ease-out;
    height: 100%; /* Ensure it fills height */
  }
</style>
