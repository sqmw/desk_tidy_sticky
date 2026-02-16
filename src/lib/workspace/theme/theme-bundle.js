import { normalizeWorkspaceCustomCss } from "$lib/workspace/theme/theme-custom-css.js";
import { normalizeWorkspaceThemePreset } from "$lib/workspace/theme/theme-presets.js";

export const WORKSPACE_THEME_BUNDLE_VERSION = 1;

/**
 * @param {{
 *   workspaceTheme: unknown;
 *   workspaceCustomCss: unknown;
 * }} input
 */
export function createWorkspaceThemeBundle(input) {
  return {
    type: "desk-tidy-workspace-theme",
    version: WORKSPACE_THEME_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    themePreset: normalizeWorkspaceThemePreset(input.workspaceTheme),
    customCss: normalizeWorkspaceCustomCss(input.workspaceCustomCss),
  };
}

/**
 * @param {string} rawText
 */
export function parseWorkspaceThemeBundle(rawText) {
  /** @type {any} */
  let parsed;
  try {
    parsed = JSON.parse(String(rawText || ""));
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "invalid_format" };
  }
  const themeCandidate = parsed.themePreset ?? parsed.workspaceTheme ?? parsed.preset ?? "light";
  const cssCandidate = parsed.customCss ?? parsed.workspaceCustomCss ?? "";
  return {
    ok: true,
    workspaceTheme: normalizeWorkspaceThemePreset(themeCandidate),
    workspaceCustomCss: normalizeWorkspaceCustomCss(cssCandidate),
  };
}

