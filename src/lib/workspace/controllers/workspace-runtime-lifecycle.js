/**
 * @param {{
 *   emit: typeof import("@tauri-apps/api/event").emit;
 *   listen: typeof import("@tauri-apps/api/event").listen;
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   loadPrefs: () => Promise<void>;
 *   loadNotes: () => Promise<void>;
 *   getCurrentWindow: typeof import("@tauri-apps/api/window").getCurrentWindow;
 *   suppressNotesReloadUntilRef: () => number;
 *   setInteractionDisabled: (next: boolean) => void;
 *   updateDeadlineTick: () => void;
 * }} deps
 */
export function createWorkspaceRuntimeLifecycle(deps) {
  async function bootstrap() {
    await deps.loadPrefs();
    await deps.loadNotes();
    await deps.emit("workspace_ready", { label: "workspace" });
  }

  /**
   * @param {(next: boolean) => void} setWindowMaximized
   * @param {{ macFullscreen?: boolean }} [options]
   */
  async function syncWindowMaximizedState(setWindowMaximized, options = {}) {
    try {
      const win = deps.getCurrentWindow();
      const v = options.macFullscreen ? await win.isFullscreen() : await win.isMaximized();
      setWindowMaximized(!!v);
    } catch {
      // ignore
    }
  }

  async function syncOverlayInteractionState() {
    try {
      const state = await deps.invoke("get_overlay_interaction");
      deps.setInteractionDisabled(/** @type {boolean} */ (state));
    } catch {
      // ignore
    }
  }

  /**
   * @returns {Promise<() => void>}
   */
  async function mountRuntimeListeners() {
    /** @type {Array<Promise<() => void>>} */
    const unsubs = [];
    let notesChangedTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
    const deadlineTickTimer = setInterval(() => {
      deps.updateDeadlineTick();
    }, 15000);

    unsubs.push(
      deps.listen("notes_changed", () => {
        if (Date.now() < deps.suppressNotesReloadUntilRef()) return;
        if (notesChangedTimer) clearTimeout(notesChangedTimer);
        notesChangedTimer = setTimeout(() => {
          if (Date.now() < deps.suppressNotesReloadUntilRef()) return;
          deps.loadNotes();
        }, 80);
      }),
    );

    unsubs.push(
      deps.listen("overlay_input_changed", (event) => {
        deps.setInteractionDisabled(/** @type {boolean} */ (event.payload));
      }),
    );

    return () => {
      if (notesChangedTimer) clearTimeout(notesChangedTimer);
      clearInterval(deadlineTickTimer);
      for (const p of unsubs) {
        Promise.resolve(p)
          .then((u) => u())
          .catch(() => {});
      }
    };
  }

  return {
    bootstrap,
    syncWindowMaximizedState,
    syncOverlayInteractionState,
    mountRuntimeListeners,
  };
}
