import { getPreferences, updatePreferences } from "$lib/preferences/preferences-store.js";
import { normalizeFocusStats, normalizeFocusTasks } from "$lib/workspace/focus/focus-model.js";
import {
  normalizeWorkspaceMainTab,
  normalizeWorkspaceViewMode,
} from "$lib/workspace/workspace-tabs.js";

const DEFAULT_VIEW_MODE = "active";
const DEFAULT_SORT_MODE = "custom";
const DEFAULT_LOCALE = "en";
const DEFAULT_POMODORO = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
};

/** @param {unknown} theme */
export function normalizeWorkspaceTheme(theme) {
  return theme === "dark" ? "dark" : "light";
}

/** @param {unknown} shape */
export function normalizeWorkspaceThemeTransitionShape(shape) {
  return shape === "heart" ? "heart" : "circle";
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
  });
  /** @type {any[]} */
  let focusTasks = [];
  /** @type {Record<string, any>} */
  let focusStats = {};
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
  return {
    mainTab: normalizeWorkspaceMainTab(prefs.workspaceMainTab),
    viewMode: normalizeWorkspaceViewMode(prefs.viewMode || DEFAULT_VIEW_MODE),
    sortMode: prefs.sortMode || DEFAULT_SORT_MODE,
    locale: prefs.language || DEFAULT_LOCALE,
    overlayEnabled: prefs.overlayEnabled ?? true,
    workspaceTheme: normalizeWorkspaceTheme(prefs.workspaceTheme),
    themeTransitionShape: normalizeWorkspaceThemeTransitionShape(prefs.workspaceThemeTransitionShape),
    pomodoroConfig,
    focusTasks,
    focusStats,
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {Record<string, any>} updates
 */
export async function saveWorkspacePreferences(invoke, updates) {
  await updatePreferences(invoke, updates);
}
