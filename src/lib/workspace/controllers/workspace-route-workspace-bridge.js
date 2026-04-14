/**
 * @param {{
 *   normalizePomodoroConfig: (config: any) => any;
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   getCurrentWindow: typeof import("@tauri-apps/api/window").getCurrentWindow;
 *   loadNotes: () => Promise<void>;
 *   syncWindows: () => Promise<void>;
 *   syncWindowMaximizedState: (setWindowMaximized: (next: boolean) => void, options?: { macFullscreen?: boolean }) => Promise<void>;
 *   getIsMac: () => boolean;
 *   getStickiesVisible: () => boolean;
 *   setStickiesVisible: (next: boolean) => void;
 *   setInteractionDisabled: (next: boolean) => void;
 *   setWindowMaximized: (next: boolean) => void;
 *   setViewportMetrics: (next: { width: number; height: number; dpr: number }) => void;
 *   getFocusTasks: () => any[];
 *   setFocusTasks: (next: any[]) => void;
 *   setFocusStats: (next: Record<string, any>) => void;
 *   setFocusBreakSession: (next: any) => void;
 *   setFocusSelectedTaskId: (nextTaskId: string) => void;
 *   setFocusCommand: (next: any) => void;
 *   setPomodoroConfig: (next: any) => void;
 *   setMainTab: (tab: string) => Promise<void>;
 *   focusTabKey: string;
 *   timeToMinutes: (value: string) => number;
 *   minutesToTime: (value: number) => string;
 *   getWorkspaceTheme: () => string;
 *   setWorkspaceTheme: (next: string) => void;
 *   getThemeTransitionShape: () => string;
 *   setThemeTransitionShape: (next: string) => void;
 *   getStrings: () => Record<string, any>;
 *   getWorkspaceCustomCss: () => string;
 *   setWorkspaceCustomCssState: (next: string) => void;
 *   getWorkspaceZoom: () => number;
 *   setWorkspaceZoomState: (next: number) => void;
 *   getWorkspaceZoomMode: () => string;
 *   setWorkspaceZoomMode: (next: string) => void;
 *   setWorkspaceFontSize: (next: string) => void;
 *   setWorkspaceSidebarLayoutModeState: (next: string) => void;
 *   setWorkspaceSidebarManualSplitRatioState: (next: number) => void;
 * }} input
 */
export function createWorkspaceRouteWorkspaceBridge(input) {
  function createFocusActionsConfig() {
    return {
      normalizePomodoroConfig: input.normalizePomodoroConfig,
      savePrefs: input.savePrefs,
      getFocusTasks: input.getFocusTasks,
      setFocusTasks: input.setFocusTasks,
      setFocusStats: input.setFocusStats,
      setFocusBreakSession: input.setFocusBreakSession,
      setFocusSelectedTaskId: input.setFocusSelectedTaskId,
      setFocusCommand: input.setFocusCommand,
      setPomodoroConfig: input.setPomodoroConfig,
      setMainTab: input.setMainTab,
      focusTabKey: input.focusTabKey,
      timeToMinutes: input.timeToMinutes,
      minutesToTime: input.minutesToTime,
    };
  }

  function createSettingsActionsConfig() {
    return {
      savePrefs: input.savePrefs,
      getWorkspaceTheme: input.getWorkspaceTheme,
      setWorkspaceTheme: input.setWorkspaceTheme,
      getThemeTransitionShape: input.getThemeTransitionShape,
      setThemeTransitionShape: input.setThemeTransitionShape,
      getStrings: input.getStrings,
      getWorkspaceCustomCss: input.getWorkspaceCustomCss,
      setWorkspaceCustomCssState: input.setWorkspaceCustomCssState,
      getWorkspaceZoom: input.getWorkspaceZoom,
      setWorkspaceZoomState: input.setWorkspaceZoomState,
      getWorkspaceZoomMode: input.getWorkspaceZoomMode,
      setWorkspaceZoomMode: input.setWorkspaceZoomMode,
      setWorkspaceFontSize: input.setWorkspaceFontSize,
      setWorkspaceSidebarLayoutModeState: input.setWorkspaceSidebarLayoutModeState,
      setWorkspaceSidebarManualSplitRatioState: input.setWorkspaceSidebarManualSplitRatioState,
    };
  }

  function createWindowActionsConfig() {
    return {
      invoke: input.invoke,
      getCurrentWindow: input.getCurrentWindow,
      getIsMac: input.getIsMac,
      getStickiesVisible: input.getStickiesVisible,
      setStickiesVisible: input.setStickiesVisible,
      setInteractionDisabled: input.setInteractionDisabled,
      setWindowMaximized: input.setWindowMaximized,
      savePrefs: input.savePrefs,
      loadNotes: input.loadNotes,
      syncWindows: input.syncWindows,
      syncWindowMaximizedState: input.syncWindowMaximizedState,
      setViewportMetrics: input.setViewportMetrics,
    };
  }

  return {
    createFocusActionsConfig,
    createSettingsActionsConfig,
    createWindowActionsConfig,
  };
}
