import { getPreferences, updatePreferences } from "$lib/preferences/preferences-store.js";

const DEFAULT_VIEW_MODE = "active";
const DEFAULT_SORT_MODE = "custom";
const DEFAULT_LOCALE = "en";

/** @param {unknown} theme */
export function normalizeWorkspaceTheme(theme) {
  return theme === "dark" ? "dark" : "light";
}

/** @param {unknown} shape */
export function normalizeWorkspaceThemeTransitionShape(shape) {
  return shape === "heart" ? "heart" : "circle";
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function loadWorkspacePreferences(invoke) {
  const prefs = await getPreferences(invoke);
  return {
    viewMode: prefs.viewMode || DEFAULT_VIEW_MODE,
    sortMode: prefs.sortMode || DEFAULT_SORT_MODE,
    locale: prefs.language || DEFAULT_LOCALE,
    workspaceTheme: normalizeWorkspaceTheme(prefs.workspaceTheme),
    themeTransitionShape: normalizeWorkspaceThemeTransitionShape(prefs.workspaceThemeTransitionShape),
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {Record<string, any>} updates
 */
export async function saveWorkspacePreferences(invoke, updates) {
  await updatePreferences(invoke, updates);
}
