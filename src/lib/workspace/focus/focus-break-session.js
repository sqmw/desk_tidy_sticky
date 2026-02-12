export const BREAK_SESSION_NONE = "none";
export const BREAK_SESSION_30M = "30m";
export const BREAK_SESSION_1H = "1h";
export const BREAK_SESSION_2H = "2h";
export const BREAK_SESSION_TODAY = "today";

export const BREAK_SESSION_OPTIONS = [
  BREAK_SESSION_30M,
  BREAK_SESSION_1H,
  BREAK_SESSION_2H,
  BREAK_SESSION_TODAY,
];

/**
 * @param {unknown} raw
 */
export function normalizeBreakSession(raw) {
  const input = /** @type {any} */ (raw || {});
  const mode = BREAK_SESSION_OPTIONS.includes(input.mode) ? input.mode : BREAK_SESSION_NONE;
  const untilTs = Number(input.untilTs);
  if (!Number.isFinite(untilTs) || untilTs <= 0 || mode === BREAK_SESSION_NONE) {
    return {
      mode: BREAK_SESSION_NONE,
      untilTs: 0,
    };
  }
  return {
    mode,
    untilTs: Math.round(untilTs),
  };
}

/**
 * @param {string} mode
 * @param {number} [nowTs]
 */
export function createBreakSession(mode, nowTs = Date.now()) {
  const now = Math.max(0, Math.round(Number(nowTs || Date.now())));
  if (mode === BREAK_SESSION_30M) {
    return { mode, untilTs: now + 30 * 60 * 1000 };
  }
  if (mode === BREAK_SESSION_1H) {
    return { mode, untilTs: now + 60 * 60 * 1000 };
  }
  if (mode === BREAK_SESSION_2H) {
    return { mode, untilTs: now + 2 * 60 * 60 * 1000 };
  }
  if (mode === BREAK_SESSION_TODAY) {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return { mode, untilTs: d.getTime() };
  }
  return { mode: BREAK_SESSION_NONE, untilTs: 0 };
}

/**
 * @param {{ mode: string; untilTs: number } | null | undefined} session
 * @param {number} [nowTs]
 */
export function isBreakSessionActive(session, nowTs = Date.now()) {
  if (!session || session.mode === BREAK_SESSION_NONE) return false;
  const untilTs = Number(session.untilTs || 0);
  return Number.isFinite(untilTs) && untilTs > Math.round(Number(nowTs || Date.now()));
}

/**
 * @param {{ mode: string; untilTs: number } | null | undefined} session
 * @param {number} [nowTs]
 */
export function getBreakSessionRemainingText(session, nowTs = Date.now()) {
  if (!isBreakSessionActive(session, nowTs)) return "";
  const safe = session || { mode: BREAK_SESSION_NONE, untilTs: 0 };
  const ms = Math.max(0, Number(safe.untilTs || 0) - Math.round(Number(nowTs || Date.now())));
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h${m ? ` ${m}m` : ""}`;
  }
  return `${totalMinutes}m`;
}
