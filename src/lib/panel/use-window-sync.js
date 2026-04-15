import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { applyNoSnapWhenReady } from "$lib/panel/window-effects.js";

/**
 * @param {{
 *   getNotes: () => any[];
 *   getStickiesVisible: () => boolean;
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 * }} deps
 */
export function createWindowSync(deps) {
  const LAYER_SYNC_RETRY_DELAYS_MS = [80, 220];

  /** @type {Set<string>} */
  const creatingLabels = new Set();
  /** @type {Promise<void> | null} */
  let syncInFlight = null;

  /** @param {unknown} value */
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  /**
   * Some platforms expose the native window handle slightly after webview creation.
   * Keep layer sync scoped to the affected note to avoid reparenting every sticky.
   *
   * @param {any} note
   */
  async function syncNoteLayerOnce(note) {
    const noteId = note?.id;
    if (!noteId) return;

    await deps.invoke("sync_note_window_layer", { id: String(noteId) });
  }

  /** @param {any} note */
  async function retryNoteLayer(note) {
    for (let index = 0; index < LAYER_SYNC_RETRY_DELAYS_MS.length; index += 1) {
      const delay = LAYER_SYNC_RETRY_DELAYS_MS[index];
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        await syncNoteLayerOnce(note);
      } catch (error) {
        if (index === LAYER_SYNC_RETRY_DELAYS_MS.length - 1) {
          console.error("sync_note_window_layer(retry)", error);
        }
      }
    }
  }

  /**
   * @param {import("@tauri-apps/api/webviewWindow").WebviewWindow} window
   * @param {any} note
   */
  async function showNoteWindowAfterLayerReady(window, note) {
    try {
      await syncNoteLayerOnce(note);
    } catch (error) {
      console.error("sync_note_window_layer(initial)", error);
    }
    await window.show();
    if (note?.isAlwaysOnTop) {
      await window.setFocus();
    }
    try {
      await syncNoteLayerOnce(note);
    } catch (error) {
      console.error("sync_note_window_layer(after-show)", error);
    }
    void retryNoteLayer(note);
  }

  /** @param {any} note */
  async function openNoteWindow(note) {
    const noteId = note?.id;
    if (!noteId) return;

    const label = `note-${noteId}`;
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await showNoteWindowAfterLayerReady(existing, note);
      return;
    }
    if (creatingLabels.has(label)) return;
    creatingLabels.add(label);

    const webview = new WebviewWindow(label, {
      url: `/note/${noteId}`,
      title: "Sticky Note",
      width: isFiniteNumber(note?.width) ? Math.max(220, note.width) : 300,
      height: isFiniteNumber(note?.height) ? Math.max(220, note.height) : 300,
      x: isFiniteNumber(note?.x) ? note.x : undefined,
      y: isFiniteNumber(note?.y) ? note.y : undefined,
      decorations: false,
      transparent: true,
      alwaysOnTop: false,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
      visible: false,
    });

    await new Promise((resolve) => {
      webview.once("tauri://created", async function () {
        try {
          await applyNoSnapWhenReady(deps.invoke, label);
          await showNoteWindowAfterLayerReady(webview, note);
        } catch (error) {
          console.error("openNoteWindow(created)", error);
        } finally {
          creatingLabels.delete(label);
          resolve(undefined);
        }
      });
      webview.once("tauri://error", async function (e) {
        try {
          const payload = String(e?.payload || "");
          if (!payload.includes("already exists")) {
            console.error(e);
          }
          const w = await WebviewWindow.getByLabel(label);
          if (w) await showNoteWindowAfterLayerReady(w, note);
        } finally {
          creatingLabels.delete(label);
          resolve(undefined);
        }
      });
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
            continue;
          }
          try {
            const [visible, minimized] = await Promise.all([
              exists.isVisible(),
              exists.isMinimized(),
            ]);
            if (!visible || minimized) {
              try {
                await syncNoteLayerOnce(n);
              } catch (error) {
                console.error("sync_note_window_layer(restore)", error);
              }
              if (minimized) {
                await exists.unminimize();
              }
              await exists.show();
              if (n?.isAlwaysOnTop) {
                await exists.setFocus();
              }
              try {
                await syncNoteLayerOnce(n);
              } catch (error) {
                console.error("sync_note_window_layer(after-restore)", error);
              }
              void retryNoteLayer(n);
            }
          } catch (e) {
            console.error("syncWindows(restore)", e);
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
