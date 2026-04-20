import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function ensureDesktopNotificationPermission() {
  try {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch (error) {
    console.error("ensureDesktopNotificationPermission", error);
    return false;
  }
}

export async function hasDesktopNotificationPermission() {
  try {
    return await isPermissionGranted();
  } catch (error) {
    console.error("hasDesktopNotificationPermission", error);
    return false;
  }
}

/**
 * @param {string} title
 * @param {string} body
 */
export async function sendDesktopNotification(title, body) {
  try {
    if (!(await isPermissionGranted())) return false;
    sendNotification({ title, body });
    return true;
  } catch (error) {
    console.error("sendDesktopNotification", error);
    return false;
  }
}

/**
 * @param {number} seconds
 */
export function formatSecondsBrief(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  if (mm <= 0) return `${ss}s`;
  if (ss <= 0) return `${mm}m`;
  return `${mm}m ${ss}s`;
}
