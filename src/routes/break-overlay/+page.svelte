<script>
  import { onMount } from "svelte";
  import { emit } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    BREAK_OVERLAY_EVENT_ACTION,
    BREAK_OVERLAY_EVENT_READY,
    BREAK_OVERLAY_EVENT_UPDATE,
  } from "$lib/workspace/focus/focus-break-overlay-windows.js";

  let title = $state("Take a break");
  let hint = $state("Break reminder");
  let actionHint = $state("Use the buttons below to continue.");
  let startText = $state("Start break");
  let postponeText = $state("Postpone");
  let skipText = $state("Skip");
  let strictMode = $state(false);
  let strictModeText = $state("Strict mode");
  let postponeUsed = $state(0);
  let postponeLimit = $state(0);
  let postponeDisabled = $state(true);
  let skipDisabled = $state(true);

  /**
   * @param {any} payload
   */
  function applyOverlayState(payload) {
    const safe = payload && typeof payload === "object" ? payload : {};
    title = String(safe.title || "Take a break");
    hint = String(safe.hint || "Break reminder");
    actionHint = String(safe.actionHint || "Use the buttons below to continue.");
    startText = String(safe.startText || "Start break");
    postponeText = String(safe.postponeText || "Postpone");
    skipText = String(safe.skipText || "Skip");
    strictMode = safe.strictMode === true;
    strictModeText = String(safe.strictModeText || "Strict mode");
    postponeUsed = Math.max(0, Number(safe.postponeUsed || 0));
    postponeLimit = Math.max(0, Number(safe.postponeLimit || 0));
    postponeDisabled = safe.postponeDisabled !== false;
    skipDisabled = safe.skipDisabled !== false;
  }

  /**
   * @param {"start" | "postpone" | "skip"} action
   */
  async function emitOverlayAction(action) {
    await emit(BREAK_OVERLAY_EVENT_ACTION, { action });
  }

  onMount(() => {
    let stopped = false;
    /** @type {null | (() => void)} */
    let unlistenUpdate = null;

    const boot = async () => {
      const appWindow = getCurrentWindow();
      try {
        unlistenUpdate = await appWindow.listen(BREAK_OVERLAY_EVENT_UPDATE, (event) =>
          applyOverlayState(event.payload),
        );
      } catch (error) {
        console.error("break overlay listen update", error);
      }

      try {
        await emit(BREAK_OVERLAY_EVENT_READY, { label: appWindow.label });
      } catch (error) {
        console.error("break overlay ready emit", error);
      }
    };

    boot();

    return () => {
      stopped = true;
      if (!stopped || !unlistenUpdate) return;
      try {
        unlistenUpdate();
      } catch (error) {
        console.error("break overlay unlisten update", error);
      }
    };
  });
</script>

<main class="overlay-shell">
  <section class="overlay-card" data-no-drag="true">
    <h1>{title}</h1>
    <p class="hint">{hint}</p>
    <p class="action-hint">
      {actionHint}
      {#if strictMode}
        · {strictModeText}
      {/if}
    </p>
    <div class="action-row">
      <button type="button" class="btn primary" onclick={() => emitOverlayAction("start")}>
        {startText}
      </button>
      <button
        type="button"
        class="btn"
        disabled={postponeDisabled}
        onclick={() => emitOverlayAction("postpone")}
      >
        {postponeText} ({postponeUsed}/{postponeLimit})
      </button>
      <button type="button" class="btn" disabled={skipDisabled} onclick={() => emitOverlayAction("skip")}>
        {skipText}
      </button>
    </div>
  </section>
</main>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    cursor: default;
    user-select: none;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .overlay-shell {
    width: 100vw;
    height: 100vh;
    display: grid;
    place-items: center;
    padding: 20px;
    background:
      radial-gradient(circle at 20% 16%, rgba(125, 211, 252, 0.18), transparent 42%),
      radial-gradient(circle at 80% 84%, rgba(34, 197, 94, 0.15), transparent 46%),
      linear-gradient(155deg, #081426 0%, #0d1d33 46%, #0a1729 100%);
    color: #e7f0ff;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  }

  .overlay-card {
    width: min(720px, calc(100vw - 24px));
    border: 1px solid rgba(147, 197, 253, 0.42);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15, 34, 58, 0.92) 0%, rgba(10, 24, 42, 0.9) 100%);
    box-shadow: 0 28px 64px rgba(2, 6, 23, 0.58);
    padding: 22px 20px 20px;
    display: grid;
    gap: 12px;
    text-align: center;
  }

  .overlay-card h1 {
    margin: 0;
    font-size: clamp(30px, 4.6vw, 52px);
    line-height: 1.16;
    color: #f8fbff;
  }

  .hint {
    margin: 0;
    font-size: clamp(15px, 1.6vw, 20px);
    color: #d4e4ff;
  }

  .action-hint {
    margin: 0;
    font-size: 13px;
    color: #9fb3d2;
  }

  .action-row {
    margin-top: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn {
    border: 1px solid rgba(148, 163, 184, 0.44);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.5);
    color: #dbeafe;
    min-height: 38px;
    padding: 0 14px;
    font-size: 13px;
    cursor: pointer;
  }

  .btn.primary {
    border-color: rgba(96, 165, 250, 0.58);
    background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%);
    color: #f8fbff;
    font-weight: 700;
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 780px) {
    .overlay-shell {
      padding: 12px;
    }

    .overlay-card {
      width: min(560px, calc(100vw - 14px));
      padding: 16px 14px 14px;
      gap: 10px;
    }
  }
</style>
