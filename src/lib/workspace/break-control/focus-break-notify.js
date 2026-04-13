/**
 * @param {string} title
 * @param {string} body
 */
export async function sendDesktopNotification(title, body) {
  try {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    if (Notification.permission !== "granted") return false;
    new Notification(title, { body });
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
