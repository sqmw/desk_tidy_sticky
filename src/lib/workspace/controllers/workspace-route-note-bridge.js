/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   getSortMode: () => string;
 *   getViewMode: () => string;
 *   getLocale: () => string;
 *   getMainTab: () => string;
 *   setMainTab: (tab: string) => Promise<void>;
 *   notesTabKey: string;
 *   getNewNoteText: () => string;
 *   setNewNoteText: (text: string) => void;
 *   getNewNotePriority: () => number | null;
 *   setNewNotePriority: (next: number | null) => void;
 *   getNewNoteTags: () => string[];
 *   setNewNoteTags: (next: string[]) => void;
 *   getSelectedTag: () => string;
 *   getNotes: () => any[];
 *   setNotes: (next: any[]) => void;
 *   suppressNotesReload: (ms: number) => void;
 *   syncWindows: () => Promise<void>;
 *   openNoteWindow: (note: any) => Promise<void>;
 *   closeNoteWindow: (noteId: string | number) => Promise<void>;
 *   getCurrentWindow: typeof import("@tauri-apps/api/window").getCurrentWindow;
 *   loadNotes?: () => Promise<void>;
 *   savePrefs?: (updates: Record<string, any>) => Promise<void>;
 *   setViewModeState?: (next: string) => void;
 *   setInitialViewModeState?: (next: string) => void;
 *   setSelectedTagState?: (next: string) => void;
 *   setSortModeState?: (next: string) => void;
 *   setLocaleState?: (next: string) => void;
 *   getInspectorNote: () => any | null;
 *   getPendingEditorDraft: () => { id: string } | null;
 *   setPendingEditorDraft: (next: { id: string } | null) => void;
 *   setInspectorOpen: (open: boolean) => void;
 *   setInspectorNoteId: (id: string | null) => void;
 *   setInspectorListCollapsed: (collapsed: boolean) => void;
 * }} input
 */
export function createWorkspaceRouteNoteBridge(input) {
  function createNoteCommandsConfig() {
    return {
      invoke: input.invoke,
      getSortMode: input.getSortMode,
      getViewMode: input.getViewMode,
      getHideAfterSave: () => false,
      getNewNoteText: input.getNewNoteText,
      setNewNoteText: input.setNewNoteText,
      getNewNotePriority: input.getNewNotePriority,
      setNewNotePriority: input.setNewNotePriority,
      getNewNoteTags: input.getNewNoteTags,
      setNewNoteTags: input.setNewNoteTags,
      getSelectedTag: input.getSelectedTag,
      getNotes: input.getNotes,
      setNotes: input.setNotes,
      suppressNotesReload: input.suppressNotesReload,
      syncWindows: input.syncWindows,
      openNoteWindow: input.openNoteWindow,
      closeNoteWindow: input.closeNoteWindow,
      getCurrentWindow: input.getCurrentWindow,
    };
  }

  function createInspectorActionsConfig() {
    return {
      invoke: input.invoke,
      loadNotes: /** @type {() => Promise<void>} */ (input.loadNotes),
      syncWindows: input.syncWindows,
      getSortMode: input.getSortMode,
      getLocale: input.getLocale,
      getMainTab: input.getMainTab,
      setMainTab: input.setMainTab,
      notesTabKey: input.notesTabKey,
      getNotes: input.getNotes,
      setNotes: input.setNotes,
      getNewNoteText: input.getNewNoteText,
      setNewNoteText: input.setNewNoteText,
      getNewNotePriority: input.getNewNotePriority,
      setNewNotePriority: input.setNewNotePriority,
      getNewNoteTags: input.getNewNoteTags,
      setNewNoteTags: input.setNewNoteTags,
      getSelectedTag: input.getSelectedTag,
      getInspectorNote: input.getInspectorNote,
      getPendingEditorDraft: input.getPendingEditorDraft,
      setPendingEditorDraft: input.setPendingEditorDraft,
      setInspectorOpen: input.setInspectorOpen,
      setInspectorNoteId: input.setInspectorNoteId,
      setInspectorListCollapsed: input.setInspectorListCollapsed,
    };
  }

  function createNoteViewActionsConfig() {
    return {
      savePrefs: /** @type {(updates: Record<string, any>) => Promise<void>} */ (input.savePrefs),
      loadNotes: /** @type {() => Promise<void>} */ (input.loadNotes),
      setViewModeState: /** @type {(next: string) => void} */ (input.setViewModeState),
      setInitialViewModeState: /** @type {(next: string) => void} */ (input.setInitialViewModeState),
      setSelectedTagState: /** @type {(next: string) => void} */ (input.setSelectedTagState),
      setSortModeState: /** @type {(next: string) => void} */ (input.setSortModeState),
      setLocaleState: /** @type {(next: string) => void} */ (input.setLocaleState),
    };
  }

  return {
    createInspectorActionsConfig,
    createNoteCommandsConfig,
    createNoteViewActionsConfig,
  };
}
