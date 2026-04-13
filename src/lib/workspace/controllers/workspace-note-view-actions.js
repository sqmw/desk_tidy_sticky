import {
  normalizeWorkspaceInitialViewMode,
  normalizeWorkspaceViewMode,
  WORKSPACE_NOTE_VIEW_TRASH,
} from "$lib/workspace/workspace-tabs.js";

/**
 * @param {{
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
 *   loadNotes: () => Promise<void>;
 *   setViewModeState: (next: string) => void;
 *   setInitialViewModeState: (next: string) => void;
 *   setSelectedTagState: (next: string) => void;
 *   setSortModeState: (next: string) => void;
 *   setLocaleState: (next: string) => void;
 * }} deps
 */
export function createWorkspaceNoteViewActions(deps) {
  /** @param {string} mode */
  async function setViewMode(mode) {
    const safeMode = normalizeWorkspaceViewMode(mode);
    deps.setViewModeState(safeMode);
    if (safeMode === WORKSPACE_NOTE_VIEW_TRASH) {
      deps.setSelectedTagState("");
    }
    await deps.savePrefs({ viewMode: safeMode });
    await deps.loadNotes();
  }

  /** @param {string} tag */
  function setSelectedTag(tag) {
    deps.setSelectedTagState(String(tag || "").trim());
  }

  /** @param {string} mode */
  async function setInitialViewMode(mode) {
    const safeMode = normalizeWorkspaceInitialViewMode(mode);
    deps.setInitialViewModeState(safeMode);
    await deps.savePrefs({ workspaceInitialViewMode: safeMode });
    if (safeMode !== "last") {
      await setViewMode(safeMode);
    }
  }

  /** @param {string} mode */
  async function setSortMode(mode) {
    deps.setSortModeState(mode);
    await deps.savePrefs({ sortMode: mode });
    await deps.loadNotes();
  }

  /** @param {string} nextLocale */
  async function setLanguage(nextLocale) {
    const safe = nextLocale === "zh" ? "zh" : "en";
    deps.setLocaleState(safe);
    await deps.savePrefs({ language: safe });
  }

  return {
    setViewMode,
    setSelectedTag,
    setInitialViewMode,
    setSortMode,
    setLanguage,
  };
}
