import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { applyNoSnapWhenReady } from "$lib/panel/window-effects.js";

/**
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 */
async function ensureWorkspaceWindow(invoke) {
  const label = "workspace";
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) return { window: existing, created: false };

  const webview = new WebviewWindow(label, {
    url: "/workspace",
    title: "Desk Tidy Workspace",
    width: 1024,
    height: 720,
    center: true,
    decorations: false,
    transparent: false,
    skipTaskbar: true,
    resizable: true,
    maximizable: true,
  });

  await new Promise((resolve, reject) => {
    webview.once("tauri://created", () => resolve(true));
    webview.once("tauri://error", (e) => reject(new Error(String(e?.payload || "create workspace failed"))));
  });

  return { window: webview, created: true };
}

/**
 * @param {number} timeoutMs
 */
async function waitWorkspaceReady(timeoutMs) {
  return await new Promise((resolve) => {
    let settled = false;
    /** @type {null | (() => void)} */
    let unlistenFn = null;

    /** @param {boolean} ok */
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (unlistenFn) {
        try {
          unlistenFn();
        } catch {}
      }
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    listen("workspace_ready", () => finish(true))
      .then((unlisten) => {
        if (settled) {
          try {
            unlisten();
          } catch {}
          return;
        }
        unlistenFn = unlisten;
      })
      .catch(() => {});
  });
}

/**
 * @param {"compact" | "workspace"} target
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 */
export async function switchPanelWindow(target, invoke) {
  const current = getCurrentWindow();
  const currentLabel = current.label;

  if (target === "workspace") {
    const { window: ws, created } = await ensureWorkspaceWindow(invoke);
    const readyWait = created ? waitWorkspaceReady(1500) : Promise.resolve(true);
    await ws.show();
    await ws.setFocus();
    await applyNoSnapWhenReady(invoke, "workspace");
    const ready = await readyWait;
    if (ready && currentLabel !== "workspace") {
      await current.hide();
    } else if (!ready && currentLabel === "main") {
      // Keep main window as fallback when workspace failed to report mounted state.
      await current.show();
      await current.setFocus();
    }
    return;
  }

  const compact = await WebviewWindow.getByLabel("main");
  if (!compact) return;
  await compact.show();
  await compact.setFocus();
  if (currentLabel !== "main") {
    await current.hide();
  }
}
