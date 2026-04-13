import { switchPanelWindow } from "$lib/panel/switch-panel-window.js";

/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   getCurrentWindow: typeof import("@tauri-apps/api/window").getCurrentWindow;
 *   getIsMac: () => boolean;
 *   getStickiesVisible: () => boolean;
 *   setStickiesVisible: (next: boolean) => void;
 *   setInteractionDisabled: (next: boolean) => void;
 *   setWindowMaximized: (next: boolean) => void;
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
 *   loadNotes: () => Promise<void>;
 *   syncWindows: () => Promise<void>;
 *   syncWindowMaximizedState: (setWindowMaximized: (next: boolean) => void, options?: { macFullscreen?: boolean }) => Promise<void>;
 *   setViewportMetrics: (next: { width: number; height: number; dpr: number }) => void;
 * }} deps
 */
export function createWorkspaceWindowActions(deps) {
  async function switchToCompact() {
    await switchPanelWindow("compact", deps.invoke);
  }

  function refreshViewportMetrics() {
    deps.setViewportMetrics({
      width: Math.max(1, window.innerWidth || 1),
      height: Math.max(1, window.innerHeight || 1),
      dpr: Math.max(1, window.devicePixelRatio || 1),
    });
  }

  function onWindowResize() {
    refreshViewportMetrics();
    syncWindowPresentationState();
  }

  async function toggleInteraction() {
    try {
      const newState = await deps.invoke("toggle_overlay_interaction");
      deps.setInteractionDisabled(/** @type {boolean} */ (newState));
    } catch (error) {
      console.error("toggleInteraction(workspace)", error);
    }
  }

  async function toggleStickiesVisibility() {
    try {
      const next = !deps.getStickiesVisible();
      deps.setStickiesVisible(next);
      await deps.savePrefs({ overlayEnabled: next });
      if (next) await deps.loadNotes();
      await deps.syncWindows();
      if (next) {
        await deps.invoke("sync_all_note_window_layers");
      }
    } catch (error) {
      console.error("toggleStickiesVisibility(workspace)", error);
    }
  }

  async function toggleWindowMaximize() {
    try {
      const win = deps.getCurrentWindow();
      if (deps.getIsMac()) {
        const current = await win.isFullscreen();
        await win.setFullscreen(!current);
        deps.setWindowMaximized(!current);
        return;
      }
      await win.toggleMaximize();
      deps.setWindowMaximized(await win.isMaximized());
    } catch (error) {
      console.error("toggleWindowMaximize(workspace)", error);
    }
  }

  async function syncWindowPresentationState() {
    await deps.syncWindowMaximizedState(
      (next) => {
        deps.setWindowMaximized(next);
      },
      { macFullscreen: deps.getIsMac() },
    );
  }

  async function minimizeWindow() {
    try {
      await deps.invoke("minimize_panel_window", { label: deps.getCurrentWindow().label });
    } catch (error) {
      console.error("minimizeWindow(workspace)", error);
    }
  }

  async function hideWindow() {
    try {
      await deps.invoke("hide_panel_window", { label: deps.getCurrentWindow().label });
    } catch (error) {
      console.error("hideWindow(workspace)", error);
    }
  }

  return {
    switchToCompact,
    refreshViewportMetrics,
    onWindowResize,
    toggleInteraction,
    toggleStickiesVisibility,
    toggleWindowMaximize,
    syncWindowPresentationState,
    minimizeWindow,
    hideWindow,
  };
}
