<script>
  let {
    content,
    leftBg = "#e53935",
    leftIcon,
    rightBg = "#607d8b",
    rightIcon,
    onSwipeLeft,
    onSwipeRight,
    onVerticalDragStart = undefined,
    onVerticalDragMove = undefined,
    onVerticalDragEnd = undefined,
    threshold = 80,
    verticalThreshold = 10,
    enableVerticalDrag = true,
    verticalDragHandleSelector = "",
  } = $props();

  let offset = $state(0);
  let startX = 0;
  let startY = 0;
  /** @type {number | null} */
  let activePointerId = null;
  let pointerActive = false;
  let isDraggingVertically = $state(false);
  let directionLocked = false;
  let startedFromVerticalHandle = false;

  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function getClientX(e) {
    // @ts-ignore
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  /** @param {PointerEvent | TouchEvent | MouseEvent} e */
  function getClientY(e) {
    // @ts-ignore
    return e.touches ? e.touches[0].clientY : e.clientY;
  }

  /** @param {PointerEvent} e */
  function handleStart(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerActive = true;
    activePointerId = e.pointerId;
    startX = getClientX(e);
    startY = getClientY(e);
    offset = 0;
    directionLocked = false;
    isDraggingVertically = false;
    const target = /** @type {HTMLElement | null} */ (e.target);
    startedFromVerticalHandle = !!(
      enableVerticalDrag &&
      verticalDragHandleSelector &&
      target?.closest(verticalDragHandleSelector)
    );

    if (startedFromVerticalHandle) {
      isDraggingVertically = true;
      directionLocked = true;
      onVerticalDragStart?.(e, startY);
    }

    /** @type {HTMLElement | null} */ (e.currentTarget)?.setPointerCapture?.(
      e.pointerId,
    );
  }

  /** @param {PointerEvent} e */
  function handleMove(e) {
    if (!pointerActive || e.pointerId !== activePointerId) return;

    const x = getClientX(e);
    const y = getClientY(e);
    const deltaX = x - startX;
    const deltaY = y - startY;

    // Handle-based vertical drag starts immediately to avoid swipe conflict.
    if (isDraggingVertically) {
      onVerticalDragMove?.(e, deltaY, y);
      return;
    }

    // Lock direction on first significant movement
    if (!directionLocked && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      directionLocked = true;
      // If a vertical handle is configured, vertical reorder must start from handle.
      if (verticalDragHandleSelector) return;

      // If vertical movement is dominant, switch to vertical drag mode
      if (
        Math.abs(deltaY) > Math.abs(deltaX) * 0.75 &&
        Math.abs(deltaY) >= verticalThreshold
      ) {
        isDraggingVertically = true;
        onVerticalDragStart?.(e, y);
        return;
      }
    }
    // Horizontal swipe
    if (Math.abs(deltaX) > 2) e.preventDefault();
    offset = deltaX;
  }

  /** @param {PointerEvent} e */
  function handleEnd(e) {
    if (!pointerActive || e.pointerId !== activePointerId) return;

    if (isDraggingVertically) {
      onVerticalDragEnd?.(e, getClientY(e));
      isDraggingVertically = false;
      directionLocked = false;
      pointerActive = false;
      activePointerId = null;
      startedFromVerticalHandle = false;
      /** @type {HTMLElement | null} */ (e.currentTarget)?.releasePointerCapture?.(
        e.pointerId,
      );
      return;
    }

    let dismissed = false;
    if (offset <= -threshold) {
      onSwipeLeft?.();
      dismissed = true;
    } else if (offset >= threshold) {
      onSwipeRight?.();
      dismissed = true;
    }

    // Only snap back if NOT dismissed.
    if (!dismissed) {
      offset = 0;
    }
    directionLocked = false;
    pointerActive = false;
    activePointerId = null;
    startedFromVerticalHandle = false;
    /** @type {HTMLElement | null} */ (e.currentTarget)?.releasePointerCapture?.(
      e.pointerId,
    );
  }

  /** @param {PointerEvent} e */
  function handlePointerCancel(e) {
    if (e.pointerId !== activePointerId) return;
    offset = 0;
    pointerActive = false;
    activePointerId = null;
    directionLocked = false;
    isDraggingVertically = false;
    startedFromVerticalHandle = false;
  }

  /** @param {PointerEvent} e */
  function handleLostPointerCapture(e) {
    if (e.pointerId !== activePointerId) return;
    // During vertical reorder, DOM reordering may transiently drop capture.
    // Keep session alive and continue via window-level pointer events.
    if (isDraggingVertically) return;
    offset = 0;
    pointerActive = false;
    activePointerId = null;
    directionLocked = false;
    isDraggingVertically = false;
    startedFromVerticalHandle = false;
  }

  /** @param {PointerEvent} e */
  function handleWindowMove(e) {
    if (!pointerActive || e.pointerId !== activePointerId) return;
    handleMove(e);
  }

  /** @param {PointerEvent} e */
  function handleWindowUp(e) {
    if (!pointerActive || e.pointerId !== activePointerId) return;
    handleEnd(e);
  }

  /** @param {PointerEvent} e */
  function handleWindowCancel(e) {
    if (!pointerActive || e.pointerId !== activePointerId) return;
    handlePointerCancel(e);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<div
  class="dismissible"
  role="group"
  style="--offset: {offset}px"
  onpointerdown={handleStart}
  onpointermove={handleMove}
  onpointerup={handleEnd}
  onpointercancel={handlePointerCancel}
  onlostpointercapture={handleLostPointerCapture}
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

<svelte:window
  onpointermove={handleWindowMove}
  onpointerup={handleWindowUp}
  onpointercancel={handleWindowCancel}
/>

<style>
  .dismissible {
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    margin-bottom: 0;
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
    background: rgba(255, 255, 255, 0.85);
    transform: translateX(var(--offset, 0));
    transition: transform 0.12s ease-out;
    height: 100%;
  }
</style>
