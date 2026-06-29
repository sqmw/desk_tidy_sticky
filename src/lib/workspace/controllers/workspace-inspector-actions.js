/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   loadNotes: () => Promise<void>;
 *   syncWindows: () => Promise<void>;
 *   getSortMode: () => string;
 *   getLocale: () => string;
 *   getMainTab: () => string;
 *   setMainTab: (tab: string) => Promise<void>;
 *   notesTabKey: string;
 *   getNotes: () => any[];
 *   setNotes: (next: any[]) => void;
 *   getNewNoteText: () => string;
 *   setNewNoteText: (text: string) => void;
 *   getNewNotePriority?: () => number | null;
 *   setNewNotePriority?: (next: number | null) => void;
 *   getNewNoteTags?: () => string[];
 *   setNewNoteTags?: (next: string[]) => void;
 *   getSelectedTag?: () => string;
 *   getInspectorNote: () => any | null;
 *   getPendingEditorDraft: () => { id: string } | null;
 *   setPendingEditorDraft: (next: { id: string } | null) => void;
 *   setInspectorOpen: (open: boolean) => void;
 *   setInspectorNoteId: (id: string | null) => void;
 *   setInspectorListCollapsed: (collapsed: boolean) => void;
 * }} deps
 */
export function createWorkspaceInspectorActions(deps) {
  /** @param {any} note */
  function openInspectorView(note) {
    deps.setInspectorOpen(true);
    deps.setInspectorNoteId(note.id);
  }

  /** @param {any} note */
  function openInspectorEdit(note) {
    deps.setInspectorOpen(true);
    deps.setInspectorNoteId(note.id);
  }

  function closeInspector() {
    deps.setInspectorOpen(false);
    deps.setInspectorNoteId(null);
    deps.setInspectorListCollapsed(false);
  }

  /**
   * @param {string} noteId
   */
  async function discardPendingEditorDraft(noteId) {
    try {
      await deps.invoke("permanently_delete_note", { id: noteId });
      await deps.loadNotes();
      await deps.syncWindows();
    } catch (e) {
      console.error("discardPendingEditorDraft(workspace)", e);
    } finally {
      deps.setPendingEditorDraft(null);
      closeInspector();
    }
  }

  async function handleInspectorClose() {
    const inspectorNote = deps.getInspectorNote();
    const pendingEditorDraft = deps.getPendingEditorDraft();
    if (inspectorNote && pendingEditorDraft && pendingEditorDraft.id === String(inspectorNote.id)) {
      await discardPendingEditorDraft(String(inspectorNote.id));
      return;
    }
    closeInspector();
  }

  async function createNoteFromWorkspaceComposer() {
    const raw = deps.getNewNoteText().trim();
    const shouldOpenEditor = !raw;
    const text = raw || (deps.getLocale() === "zh" ? "# 新笔记\n\n" : "# New note\n\n");
    const beforeIds = new Set(deps.getNotes().map((n) => String(n.id)));
    const selectedTag = String(deps.getSelectedTag?.() ?? "").trim();
    const baseTags = deps.getNewNoteTags?.() ?? [];
    const tags =
      selectedTag && !baseTags.some((t) => String(t || "").trim().toLocaleLowerCase() === selectedTag.toLocaleLowerCase())
        ? [...baseTags, selectedTag]
        : baseTags;
    try {
      const next = await deps.invoke("add_note", {
        text,
        isPinned: false,
        sortMode: deps.getSortMode(),
        priority: deps.getNewNotePriority?.() ?? null,
        tags,
      });
      if (Array.isArray(next)) {
        deps.setNotes(next);
      } else {
        await deps.loadNotes();
      }
      await deps.syncWindows();
      const source = Array.isArray(next) ? next : deps.getNotes();
      const created = [...source]
        .filter((n) => !beforeIds.has(String(n.id)))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
      if (created && shouldOpenEditor) {
        deps.setPendingEditorDraft({ id: String(created.id) });
        openInspectorEdit(created);
      }
      deps.setNewNoteText("");
      deps.setNewNotePriority?.(null);
      deps.setNewNoteTags?.([]);
      if (deps.getMainTab() !== deps.notesTabKey) {
        await deps.setMainTab(deps.notesTabKey);
      }
    } catch (e) {
      console.error("createNoteFromWorkspaceComposer(workspace)", e);
    }
  }

  return {
    openInspectorView,
    openInspectorEdit,
    closeInspector,
    handleInspectorClose,
    createNoteFromWorkspaceComposer,
  };
}
