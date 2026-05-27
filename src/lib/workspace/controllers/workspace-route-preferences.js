import {
  loadWorkspacePreferences,
  normalizeWorkspaceCustomCss,
  normalizeWorkspaceSidebarManualSplitRatio,
  saveWorkspacePreferences,
} from "$lib/workspace/preferences-service.js";
import { normalizeWorkspaceThemePreset } from "$lib/workspace/theme/theme-presets.js";

/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   setState: (patch: Record<string, any>) => void;
 * }} input
 */
export function createWorkspaceRoutePreferences(input) {
  async function loadPrefs() {
    try {
      const next = await loadWorkspacePreferences(input.invoke);
      input.setState({
        viewMode: next.viewMode,
        initialViewMode: next.initialViewMode,
        sortMode: next.sortMode,
        locale: next.locale,
        mainTab: next.mainTab,
        stickiesVisible: next.overlayEnabled,
        showPanelOnStartup: next.showPanelOnStartup ?? false,
        workspaceTheme: normalizeWorkspaceThemePreset(next.workspaceTheme),
        workspaceCustomCss: normalizeWorkspaceCustomCss(next.workspaceCustomCss),
        workspaceZoom: next.workspaceZoom,
        workspaceZoomMode: next.workspaceZoomMode,
        workspaceFontSize: next.workspaceFontSize,
        workspaceSidebarLayoutMode: next.workspaceSidebarLayoutMode,
        workspaceSidebarManualSplitRatio: normalizeWorkspaceSidebarManualSplitRatio(
          next.workspaceSidebarManualSplitRatio,
        ),
        themeTransitionShape: next.themeTransitionShape,
        focusTasks: next.focusTasks,
        focusStats: next.focusStats,
        focusBreakSession: next.focusBreakSession,
        pomodoroConfig: next.pomodoroConfig,
        markdownStorageMode: next.markdownStorageMode,
        markdownStorageRoot: next.markdownStorageRoot,
        markdownStorageSnapshot: next.markdownStorageSnapshot,
      });
    } catch (e) {
      console.error("loadPrefs(workspace)", e);
    }
  }

  /** @param {any} updates */
  async function savePrefs(updates) {
    try {
      await saveWorkspacePreferences(input.invoke, updates);
    } catch (e) {
      console.error("savePrefs(workspace)", e);
    }
  }

  return {
    loadPrefs,
    savePrefs,
  };
}
