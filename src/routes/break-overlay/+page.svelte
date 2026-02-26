<script>
  import { onMount } from "svelte";
  import { emit } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    BREAK_OVERLAY_EVENT_ACTION,
    BREAK_OVERLAY_EVENT_READY,
    BREAK_OVERLAY_EVENT_UPDATE,
  } from "$lib/workspace/focus/focus-break-overlay-windows.js";
  const currentWindow = getCurrentWindow();

  const isZhLocale = typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("zh");
  const defaultCopy = isZhLocale
    ? {
        title: "休息一下",
        remainingPrefix: "剩余",
        postponeText: "延后 2 分钟",
        skipText: "跳过",
        strictModeText: "严格模式",
      }
    : {
        title: "Take a break",
        remainingPrefix: "Remaining",
        postponeText: "Postpone 2m",
        skipText: "Skip",
        strictModeText: "Strict mode",
      };

  let title = $state(defaultCopy.title);
  let taskText = $state("");
  let remainingText = $state(`${defaultCopy.remainingPrefix} 00:00`);
  let remainingPrefix = $state(defaultCopy.remainingPrefix);
  let remainingSeconds = $state(0);
  let totalSeconds = $state(1);
  let endAtTs = $state(0);
  let progress = $state(0);
  let postponeText = $state(defaultCopy.postponeText);
  let skipText = $state(defaultCopy.skipText);
  let showSkip = $state(false);
  let strictMode = $state(false);
  let strictModeText = $state(defaultCopy.strictModeText);
  let postponeDisabled = $state(false);
  let skipDisabled = $state(true);
  let hasReceivedPayload = $state(false);
  let selfClosing = false;
  let closeRetryCount = 0;
  let lastPayloadAt = 0;
  let lastReadyRetryAt = 0;

  /**
   * @param {string} [label]
   */
  async function requestOverlayState(label = "") {
    await emit(BREAK_OVERLAY_EVENT_READY, { label: String(label || "") });
  }

  /**
   * @param {number} sec
   */
  function formatMmSs(sec) {
    const safe = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(safe / 60)).padStart(2, "0");
    const ss = String(safe % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  /**
   * @param {Promise<any>} task
   * @param {number} ms
   */
  async function withTimeout(task, ms) {
    let timer = null;
    try {
      await Promise.race([
        task,
        new Promise((_, reject) => {
          timer = window.setTimeout(() => reject(new Error("timeout")), ms);
        }),
      ]);
      return true;
    } catch (_) {
      return false;
    } finally {
      if (timer !== null) window.clearTimeout(timer);
    }
  }

  async function closeSelf() {
    if (selfClosing) return;
    selfClosing = true;
    try {
      const destroyed = await withTimeout(currentWindow.destroy(), 600);
      if (destroyed) return;
      try {
        await currentWindow.hide();
      } catch (_) {
        // noop
      }
      const closed = await withTimeout(currentWindow.close(), 600);
      if (closed) return;
      closeRetryCount += 1;
      if (closeRetryCount <= 8) {
        selfClosing = false;
        window.setTimeout(() => {
          closeSelf().catch((error) => console.error("break overlay close retry", error));
        }, 260);
      } else {
        selfClosing = false;
        closeRetryCount = 0;
      }
    } catch (error) {
      console.error("break overlay close self", error);
      selfClosing = false;
    }
  }

  /**
   * @param {any} payload
   */
  function applyOverlayState(payload) {
    const safe = payload && typeof payload === "object" ? payload : {};
    hasReceivedPayload = true;
    lastPayloadAt = Date.now();
    if (safe.close === true) {
      closeSelf();
      return;
    }
    title = String(safe.title || defaultCopy.title);
    taskText = String(safe.taskText || "");
    remainingPrefix = String(safe.remainingPrefix || remainingPrefix || defaultCopy.remainingPrefix);
    remainingText = String(safe.remainingText || `${remainingPrefix} 00:00`);
    progress = Math.max(0, Math.min(100, Number(safe.progress || 0)));
    totalSeconds = Math.max(1, Math.floor(Number(safe.totalSeconds || totalSeconds || 1)));
    const incomingRemaining = Math.max(0, Math.floor(Number(safe.remainingSeconds || 0)));
    remainingSeconds = incomingRemaining;
    const incomingEndTs = Number(safe.endAtTs || 0);
    endAtTs = Number.isFinite(incomingEndTs) && incomingEndTs > 0
      ? incomingEndTs
      : (Date.now() + incomingRemaining * 1000);
    if (Number(safe.remainingSeconds) <= 0) {
      closeSelf();
      return;
    }
    selfClosing = false;
    closeRetryCount = 0;
    postponeText = String(safe.postponeText || defaultCopy.postponeText);
    skipText = String(safe.skipText || defaultCopy.skipText);
    showSkip = safe.showSkip === true;
    strictMode = safe.strictMode === true;
    strictModeText = String(safe.strictModeText || defaultCopy.strictModeText);
    postponeDisabled = safe.postponeDisabled === true;
    skipDisabled = safe.skipDisabled !== false;
  }

  /**
   * @param {"postpone" | "skip"} action
   */
  async function emitOverlayAction(action) {
    try {
      await emit(BREAK_OVERLAY_EVENT_ACTION, { action });
    } finally {
      // Close locally to avoid stuck full-screen when host event path is delayed.
      closeSelf();
    }
  }

  onMount(() => {
    let stopped = false;
    /** @type {null | (() => void)} */
    let unlistenUpdate = null;
    /** @type {null | number} */
    let handshakeTimer = null;
    const bootTs = Date.now();
    const localTick = setInterval(() => {
      if (stopped) return;
      if (!hasReceivedPayload) {
        if (Date.now() - bootTs > 12000) {
          closeSelf();
        }
        return;
      }
      if (Date.now() - lastPayloadAt > 2400 && Date.now() - lastReadyRetryAt > 1000) {
        lastReadyRetryAt = Date.now();
        requestOverlayState(currentWindow.label).catch((error) =>
          console.error("break overlay stale ready retry emit", error),
        );
      }
      if (!Number.isFinite(endAtTs) || endAtTs <= 0) return;
      const rest = Math.max(0, Math.ceil((endAtTs - Date.now()) / 1000));
      remainingSeconds = rest;
      remainingText = `${remainingPrefix} ${formatMmSs(rest)}`;
      progress = Math.max(0, Math.min(100, Math.round(((totalSeconds - rest) / Math.max(1, totalSeconds)) * 100)));
      if (rest <= 0) {
        closeSelf();
      }
    }, 200);

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
        await requestOverlayState(appWindow.label);
      } catch (error) {
        console.error("break overlay ready emit", error);
      }

      // Retry handshake to avoid race between overlay boot and host listener registration.
      handshakeTimer = window.setInterval(() => {
        if (stopped || hasReceivedPayload) return;
        requestOverlayState(appWindow.label).catch((error) =>
          console.error("break overlay ready retry emit", error),
        );
      }, 500);
    };

    boot();

    return () => {
      stopped = true;
      clearInterval(localTick);
      if (handshakeTimer !== null) {
        clearInterval(handshakeTimer);
      }
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
  <section class="overlay-center" data-no-drag="true">
    <h1>{title}</h1>
    {#if taskText}
      <p class="task">{taskText}</p>
    {/if}
    <div class="progress-track" aria-hidden="true">
      <span class="progress-fill" style={`width:${progress}%`}></span>
    </div>
    <p class="remaining">{remainingText}</p>
  </section>

  <section class="overlay-bottom" data-no-drag="true">
    <button
      type="button"
      class="action-link"
      disabled={postponeDisabled}
      onclick={() => emitOverlayAction("postpone")}
    >
      {postponeText}
    </button>
    {#if showSkip}
      <button type="button" class="action-link" disabled={skipDisabled} onclick={() => emitOverlayAction("skip")}>
        {skipText}
      </button>
    {/if}
    {#if strictMode}
      <span class="strict">{strictModeText}</span>
    {/if}
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
    width: 100dvw;
    height: 100dvh;
    min-height: 100dvh;
    display: grid;
    grid-template-rows: 1fr auto;
    justify-items: center;
    align-items: center;
    padding: 36px 20px 26px;
    padding-top: calc(36px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(26px + env(safe-area-inset-bottom, 0px));
    background: #4f989b;
    color: #f8fbff;
    font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  }

  .overlay-center {
    width: min(980px, calc(100vw - 40px));
    display: grid;
    gap: 18px;
    text-align: center;
    align-content: center;
  }

  .overlay-center h1 {
    margin: 0;
    font-size: clamp(34px, 4vw, 56px);
    font-weight: 500;
    line-height: 1.16;
    color: rgba(255, 255, 255, 0.96);
  }

  .task {
    margin: 0;
    font-size: clamp(16px, 1.8vw, 22px);
    color: rgba(240, 249, 255, 0.9);
  }

  .progress-track {
    width: min(680px, calc(100vw - 90px));
    height: 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.45);
    background: rgba(255, 255, 255, 0.24);
    overflow: hidden;
    margin: 0 auto;
  }

  .progress-fill {
    display: block;
    height: 100%;
    background: rgba(255, 255, 255, 0.88);
    transition: width 160ms linear;
  }

  .remaining {
    margin: 0;
    font-size: clamp(22px, 2.2vw, 34px);
    color: rgba(255, 255, 255, 0.95);
  }

  .overlay-bottom {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    min-height: 54px;
    flex-wrap: wrap;
  }

  .action-link {
    border: 0;
    background: transparent;
    color: rgba(250, 254, 255, 0.95);
    font-size: 34px;
    font-weight: 300;
    cursor: pointer;
    padding: 0;
    min-height: 44px;
    line-height: 1;
  }

  .action-link:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .strict {
    font-size: 16px;
    color: rgba(241, 245, 249, 0.85);
  }

  @media (max-width: 780px) {
    .overlay-shell {
      padding: 20px 12px 16px;
      padding-top: calc(20px + env(safe-area-inset-top, 0px));
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .overlay-center {
      gap: 14px;
    }

    .action-link {
      font-size: 26px;
    }
  }
</style>
