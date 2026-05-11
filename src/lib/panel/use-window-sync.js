import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { applyNoSnapWhenReady } from "$lib/panel/window-effects.js";
import { applyNoteWindowNativeEffects } from "$lib/note/note-native-effects.js";

/**
 * @param {{
 *   getNotes: () => any[];
 *   getStickiesVisible: () => boolean;
 *   invoke: typeof import("@tauri-apps/api/core").invoke;
 * }} deps
 */
export function createWindowSync(deps) {
  const NOTE_WINDOW_READY_TIMEOUT_MS = 900;
  const WINDOW_SYNC_CONCURRENCY = 4;

  /** @type {Map<string, Promise<void>>} */
  const creatingLabels = new Map();
  /** @type {Promise<void> | null} */
  let syncInFlight = null;
  let syncRequested = false;

  function shouldDisableNativeShadow() {
    return (
      typeof navigator !== "undefined" &&
      /win/i.test(String(navigator.userAgent || navigator.platform || ""))
    );
  }

  /** @param {unknown} value */
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  /**
   * @template T
   * @param {T[]} items
   * @param {(item: T) => Promise<void>} task
   */
  async function runWindowTasks(items, task) {
    const queue = [...items];
    const workers = Array.from(
      { length: Math.min(WINDOW_SYNC_CONCURRENCY, queue.length) },
      async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item === undefined) return;
          await task(item);
        }
      },
    );
    await Promise.all(workers);
  }

  /** @param {string | undefined | null} label */
  function noteIdFromLabel(label) {
    if (typeof label !== "string") return "";
    if (!label.startsWith("note-")) return "";
    return label.slice(5);
  }

  /** @param {string | undefined | null} label */
  async function persistNoteWindowSizeByLabel(label) {
    const id = noteIdFromLabel(label);
    if (!id) return;
    try {
      await deps.invoke("persist_note_window_size", {
        id,
        emitEvent: false,
      });
    } catch (error) {
      console.error("persist_note_window_size", error);
    }
  }

  /** @param {string | undefined | null} label */
  async function closeNoteWindowByLabel(label) {
    const safeLabel = String(label || "").trim();
    if (!safeLabel) return;
    try {
      await persistNoteWindowSizeByLabel(safeLabel);
      await deps.invoke("dismiss_note_window_by_label", { label: safeLabel });
    } catch (error) {
      console.error("closeNoteWindowByLabel", error);
    }
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

  /** @param {string} label */
  async function waitForNoteWindowReady(label) {
    await new Promise((resolve) => {
      /** @type {(() => void) | null} */
      let unlisten = null;
      let finished = false;
      const timer = setTimeout(finish, NOTE_WINDOW_READY_TIMEOUT_MS);

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        unlisten?.();
        resolve(undefined);
      }

      listen("note_window_ready", (event) => {
        const payload = /** @type {{ label?: unknown } | null | undefined} */ (event.payload);
        if (payload?.label === label) finish();
      })
        .then((nextUnlisten) => {
          if (finished) {
            nextUnlisten();
            return;
          }
          unlisten = nextUnlisten;
        })
        .catch(() => finish());
    });
  }

  /**
   * @param {import("@tauri-apps/api/webviewWindow").WebviewWindow} window
   * @param {any} note
   * @param {{ waitForReady?: boolean }} [options]
   */
  async function showNoteWindowAfterLayerReady(window, note, options = {}) {
    const readyPromise = options.waitForReady ? waitForNoteWindowReady(window.label) : null;
    try {
      await applyNoteWindowNativeEffects(window.label, note?.frost ?? 0);
    } catch (error) {
      console.error("applyNoteWindowNativeEffects(show)", error);
    }
    try {
      await syncNoteLayerOnce(note);
    } catch (error) {
      console.error("sync_note_window_layer(initial)", error);
    }
    if (readyPromise) {
      await readyPromise;
    }
    if (!deps.getStickiesVisible()) {
      await window.close();
      return;
    }
    await window.show();
    if (note?.isAlwaysOnTop) {
      await window.setFocus();
    }
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
    const creating = creatingLabels.get(label);
    if (creating) {
      await creating;
      return;
    }

    const windowOptions = /** @type {any} */ ({
      url: `/note/${noteId}`,
      title: "Sticky Note",
      width: isFiniteNumber(note?.width) ? Math.max(220, note.width) : 300,
      height: isFiniteNumber(note?.height) ? Math.max(220, note.height) : 300,
      x: isFiniteNumber(note?.x) ? note.x : undefined,
      y: isFiniteNumber(note?.y) ? note.y : undefined,
      decorations: false,
      transparent: true,
      backgroundColor: [0, 0, 0, 0],
      alwaysOnTop: false,
      skipTaskbar: true,
      resizable: true,
      maximizable: false,
      visible: false,
      devtools: true,
    });
    if (shouldDisableNativeShadow()) {
      windowOptions.shadow = false;
    }

    const webview = new WebviewWindow(label, windowOptions);

    const creatingPromise = new Promise((resolve) => {
      webview.once("tauri://created", async function () {
        try {
          await applyNoSnapWhenReady(deps.invoke, label);
          await deps.invoke("configure_note_panel_window", { label });
          await showNoteWindowAfterLayerReady(webview, note, { waitForReady: true });
        } catch (error) {
          console.error("openNoteWindow(created)", error);
        } finally {
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
          resolve(undefined);
        }
      });
    });
    creatingLabels.set(label, creatingPromise);
    try {
      await creatingPromise;
    } finally {
      creatingLabels.delete(label);
    }
  }

  /** @param {string | number} noteId */
  async function closeNoteWindow(noteId) {
    const label = `note-${noteId}`;
    await closeNoteWindowByLabel(label);
  }

  async function runSyncIteration() {
    if (!deps.getStickiesVisible()) {
      const wins = await WebviewWindow.getAll();
      const noteWins = wins.filter((w) => w.label.startsWith("note-"));
      await runWindowTasks(noteWins, async (w) => {
        try {
          await closeNoteWindowByLabel(w.label);
        } catch (e) {
          console.error("syncWindows(close-hidden)", e);
        }
      });
      return;
    }

    const notes = deps.getNotes();
    const activeNotes = notes.filter((n) => n.isPinned && !n.isArchived && !n.isDeleted);
    const shouldExist = new Set(
      activeNotes.map((n) => `note-${n.id}`),
    );

    try {
      const all = await WebviewWindow.getAll();
      const staleWins = all.filter((w) => w.label?.startsWith("note-") && !shouldExist.has(w.label));
      await runWindowTasks(staleWins, async (w) => {
        try {
          await closeNoteWindowByLabel(w.label);
        } catch (e) {
          console.error("syncWindows(close-stale)", e);
        }
      });
    } catch (e) {
      console.error("syncWindows(close)", e);
    }

    await runWindowTasks(activeNotes, async (n) => {
      try {
        const label = `note-${n.id}`;
        const exists = await WebviewWindow.getByLabel(label);
        if (!exists) {
          await openNoteWindow(n);
          return;
        }
        const [visible, minimized] = await Promise.all([
          exists.isVisible(),
          exists.isMinimized(),
        ]);
        if (!visible || minimized) {
          if (minimized) {
            await exists.unminimize();
          }
          await showNoteWindowAfterLayerReady(exists, n);
        }
      } catch (e) {
        console.error("syncWindows(restore)", e);
      }
    });
  }

  async function syncWindows() {
    syncRequested = true;
    if (syncInFlight) {
      await syncInFlight;
      return;
    }

    syncInFlight = (async () => {
      while (syncRequested) {
        syncRequested = false;
        await runSyncIteration();
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
