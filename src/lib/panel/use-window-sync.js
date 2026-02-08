import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/**
 * @param {{
 *   getNotes: () => any[];
 *   getStickiesVisible: () => boolean;
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 * }} deps
 */
export function createWindowSync(deps) {
  /** @type {Set<string>} */
  const creatingLabels = new Set();
  /** @type {Promise<void> | null} */
  let syncInFlight = null;

  /** @param {any} note */
  async function openNoteWindow(note) {
    const noteId = note?.id;
    if (!noteId) return;

    const label = `note-${noteId}`;
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    if (creatingLabels.has(label)) return;
    creatingLabels.add(label);

    const webview = new WebviewWindow(label, {
      url: `/note/${noteId}`,
      title: "Sticky Note",
      width: 300,
      height: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: !!note?.isAlwaysOnTop,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
    });

    webview.once("tauri://created", async function () {
      try {
        await deps.invoke("apply_window_no_snap_by_label", { label });
      } catch (e) {
        console.error("apply_window_no_snap_by_label", e);
      }
    });
    webview.once("tauri://error", async function (e) {
      const payload = String(e?.payload || "");
      if (!payload.includes("already exists")) {
        console.error(e);
      }
      const w = await WebviewWindow.getByLabel(label);
      if (w) await w.setFocus();
      creatingLabels.delete(label);
    });
    webview.once("tauri://created", function () {
      creatingLabels.delete(label);
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
    if (syncInFlight) {
      await syncInFlight;
      return;
    }

    syncInFlight = (async () => {
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
    })();
    try {
      await syncInFlight;
    } finally {
      syncInFlight = null;
    }
  }

  return {
    openNoteWindow,
    closeNoteWindow,
    syncWindows,
  };
}
