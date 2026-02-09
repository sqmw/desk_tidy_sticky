<script>
  let {
    active = false,
    shape = "circle",
    x = 0,
    y = 0,
    targetTheme = "light",
  } = $props();

  const className = $derived(`overlay ${active ? "active" : ""} ${targetTheme === "dark" ? "to-dark" : "to-light"} ${shape === "heart" ? "heart" : "circle"}`);
</script>

{#if active}
  <div class={className} style={`--x:${x}px; --y:${y}px;`} aria-hidden="true"></div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    pointer-events: none;
    will-change: clip-path, transform, opacity;
  }

  .overlay.to-light {
    background:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.09), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.08), transparent 32%),
      linear-gradient(165deg, #edf3ff 0%, #f7faff 46%, #fff8f1 100%);
  }

  .overlay.to-dark {
    background:
      radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.12), transparent 35%),
      radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.12), transparent 32%),
      linear-gradient(165deg, #0d1728 0%, #0f1d31 46%, #122034 100%);
  }

  .overlay.circle {
    clip-path: circle(0px at var(--x) var(--y));
  }

  .overlay.circle.active {
    animation: circle-wipe 520ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  .overlay.heart {
    width: 24px;
    height: 24px;
    left: var(--x);
    top: var(--y);
    inset: auto;
    transform: translate(-50%, -50%) scale(0);
    clip-path: path(
      "M12 21c-.42 0-.84-.15-1.17-.44C7.37 17.64 3 13.76 3 9.6 3 6.51 5.42 4 8.4 4c1.46 0 2.86.62 3.83 1.69A5.17 5.17 0 0 1 16.06 4C19.04 4 21.46 6.51 21.46 9.6c0 4.16-4.37 8.04-7.83 10.96-.33.29-.75.44-1.17.44z"
    );
    transform-origin: center center;
    border-radius: 0;
  }

  .overlay.heart.active {
    animation: heart-wipe 560ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }

  @keyframes circle-wipe {
    to {
      clip-path: circle(180vmax at var(--x) var(--y));
    }
  }

  @keyframes heart-wipe {
    to {
      transform: translate(-50%, -50%) scale(95);
      opacity: 1;
    }
  }
</style>
