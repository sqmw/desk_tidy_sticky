import { getPreferences, updatePreferences } from "$lib/preferences/preferences-store.js";
import { normalizeFocusStats, normalizeFocusTasks } from "$lib/workspace/focus/focus-model.js";
import { normalizeBreakSession } from "$lib/workspace/focus/focus-break-session.js";
import { normalizeBreakScheduleMode } from "$lib/workspace/focus/focus-break-profile.js";
import {
  DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO,
  normalizeSidebarManualSplitRatio,
} from "$lib/workspace/sidebar/manual-split-layout.js";
import {
  normalizeWorkspaceInitialViewMode,
  normalizeWorkspaceMainTab,
  resolveWorkspaceStartupViewMode,
  normalizeWorkspaceViewMode,
} from "$lib/workspace/workspace-tabs.js";

const DEFAULT_VIEW_MODE = "active";
const DEFAULT_SORT_MODE = "custom";
const DEFAULT_LOCALE = "en";
const DEFAULT_WORKSPACE_ZOOM = 1;
const DEFAULT_WORKSPACE_ZOOM_MODE = "manual";
const DEFAULT_WORKSPACE_FONT_SIZE = "medium";
const DEFAULT_WORKSPACE_SIDEBAR_LAYOUT_MODE = "auto";
const DEFAULT_WORKSPACE_SIDEBAR_MANUAL_SPLIT_RATIO = DEFAULT_SIDEBAR_MANUAL_SPLIT_RATIO;
const DEFAULT_POMODORO = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  miniBreakEveryMinutes: 10,
  miniBreakDurationSeconds: 20,
  longBreakEveryMinutes: 30,
  longBreakDurationMinutes: 5,
  breakNotifyBeforeSeconds: 10,
  miniBreakPostponeMinutes: 5,
  longBreakPostponeMinutes: 10,
  breakPostponeLimit: 3,
  breakStrictMode: false,
  breakScheduleMode: "task",
  independentMiniBreakEveryMinutes: 10,
  independentLongBreakEveryMinutes: 30,
};

/** @param {unknown} theme */
export function normalizeWorkspaceTheme(theme) {
  return theme === "dark" ? "dark" : "light";
}

/** @param {unknown} shape */
export function normalizeWorkspaceThemeTransitionShape(shape) {
  return shape === "heart" ? "heart" : "circle";
}

/** @param {unknown} zoom */
export function normalizeWorkspaceZoom(zoom) {
  const value = Number(zoom);
  if (!Number.isFinite(value)) return DEFAULT_WORKSPACE_ZOOM;
  return Math.min(1.4, Math.max(0.85, Number(value.toFixed(2))));
}

/** @param {unknown} mode */
export function normalizeWorkspaceZoomMode(mode) {
  return mode === "auto" ? "auto" : DEFAULT_WORKSPACE_ZOOM_MODE;
}

/** @param {unknown} size */
export function normalizeWorkspaceFontSize(size) {
  if (size === "small" || size === "large") return size;
  return DEFAULT_WORKSPACE_FONT_SIZE;
}

/** @param {unknown} mode */
export function normalizeWorkspaceSidebarLayoutMode(mode) {
  return mode === "manual" ? "manual" : DEFAULT_WORKSPACE_SIDEBAR_LAYOUT_MODE;
}

/** @param {unknown} ratio */
export function normalizeWorkspaceSidebarManualSplitRatio(ratio) {
  return normalizeSidebarManualSplitRatio(ratio);
}

/** @param {unknown} input */
export function normalizePomodoroConfig(input) {
  const raw = /** @type {any} */ (input || {});
  /**
   * @param {unknown} v
   * @param {number} fallback
   * @param {number} min
   * @param {number} max
   */
  const clamp = (v, fallback, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  };
  return {
    focusMinutes: clamp(raw.focusMinutes, DEFAULT_POMODORO.focusMinutes, 5, 90),
    shortBreakMinutes: clamp(raw.shortBreakMinutes, DEFAULT_POMODORO.shortBreakMinutes, 1, 30),
    longBreakMinutes: clamp(raw.longBreakMinutes, DEFAULT_POMODORO.longBreakMinutes, 5, 60),
    longBreakEvery: clamp(raw.longBreakEvery, DEFAULT_POMODORO.longBreakEvery, 2, 8),
    miniBreakEveryMinutes: clamp(
      raw.miniBreakEveryMinutes,
      DEFAULT_POMODORO.miniBreakEveryMinutes,
      5,
      60,
    ),
    miniBreakDurationSeconds: clamp(
      raw.miniBreakDurationSeconds,
      DEFAULT_POMODORO.miniBreakDurationSeconds,
      10,
      300,
    ),
    longBreakEveryMinutes: clamp(
      raw.longBreakEveryMinutes,
      DEFAULT_POMODORO.longBreakEveryMinutes,
      15,
      180,
    ),
    longBreakDurationMinutes: clamp(
      raw.longBreakDurationMinutes,
      DEFAULT_POMODORO.longBreakDurationMinutes,
      1,
      30,
    ),
    breakNotifyBeforeSeconds: clamp(
      raw.breakNotifyBeforeSeconds,
      DEFAULT_POMODORO.breakNotifyBeforeSeconds,
      0,
      120,
    ),
    miniBreakPostponeMinutes: clamp(
      raw.miniBreakPostponeMinutes,
      DEFAULT_POMODORO.miniBreakPostponeMinutes,
      1,
      30,
    ),
    longBreakPostponeMinutes: clamp(
      raw.longBreakPostponeMinutes,
      DEFAULT_POMODORO.longBreakPostponeMinutes,
      1,
      60,
    ),
    breakPostponeLimit: clamp(raw.breakPostponeLimit, DEFAULT_POMODORO.breakPostponeLimit, 0, 10),
    breakStrictMode: raw.breakStrictMode === true,
    breakScheduleMode: normalizeBreakScheduleMode(raw.breakScheduleMode),
    independentMiniBreakEveryMinutes: clamp(
      raw.independentMiniBreakEveryMinutes,
      DEFAULT_POMODORO.independentMiniBreakEveryMinutes,
      5,
      180,
    ),
    independentLongBreakEveryMinutes: clamp(
      raw.independentLongBreakEveryMinutes,
      DEFAULT_POMODORO.independentLongBreakEveryMinutes,
      15,
      360,
    ),
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function loadWorkspacePreferences(invoke) {
  const prefs = await getPreferences(invoke);
  const pomodoroConfig = normalizePomodoroConfig({
    focusMinutes: prefs.pomodoroFocusMinutes,
    shortBreakMinutes: prefs.pomodoroShortBreakMinutes,
    longBreakMinutes: prefs.pomodoroLongBreakMinutes,
    longBreakEvery: prefs.pomodoroLongBreakEvery,
    miniBreakEveryMinutes: prefs.pomodoroMiniBreakEveryMinutes,
    miniBreakDurationSeconds: prefs.pomodoroMiniBreakDurationSeconds,
    longBreakEveryMinutes: prefs.pomodoroLongBreakEveryMinutes,
    longBreakDurationMinutes: prefs.pomodoroLongBreakDurationMinutes,
    breakNotifyBeforeSeconds: prefs.pomodoroBreakNotifyBeforeSeconds,
    miniBreakPostponeMinutes: prefs.pomodoroMiniBreakPostponeMinutes,
    longBreakPostponeMinutes: prefs.pomodoroLongBreakPostponeMinutes,
    breakPostponeLimit: prefs.pomodoroBreakPostponeLimit,
    breakStrictMode: prefs.pomodoroBreakStrictMode,
    breakScheduleMode: prefs.pomodoroBreakScheduleMode,
    independentMiniBreakEveryMinutes: prefs.pomodoroIndependentMiniBreakEveryMinutes,
    independentLongBreakEveryMinutes: prefs.pomodoroIndependentLongBreakEveryMinutes,
  });
  /** @type {any[]} */
  let focusTasks = [];
  /** @type {Record<string, any>} */
  let focusStats = {};
  let focusBreakSession = {
    mode: "none",
    untilTs: 0,
    scope: "global",
    taskId: "",
    taskTitle: "",
  };
  try {
    focusTasks = normalizeFocusTasks(JSON.parse(String(prefs.focusTasksJson || "[]")));
  } catch {
    focusTasks = [];
  }
  try {
    focusStats = normalizeFocusStats(JSON.parse(String(prefs.focusStatsJson || "{}")));
  } catch {
    focusStats = {};
  }
  try {
    focusBreakSession = normalizeBreakSession(JSON.parse(String(prefs.focusBreakSessionJson || "{}")));
  } catch {
    focusBreakSession = {
      mode: "none",
      untilTs: 0,
      scope: "global",
      taskId: "",
      taskTitle: "",
    };
  }
  return {
    mainTab: normalizeWorkspaceMainTab(prefs.workspaceMainTab),
    initialViewMode: normalizeWorkspaceInitialViewMode(prefs.workspaceInitialViewMode),
    viewMode: resolveWorkspaceStartupViewMode(
      prefs.workspaceInitialViewMode,
      normalizeWorkspaceViewMode(prefs.viewMode || DEFAULT_VIEW_MODE),
    ),
    sortMode: prefs.sortMode || DEFAULT_SORT_MODE,
    locale: prefs.language || DEFAULT_LOCALE,
    overlayEnabled: prefs.overlayEnabled ?? true,
    workspaceZoom: normalizeWorkspaceZoom(prefs.workspaceZoom),
    workspaceZoomMode: normalizeWorkspaceZoomMode(prefs.workspaceZoomMode),
    workspaceFontSize: normalizeWorkspaceFontSize(prefs.workspaceFontSize),
    workspaceSidebarLayoutMode: normalizeWorkspaceSidebarLayoutMode(prefs.workspaceSidebarLayoutMode),
    workspaceSidebarManualSplitRatio: normalizeWorkspaceSidebarManualSplitRatio(
      prefs.workspaceSidebarManualSplitRatio ?? DEFAULT_WORKSPACE_SIDEBAR_MANUAL_SPLIT_RATIO,
    ),
    workspaceTheme: normalizeWorkspaceTheme(prefs.workspaceTheme),
    themeTransitionShape: normalizeWorkspaceThemeTransitionShape(prefs.workspaceThemeTransitionShape),
    pomodoroConfig,
    focusTasks,
    focusStats,
    focusBreakSession,
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {Record<string, any>} updates
 */
export async function saveWorkspacePreferences(invoke, updates) {
  await updatePreferences(invoke, updates);
}
