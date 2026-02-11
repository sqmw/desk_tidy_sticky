import { expandNoteCommands } from "$lib/markdown/note-markdown.js";

/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   getSortMode: () => string;
 *   getViewMode: () => string;
 *   getHideAfterSave: () => boolean;
 *   getNewNoteText: () => string;
 *   setNewNoteText: (v: string) => void;
 *   getNewNotePriority?: () => number | null;
 *   setNewNotePriority?: (v: number | null) => void;
 *   getNewNoteTags?: () => string[];
 *   setNewNoteTags?: (v: string[]) => void;
 *   getSelectedTag?: () => string;
 *   getNotes: () => any[];
 *   setNotes: (v: any[]) => void;
 *   suppressNotesReload?: (ms: number) => void;
 *   syncWindows: () => Promise<void>;
 *   openNoteWindow: (note: any) => Promise<void>;
 *   closeNoteWindow: (noteId: string | number) => Promise<void>;
 *   getCurrentWindow: typeof import("@tauri-apps/api/window").getCurrentWindow;
 * }} deps
 */
export function createNoteCommands(deps) {
  async function loadNotes() {
    try {
      const sortMode = deps.getSortMode();
      const next = await deps.invoke("load_notes", { sortMode });
      deps.setNotes(next);
      await deps.syncWindows();
    } catch (e) {
      console.error("loadNotes", e);
    }
  }

  async function saveNote(pin = false, priorityOverride = undefined) {
    const text = expandNoteCommands(deps.getNewNoteText().trim()).trim();
    if (!text) return;
    let selectedPriority =
      priorityOverride === undefined ? (deps.getNewNotePriority?.() ?? null) : priorityOverride;
    if (deps.getViewMode() === "quadrant" && selectedPriority == null) {
      selectedPriority = 2;
    }
    const selectedTags = deps.getNewNoteTags?.() ?? [];
    const selectedTag = String(deps.getSelectedTag?.() ?? "").trim();
    const finalTags =
      selectedTag && !selectedTags.some((t) => String(t || "").trim().toLocaleLowerCase() === selectedTag.toLocaleLowerCase())
        ? [...selectedTags, selectedTag]
        : selectedTags;

    try {
      const sortMode = deps.getSortMode();
      await deps.invoke("add_note", {
        text,
        isPinned: pin,
        sortMode,
        priority: selectedPriority,
        tags: finalTags,
      });
      deps.setNewNoteText("");
      deps.setNewNotePriority?.(null);
      deps.setNewNoteTags?.([]);
      await loadNotes();

      if (deps.getHideAfterSave()) {
        const win = deps.getCurrentWindow();
        await win.hide();
      }
    } catch (e) {
      console.error("saveNote", e);
    }
  }

  /** @param {any} note */
  async function togglePin(note) {
    try {
      await deps.invoke("toggle_pin", { id: note.id, sortMode: deps.getSortMode() });
      await loadNotes();
    } catch (e) {
      console.error("togglePin", e);
    }
  }

  /** @param {any} note */
  async function toggleZOrder(note) {
    try {
      deps.suppressNotesReload?.(300);
      const next = await deps.invoke("toggle_z_order_and_apply", {
        id: note.id,
        sortMode: deps.getSortMode(),
      });
      // Apply returned list directly to avoid full-list flicker on each toggle.
      deps.setNotes(next);
      await deps.syncWindows();
    } catch (e) {
      console.error("toggleZOrder", e);
    }
  }

  /** @param {any} note */
  async function toggleDone(note) {
    try {
      await deps.invoke("toggle_done", { id: note.id, sortMode: deps.getSortMode() });
      await loadNotes();
    } catch (e) {
      console.error("toggleDone", e);
    }
  }

  /**
   * @param {any} note
   * @param {number | null | undefined} priority
   */
  async function updatePriority(note, priority) {
    try {
      if (priority == null) {
        await deps.invoke("clear_note_priority", {
          id: note.id,
          sortMode: deps.getSortMode(),
        });
      } else {
        await deps.invoke("update_note_priority", {
          id: note.id,
          priority,
          sortMode: deps.getSortMode(),
        });
      }
      await loadNotes();
    } catch (e) {
      console.error("updatePriority", e);
    }
  }

  /**
   * @param {any} note
   * @param {string[]} tags
   */
  async function updateTags(note, tags) {
    try {
      await deps.invoke("update_note_tags", {
        id: note.id,
        tags,
        sortMode: deps.getSortMode(),
      });
      await loadNotes();
    } catch (e) {
      console.error("updateTags", e);
    }
  }

  /** @param {any} note */
  async function toggleArchive(note) {
    try {
      await deps.invoke("toggle_archive", { id: note.id, sortMode: deps.getSortMode() });
      await loadNotes();
    } catch (e) {
      console.error("toggleArchive", e);
    }
  }

  /** @param {any} note */
  async function deleteNote(note) {
    try {
      if (deps.getViewMode() === "trash") {
        await deps.invoke("permanently_delete_note", { id: note.id });
      } else {
        await deps.invoke("delete_note", { id: note.id, sortMode: deps.getSortMode() });
      }
      await loadNotes();
    } catch (e) {
      console.error("deleteNote", e);
    }
  }

  /** @param {any} note */
  async function restoreNote(note) {
    try {
      await deps.invoke("restore_note", { id: note.id, sortMode: deps.getSortMode() });
      await loadNotes();
    } catch (e) {
      console.error("restoreNote", e);
    }
  }

  async function emptyTrash() {
    try {
      await deps.invoke("empty_trash");
      await loadNotes();
    } catch (e) {
      console.error("emptyTrash", e);
    }
  }

  /** @param {any[]} reorderedVisible */
  async function persistReorderedVisible(reorderedVisible) {
    const reordered = reorderedVisible.map((n, i) => ({ id: n.id, order: i }));
    const viewMode = deps.getViewMode();

    /** @param {any} n */
    const inCurrentView = (n) => {
      if (viewMode === "active" || viewMode === "quadrant") {
        return !n.isArchived && !n.isDeleted;
      }
      if (viewMode === "todo") {
        return !n.isArchived && !n.isDeleted && !n.isDone;
      }
      if (viewMode === "archived") return n.isArchived && !n.isDeleted;
      return n.isDeleted;
    };

    const iter = reorderedVisible[Symbol.iterator]();
    deps.setNotes(
      deps.getNotes().map((n) => {
        if (!inCurrentView(n)) return n;
        const next = iter.next();
        return next.done ? n : next.value;
      }),
    );

    try {
      await deps.invoke("reorder_notes", {
        reordered,
        isArchivedView: viewMode === "archived",
      });
    } catch (e) {
      console.error("reorderNotes", e);
      await loadNotes();
    }
  }

  return {
    loadNotes,
    saveNote,
    togglePin,
    toggleZOrder,
    toggleDone,
    updatePriority,
    updateTags,
    toggleArchive,
    deleteNote,
    restoreNote,
    emptyTrash,
    persistReorderedVisible,
  };
}
