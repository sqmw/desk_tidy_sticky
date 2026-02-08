/**
 * @param {{
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 *   getSortMode: () => string;
 *   getViewMode: () => string;
 *   getHideAfterSave: () => boolean;
 *   getNewNoteText: () => string;
 *   setNewNoteText: (v: string) => void;
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
      try {
        await deps.invoke("sync_all_note_window_layers");
      } catch (e) {
        console.error("sync_all_note_window_layers failed", e);
      }
    } catch (e) {
      console.error("loadNotes", e);
    }
  }

  async function saveNote(pin = false) {
    const text = deps.getNewNoteText().trim();
    if (!text) return;

    try {
      const sortMode = deps.getSortMode();
      await deps.invoke("add_note", { text, isPinned: pin, sortMode });
      deps.setNewNoteText("");
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
      if (viewMode === "active") return !n.isArchived && !n.isDeleted;
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
    toggleArchive,
    deleteNote,
    restoreNote,
    emptyTrash,
    persistReorderedVisible,
  };
}
