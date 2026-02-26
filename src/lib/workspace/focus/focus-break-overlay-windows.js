import { availableMonitors } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";

export const BREAK_OVERLAY_EVENT_UPDATE = "focus_break_overlay_update";
export const BREAK_OVERLAY_EVENT_ACTION = "focus_break_overlay_action";
export const BREAK_OVERLAY_EVENT_READY = "focus_break_overlay_ready";
export const BREAK_OVERLAY_LABEL_PREFIX = "focus-break-overlay-";

/**
 * @param {number} index
 */
function overlayLabel(index) {
  return `${BREAK_OVERLAY_LABEL_PREFIX}${index}`;
}

/**
 * @param {{ position?: { x?: number; y?: number }; size?: { width?: number; height?: number }; scaleFactor?: number }} monitor
 */
function monitorToLogicalBounds(monitor) {
  const scale = Number(monitor?.scaleFactor || 1);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const px = Number(monitor?.position?.x || 0);
  const py = Number(monitor?.position?.y || 0);
  const pw = Number(monitor?.size?.width || 1920);
  const ph = Number(monitor?.size?.height || 1080);
  return {
    // WebviewWindow constructor expects logical pixels.
    // Use floor/ceil to avoid sub-pixel rounding gaps on mixed-DPI multi-monitor setups.
    x: Math.floor(px / safeScale),
    y: Math.floor(py / safeScale),
    width: Math.max(320, Math.ceil(pw / safeScale)),
    height: Math.max(240, Math.ceil(ph / safeScale)),
  };
}

/**
 * @param {string} label
 * @param {{ position?: { x?: number; y?: number }; size?: { width?: number; height?: number }; scaleFactor?: number }} monitor
 * @param {WebviewWindow} window
 */
async function applyOverlayWindowGeometry(label, monitor, window) {
  const logical = monitorToLogicalBounds(monitor);
  try {
    // Ensure geometry APIs remain available when reusing a previously fullscreen overlay window.
    try {
      await window.setSimpleFullscreen(false);
    } catch (_) {
      // noop
    }
    try {
      await window.setFullscreen(false);
    } catch (_) {
      // noop
    }
    await window.setPosition(new LogicalPosition(logical.x, logical.y));
    await window.setSize(new LogicalSize(logical.width, logical.height));
  } catch (error) {
    console.error("set break overlay logical geometry failed", label, error);
    throw error;
  }
}

/**
 * @param {WebviewWindow} window
 */
async function applyOverlayWindowRuntimeState(window) {
  try {
    await window.setAlwaysOnTop(true);
  } catch (_) {
    // noop
  }
  try {
    await window.setShadow(false);
  } catch (_) {
    // noop
  }
  try {
    await window.setIgnoreCursorEvents(false);
  } catch (_) {
    // noop
  }
  await window.show();
  try {
    await window.setSimpleFullscreen(true);
  } catch (_) {
    try {
      await window.setFullscreen(true);
    } catch (_) {
      // noop
    }
  }
  try {
    await window.setFocus();
  } catch (_) {
    // noop
  }
}

/**
 * @param {string} label
 * @param {{ position?: { x?: number; y?: number }; size?: { width?: number; height?: number }; scaleFactor?: number }} monitor
 */
async function ensureOverlayWindow(label, monitor) {
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    try {
      await applyOverlayWindowGeometry(label, monitor, existing);
      await applyOverlayWindowRuntimeState(existing);
      return existing;
    } catch (reuseError) {
      console.error("reuse break overlay window failed, recreate", label, reuseError);
      try {
        await existing.hide();
      } catch (_) {
        // noop
      }
      try {
        await existing.close();
      } catch (_) {
        // noop
      }
      try {
        await existing.destroy();
      } catch (_) {
        // noop
      }
    }
  }

  const logical = monitorToLogicalBounds(monitor);
  const webview = new WebviewWindow(label, {
    url: "/break-overlay",
    title: "Break reminder",
    x: logical.x,
    y: logical.y,
    width: logical.width,
    height: logical.height,
    center: false,
    decorations: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    focus: true,
    shadow: false,
  });
  await new Promise((resolve, reject) => {
    webview.once("tauri://created", () => resolve(true));
    webview.once("tauri://error", (event) =>
      reject(new Error(String(event?.payload || "create break overlay window failed"))),
    );
  });
  await applyOverlayWindowGeometry(label, monitor, webview);
  await applyOverlayWindowRuntimeState(webview);
  return webview;
}

/**
 * @param {Set<string>} keepLabels
 */
async function closeStaleOverlayWindows(keepLabels) {
  const windows = await WebviewWindow.getAll();
  for (const window of windows) {
    const label = String(window.label || "");
    if (!label.startsWith(BREAK_OVERLAY_LABEL_PREFIX)) continue;
    if (keepLabels.has(label)) continue;
    try {
      await window.hide();
    } catch (_) {
      // noop
    }
    try {
      await window.close();
    } catch (error) {
      console.error("close break overlay window failed, fallback destroy", label, error);
      try {
        await window.destroy();
      } catch (destroyError) {
        console.error("destroy break overlay window failed", label, destroyError);
      }
    }
  }
}

export async function ensureBreakOverlayWindows() {
  const monitors = await availableMonitors();
  if (!Array.isArray(monitors) || monitors.length === 0) {
    await closeStaleOverlayWindows(new Set());
    return [];
  }
  const keepLabels = new Set();
  for (let index = 0; index < monitors.length; index += 1) {
    const label = overlayLabel(index);
    keepLabels.add(label);
    await ensureOverlayWindow(label, monitors[index]);
  }
  await closeStaleOverlayWindows(keepLabels);
  return Array.from(keepLabels);
}

export async function closeBreakOverlayWindows() {
  await closeStaleOverlayWindows(new Set());
}

/**
 * @param {string[]} labels
 */
export async function closeBreakOverlayWindowsByLabels(labels) {
  const uniqueLabels = Array.from(new Set((labels || []).map((label) => String(label || "")))).filter(Boolean);
  for (const label of uniqueLabels) {
    const window = await WebviewWindow.getByLabel(label);
    if (!window) continue;
    try {
      await window.hide();
    } catch (_) {
      // noop
    }
    try {
      await window.close();
    } catch (error) {
      console.error("close break overlay by label failed, fallback destroy", label, error);
      try {
        await window.destroy();
      } catch (destroyError) {
        console.error("destroy break overlay by label failed", label, destroyError);
      }
    }
  }
}

/**
 * @param {string[]} labels
 * @param {Record<string, any>} payload
 * @returns {Promise<string[]>}
 */
export async function emitBreakOverlayState(labels, payload) {
  const uniqueLabels = Array.from(new Set((labels || []).map((label) => String(label || "")))).filter(Boolean);
  /** @type {string[]} */
  const healthyLabels = [];
  for (const label of uniqueLabels) {
    const window = await WebviewWindow.getByLabel(label);
    if (!window) continue;
    try {
      await window.emit(BREAK_OVERLAY_EVENT_UPDATE, payload);
      healthyLabels.push(label);
    } catch (error) {
      console.error("emit break overlay state failed", label, error);
      try {
        await window.hide();
      } catch (_) {
        // noop
      }
      try {
        await window.close();
      } catch (_) {
        // noop
      }
      try {
        await window.destroy();
      } catch (_) {
        // noop
      }
    }
  }
  return healthyLabels;
}
