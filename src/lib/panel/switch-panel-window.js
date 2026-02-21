import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { applyNoSnapWhenReady } from "$lib/panel/window-effects.js";

/**
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 * @param {"main" | "workspace"} label
 */
async function saveLastPanelWindow(invoke, label) {
  try {
    const prefs = await invoke("get_preferences");
    await invoke("set_preferences", {
      prefs: { ...prefs, lastPanelWindow: label },
    });
  } catch (e) {
    console.warn("saveLastPanelWindow", e);
  }
}

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
 * @param {"compact" | "workspace"} target
 * @param {typeof import("@tauri-apps/api/core").invoke} invoke
 */
export async function switchPanelWindow(target, invoke) {
  const current = getCurrentWindow();
  const currentLabel = current.label;

  if (target === "workspace") {
    const { window: ws } = await ensureWorkspaceWindow(invoke);
    await ws.show();
    await ws.setFocus();
    await saveLastPanelWindow(invoke, "workspace");
    await applyNoSnapWhenReady(invoke, "workspace");
    if (currentLabel !== "workspace") {
      await current.hide();
    }
    const compact = await WebviewWindow.getByLabel("main");
    if (compact && currentLabel !== "main") {
      await compact.hide();
    }
    return;
  }

  const compact = await WebviewWindow.getByLabel("main");
  if (!compact) return;
  await compact.show();
  await compact.setFocus();
  await saveLastPanelWindow(invoke, "main");
  if (currentLabel !== "main") {
    await current.hide();
  }
  const workspace = await WebviewWindow.getByLabel("workspace");
  if (workspace && currentLabel !== "workspace") {
    await workspace.hide();
  }
}
