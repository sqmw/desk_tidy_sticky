export const BREAK_SCHEDULE_MODE_TASK = "task";
export const BREAK_SCHEDULE_MODE_INDEPENDENT = "independent";

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** @param {unknown} mode */
export function normalizeBreakScheduleMode(mode) {
  return mode === BREAK_SCHEDULE_MODE_INDEPENDENT
    ? BREAK_SCHEDULE_MODE_INDEPENDENT
    : BREAK_SCHEDULE_MODE_TASK;
}

/**
 * @param {unknown} raw
 * @returns {{ miniBreakEveryMinutes: number; longBreakEveryMinutes: number } | null}
 */
export function normalizeTaskBreakProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const input = /** @type {any} */ (raw);
  const hasMini = Number.isFinite(Number(input.miniBreakEveryMinutes));
  const hasLong = Number.isFinite(Number(input.longBreakEveryMinutes));
  if (!hasMini && !hasLong) return null;
  return {
    miniBreakEveryMinutes: clampInt(input.miniBreakEveryMinutes, 10, 5, 180),
    longBreakEveryMinutes: clampInt(input.longBreakEveryMinutes, 30, 15, 360),
  };
}

/**
 * @param {unknown} baseConfig
 * @param {unknown} task
 * @param {unknown} mode
 */
export function resolveBreakTimingConfig(baseConfig, task, mode) {
  const base = /** @type {any} */ (baseConfig || {});
  const safeMode = normalizeBreakScheduleMode(mode);
  if (safeMode === BREAK_SCHEDULE_MODE_INDEPENDENT) {
    return {
      ...base,
      miniBreakEveryMinutes: clampInt(
        base.independentMiniBreakEveryMinutes,
        clampInt(base.miniBreakEveryMinutes, 10, 5, 180),
        5,
        180,
      ),
      longBreakEveryMinutes: clampInt(
        base.independentLongBreakEveryMinutes,
        clampInt(base.longBreakEveryMinutes, 30, 15, 360),
        15,
        360,
      ),
    };
  }
  const profile = normalizeTaskBreakProfile((/** @type {any} */ (task || {})).breakProfile);
  if (!profile) return base;
  return {
    ...base,
    miniBreakEveryMinutes: profile.miniBreakEveryMinutes,
    longBreakEveryMinutes: profile.longBreakEveryMinutes,
  };
}
