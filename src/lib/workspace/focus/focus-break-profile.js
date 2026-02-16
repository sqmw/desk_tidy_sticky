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
 * Resolve active break cadence.
 * - Has selected task: use task profile, otherwise task-default cadence.
 * - No selected task: use independent cadence (for standalone usage such as reading).
 *
 * @param {unknown} baseConfig
 * @param {unknown} task
 */
export function resolveBreakTimingConfig(baseConfig, task) {
  const base = /** @type {any} */ (baseConfig || {});
  const selectedTask = task && typeof task === "object" ? /** @type {any} */ (task) : null;
  if (selectedTask) {
    const profile = normalizeTaskBreakProfile(selectedTask.breakProfile);
    if (profile) {
      return {
        ...base,
        miniBreakEveryMinutes: profile.miniBreakEveryMinutes,
        longBreakEveryMinutes: profile.longBreakEveryMinutes,
      };
    }
    return {
      ...base,
      miniBreakEveryMinutes: clampInt(base.miniBreakEveryMinutes, 10, 5, 180),
      longBreakEveryMinutes: clampInt(base.longBreakEveryMinutes, 30, 15, 360),
    };
  }
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
