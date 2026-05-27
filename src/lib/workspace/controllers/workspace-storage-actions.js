import {
  exportCurrentNotesToMarkdown,
  getMarkdownStorageSnapshot,
  importMarkdownFromStorageRoot,
  previewMarkdownImportFromStorageRoot,
  normalizeMarkdownStorageMode,
  normalizeMarkdownStorageRoot,
  setMarkdownStoragePreferences,
} from "$lib/workspace/storage/markdown-storage-service.js";

/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   setMarkdownStorageMode: (next: string) => void;
 *   setMarkdownStorageRoot: (next: string) => void;
 *   setMarkdownStorageSnapshot: (next: any) => void;
 *   setMarkdownStorageSaving: (next: boolean) => void;
 *   setMarkdownStorageExporting: (next: boolean) => void;
 *   setMarkdownStorageImporting: (next: boolean) => void;
 * }} deps
 */
export function createWorkspaceStorageActions(deps) {
  async function refreshMarkdownStorage() {
    const snapshot = await getMarkdownStorageSnapshot(deps.invoke);
    deps.setMarkdownStorageMode(snapshot.mode);
    deps.setMarkdownStorageRoot(snapshot.configuredRoot);
    deps.setMarkdownStorageSnapshot(snapshot);
    return snapshot;
  }

  /**
   * @param {{ mode: string; root?: string }} input
   */
  async function applyMarkdownStorage(input) {
    deps.setMarkdownStorageSaving(true);
    try {
      const snapshot = await setMarkdownStoragePreferences(deps.invoke, input);
      deps.setMarkdownStorageMode(snapshot.mode);
      deps.setMarkdownStorageRoot(snapshot.configuredRoot);
      deps.setMarkdownStorageSnapshot(snapshot);
      return { ok: true, snapshot };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error || "Failed to update Markdown storage"),
      };
    } finally {
      deps.setMarkdownStorageSaving(false);
    }
  }

  async function exportMarkdownStorage() {
    deps.setMarkdownStorageExporting(true);
    try {
      const summary = await exportCurrentNotesToMarkdown(deps.invoke);
      return {
        ok: true,
        summary,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error || "Failed to export Markdown"),
      };
    } finally {
      deps.setMarkdownStorageExporting(false);
    }
  }

  async function importMarkdownStorage() {
    deps.setMarkdownStorageImporting(true);
    try {
      const summary = await importMarkdownFromStorageRoot(deps.invoke);
      return {
        ok: true,
        summary,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error || "Failed to import Markdown"),
      };
    } finally {
      deps.setMarkdownStorageImporting(false);
    }
  }

  async function previewMarkdownImportStorage() {
    try {
      const summary = await previewMarkdownImportFromStorageRoot(deps.invoke);
      return { ok: true, summary };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : String(error || "Failed to preview Markdown import"),
      };
    }
  }

  return {
    refreshMarkdownStorage,
    applyMarkdownStorage,
    exportMarkdownStorage,
    previewMarkdownImportStorage,
    importMarkdownStorage,
    normalizeMarkdownStorageMode,
    normalizeMarkdownStorageRoot,
  };
}
