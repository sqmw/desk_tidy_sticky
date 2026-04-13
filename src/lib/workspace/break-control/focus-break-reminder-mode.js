export const BREAK_REMINDER_MODE_PANEL = "panel";
export const BREAK_REMINDER_MODE_FULLSCREEN = "fullscreen";
export const BREAK_REMINDER_MODE_OPTIONS = [
  BREAK_REMINDER_MODE_FULLSCREEN,
  BREAK_REMINDER_MODE_PANEL,
];

/**
 * @param {unknown} mode
 */
export function normalizeBreakReminderMode(mode) {
  if (mode === BREAK_REMINDER_MODE_FULLSCREEN) return BREAK_REMINDER_MODE_FULLSCREEN;
  return BREAK_REMINDER_MODE_PANEL;
}
