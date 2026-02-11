import { expandNoteCommands } from "$lib/markdown/note-markdown.js";

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
 *   getPendingLongDocDraft: () => { id: string } | null;
 *   setPendingLongDocDraft: (next: { id: string } | null) => void;
 *   setInspectorOpen: (open: boolean) => void;
 *   setInspectorNoteId: (id: string | null) => void;
 *   setInspectorMode: (mode: string) => void;
 *   setInspectorDraftText: (text: string) => void;
 *   getInspectorDraftText: () => string;
 *   setInspectorListCollapsed: (collapsed: boolean) => void;
 * }} deps
 */
export function createWorkspaceInspectorActions(deps) {
  /** @param {any} note */
  function openInspectorView(note) {
    deps.setInspectorOpen(true);
    deps.setInspectorNoteId(note.id);
    deps.setInspectorMode("view");
    deps.setInspectorDraftText(note.text || "");
  }

  /** @param {any} note */
  function openInspectorEdit(note) {
    deps.setInspectorOpen(true);
    deps.setInspectorNoteId(note.id);
    deps.setInspectorMode("edit");
    deps.setInspectorDraftText(note.text || "");
  }

  function closeInspector() {
    deps.setInspectorOpen(false);
    deps.setInspectorNoteId(null);
    deps.setInspectorMode("view");
    deps.setInspectorDraftText("");
    deps.setInspectorListCollapsed(false);
  }

  /**
   * @param {string} noteId
   */
  async function discardPendingLongDocDraft(noteId) {
    try {
      await deps.invoke("permanently_delete_note", { id: noteId });
      await deps.loadNotes();
      await deps.syncWindows();
    } catch (e) {
      console.error("discardPendingLongDocDraft(workspace)", e);
    } finally {
      deps.setPendingLongDocDraft(null);
      closeInspector();
    }
  }

  async function handleInspectorClose() {
    const inspectorNote = deps.getInspectorNote();
    const pendingLongDocDraft = deps.getPendingLongDocDraft();
    if (inspectorNote && pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
      await discardPendingLongDocDraft(String(inspectorNote.id));
      return;
    }
    closeInspector();
  }

  function startInspectorEdit() {
    const inspectorNote = deps.getInspectorNote();
    if (!inspectorNote) return;
    deps.setInspectorMode("edit");
    deps.setInspectorDraftText(inspectorNote.text || "");
  }

  async function cancelInspectorEdit() {
    const inspectorNote = deps.getInspectorNote();
    if (!inspectorNote) return;
    const pendingLongDocDraft = deps.getPendingLongDocDraft();
    if (pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
      await discardPendingLongDocDraft(String(inspectorNote.id));
      return;
    }
    deps.setInspectorMode("view");
    deps.setInspectorDraftText(inspectorNote.text || "");
  }

  async function saveInspectorEdit() {
    const inspectorNote = deps.getInspectorNote();
    const rawDraft = String(deps.getInspectorDraftText() || "");
    const nextText = expandNoteCommands(rawDraft.trim()).trim();
    if (!inspectorNote || !nextText) return;
    try {
      await deps.invoke("update_note_text", {
        id: inspectorNote.id,
        text: nextText,
        sortMode: deps.getSortMode(),
      });
      await deps.loadNotes();
      deps.setInspectorMode("view");
      deps.setInspectorDraftText(nextText);
      const pendingLongDocDraft = deps.getPendingLongDocDraft();
      if (pendingLongDocDraft && pendingLongDocDraft.id === String(inspectorNote.id)) {
        deps.setPendingLongDocDraft(null);
      }
    } catch (e) {
      console.error("saveInspectorEdit(workspace)", e);
    }
  }

  async function createLongDocument() {
    const raw = deps.getNewNoteText().trim();
    const text = raw || (deps.getLocale() === "zh" ? "# 新文档\n\n" : "# New document\n\n");
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
      if (created) {
        deps.setPendingLongDocDraft({ id: String(created.id) });
        openInspectorEdit(created);
      }
      deps.setNewNoteText("");
      deps.setNewNotePriority?.(null);
      deps.setNewNoteTags?.([]);
      if (deps.getMainTab() !== deps.notesTabKey) {
        await deps.setMainTab(deps.notesTabKey);
      }
    } catch (e) {
      console.error("createLongDocument(workspace)", e);
    }
  }

  return {
    openInspectorView,
    openInspectorEdit,
    closeInspector,
    handleInspectorClose,
    startInspectorEdit,
    cancelInspectorEdit,
    saveInspectorEdit,
    createLongDocument,
  };
}
