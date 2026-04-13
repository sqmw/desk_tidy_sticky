import {
  normalizeWorkspaceCustomCss,
  normalizeWorkspaceFontSize,
  normalizeWorkspaceSidebarLayoutMode,
  normalizeWorkspaceSidebarManualSplitRatio,
  normalizeWorkspaceZoom,
  normalizeWorkspaceZoomMode,
  normalizeWorkspaceThemeTransitionShape,
} from "$lib/workspace/preferences-service.js";
import {
  normalizeWorkspaceThemePreset,
  resolveWorkspaceThemeToggleTarget,
} from "$lib/workspace/theme/theme-presets.js";
import { buildWorkspaceDefaultThemeTemplate } from "$lib/workspace/theme/theme-default-template.js";
import { runWorkspaceThemeTransition } from "$lib/workspace/theme-transition.js";

/**
 * @param {{
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
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
 * }} deps
 */
export function createWorkspaceSettingsActions(deps) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let workspaceCustomCssSaveTimer = null;

  function clearWorkspaceCustomCssPersistTimer() {
    if (workspaceCustomCssSaveTimer == null) return;
    clearTimeout(workspaceCustomCssSaveTimer);
    workspaceCustomCssSaveTimer = null;
  }

  /**
   * @param {string} text
   */
  async function copyTextToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "true");
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }

  /**
   * @param {string} preset
   * @param {{ persist?: boolean; animate?: boolean }} [options]
   */
  async function setWorkspaceThemePreset(preset, options = {}) {
    const persist = options.persist ?? true;
    const animate = options.animate ?? true;
    const safePreset = normalizeWorkspaceThemePreset(preset);
    if (safePreset === deps.getWorkspaceTheme()) {
      if (persist) {
        await deps.savePrefs({ workspaceTheme: safePreset });
      }
      return;
    }
    if (animate) {
      await runWorkspaceThemeTransition({
        doc: document,
        shape: deps.getThemeTransitionShape(),
        onApplyTheme: () => {
          deps.setWorkspaceTheme(safePreset);
        },
      });
    } else {
      deps.setWorkspaceTheme(safePreset);
    }
    deps.setWorkspaceTheme(safePreset);
    if (persist) {
      await deps.savePrefs({ workspaceTheme: safePreset });
    }
  }

  async function toggleTheme() {
    const nextTheme = resolveWorkspaceThemeToggleTarget(deps.getWorkspaceTheme());
    await setWorkspaceThemePreset(nextTheme, { persist: true, animate: true });
  }

  /** @param {string} css */
  function setWorkspaceCustomCss(css) {
    const safeCss = normalizeWorkspaceCustomCss(css);
    deps.setWorkspaceCustomCssState(safeCss);
    clearWorkspaceCustomCssPersistTimer();
    workspaceCustomCssSaveTimer = setTimeout(() => {
      deps.savePrefs({ workspaceCustomCss: safeCss });
      workspaceCustomCssSaveTimer = null;
    }, 320);
  }

  async function resetWorkspaceCustomCss() {
    clearWorkspaceCustomCssPersistTimer();
    deps.setWorkspaceCustomCssState("");
    await deps.savePrefs({ workspaceCustomCss: "" });
  }

  /** @param {string} preset */
  async function handleWorkspaceThemePresetChange(preset) {
    await setWorkspaceThemePreset(preset, { persist: true, animate: true });
  }

  async function exportWorkspaceThemeCss() {
    const css = normalizeWorkspaceCustomCss(deps.getWorkspaceCustomCss());
    const text = css.trim()
      ? `${css.trim()}\n`
      : "/* Empty custom theme. Paste the full template and edit by module. */\n";
    const blob = new Blob([text], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `desk-tidy-workspace-theme-${deps.getWorkspaceTheme()}-${stamp}.css`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyWorkspaceDefaultThemeTemplate() {
    try {
      const template = buildWorkspaceDefaultThemeTemplate();
      await copyTextToClipboard(template);
      return { ok: true };
    } catch (error) {
      console.error("copyWorkspaceDefaultThemeTemplate", error);
      const strings = deps.getStrings();
      return { ok: false, message: strings.workspaceThemeCopyDefaultFailed || "Copy failed" };
    }
  }

  /**
   * @param {string} rawText
   */
  async function importWorkspaceThemeCss(rawText) {
    const importedCustomCss = normalizeWorkspaceCustomCss(rawText);
    if (!importedCustomCss.trim()) {
      const strings = deps.getStrings();
      return {
        ok: false,
        message: strings.workspaceThemeImportInvalid || strings.workspaceThemeImportFailed || "Invalid theme content",
      };
    }
    clearWorkspaceCustomCssPersistTimer();
    deps.setWorkspaceCustomCssState(importedCustomCss);
    await deps.savePrefs({ workspaceCustomCss: importedCustomCss });
    return { ok: true };
  }

  /**
   * @param {unknown} zoom
   * @param {{ persist?: boolean }} [options]
   */
  async function setWorkspaceZoom(zoom, options = {}) {
    const persist = options.persist ?? true;
    const nextZoom = normalizeWorkspaceZoom(zoom);
    deps.setWorkspaceZoomState(nextZoom);
    deps.setWorkspaceZoomMode("manual");
    if (persist) {
      await deps.savePrefs({ workspaceZoom: nextZoom, workspaceZoomMode: "manual" });
    }
  }

  /** @param {string} option */
  async function setWorkspaceZoomOption(option) {
    const safeMode = normalizeWorkspaceZoomMode(option);
    if (option === "auto") {
      deps.setWorkspaceZoomMode(safeMode);
      await deps.savePrefs({ workspaceZoomMode: "auto", workspaceZoom: deps.getWorkspaceZoom() });
      return;
    }
    await setWorkspaceZoom(Number(option), { persist: true });
  }

  /** @param {string} size */
  async function setWorkspaceFontSize(size) {
    const safeSize = normalizeWorkspaceFontSize(size);
    deps.setWorkspaceFontSize(safeSize);
    await deps.savePrefs({ workspaceFontSize: safeSize });
  }

  /** @param {string} mode */
  async function setWorkspaceSidebarLayoutMode(mode) {
    const safe = normalizeWorkspaceSidebarLayoutMode(mode);
    deps.setWorkspaceSidebarLayoutModeState(safe);
    await deps.savePrefs({ workspaceSidebarLayoutMode: safe });
  }

  /** @param {number} ratio */
  function setWorkspaceSidebarManualSplitRatioLocal(ratio) {
    deps.setWorkspaceSidebarManualSplitRatioState(normalizeWorkspaceSidebarManualSplitRatio(ratio));
  }

  /** @param {number} ratio */
  function handleSidebarManualSplitRatioInput(ratio) {
    setWorkspaceSidebarManualSplitRatioLocal(ratio);
  }

  /** @param {number} ratio */
  async function handleSidebarManualSplitRatioCommit(ratio) {
    const safe = normalizeWorkspaceSidebarManualSplitRatio(ratio);
    deps.setWorkspaceSidebarManualSplitRatioState(safe);
    await deps.savePrefs({ workspaceSidebarManualSplitRatio: safe });
  }

  /** @param {string} shape */
  async function changeThemeTransitionShape(shape) {
    const safe = normalizeWorkspaceThemeTransitionShape(shape);
    deps.setThemeTransitionShape(safe);
    await deps.savePrefs({ workspaceThemeTransitionShape: safe });
  }

  return {
    setWorkspaceThemePreset,
    toggleTheme,
    clearWorkspaceCustomCssPersistTimer,
    setWorkspaceCustomCss,
    resetWorkspaceCustomCss,
    handleWorkspaceThemePresetChange,
    exportWorkspaceThemeCss,
    copyWorkspaceDefaultThemeTemplate,
    importWorkspaceThemeCss,
    setWorkspaceZoom,
    setWorkspaceZoomOption,
    setWorkspaceFontSize,
    setWorkspaceSidebarLayoutMode,
    setWorkspaceSidebarManualSplitRatioLocal,
    handleSidebarManualSplitRatioInput,
    handleSidebarManualSplitRatioCommit,
    changeThemeTransitionShape,
  };
}
