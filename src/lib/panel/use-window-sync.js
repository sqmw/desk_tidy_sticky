import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/**
 * @param {{
 *   getNotes: () => any[];
 *   getStickiesVisible: () => boolean;
 * }} deps
 */
export function createWindowSync(deps) {
  /** @param {any} note */
  async function openNoteWindow(note) {
    const noteId = note?.id;
    if (!noteId) return;

    const label = `note-${noteId}`;
    const webview = new WebviewWindow(label, {
      url: `/note/${noteId}`,
      title: "Sticky Note",
      width: 300,
      height: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: !!note?.isAlwaysOnTop,
      skipTaskbar: true,
    });

    webview.once("tauri://created", function () {});
    webview.once("tauri://error", async function (e) {
      console.error(e);
      const w = await WebviewWindow.getByLabel(label);
      if (w) await w.setFocus();
    });
  }

  /** @param {string | number} noteId */
  async function closeNoteWindow(noteId) {
    const label = `note-${noteId}`;
    const w = await WebviewWindow.getByLabel(label);
    if (w) {
      await w.close();
    }
  }

  async function syncWindows() {
    if (!deps.getStickiesVisible()) {
      const wins = await WebviewWindow.getAll();
      for (const w of wins) {
        if (w.label.startsWith("note-")) {
          await w.close();
        }
      }
      return;
    }

    const notes = deps.getNotes();
    const shouldExist = new Set(
      notes
        .filter((n) => n.isPinned && !n.isArchived && !n.isDeleted)
        .map((n) => `note-${n.id}`),
    );

    try {
      const all = await WebviewWindow.getAll();
      for (const w of all) {
        if (w.label?.startsWith("note-") && !shouldExist.has(w.label)) {
          await w.close();
        }
      }
    } catch (e) {
      console.error("syncWindows(close)", e);
    }

    for (const n of notes) {
      if (n.isPinned && !n.isArchived && !n.isDeleted) {
        const label = `note-${n.id}`;
        const exists = await WebviewWindow.getByLabel(label);
        if (!exists) {
          await openNoteWindow(n);
        }
      }
    }
  }

  return {
    openNoteWindow,
    closeNoteWindow,
    syncWindows,
  };
}
