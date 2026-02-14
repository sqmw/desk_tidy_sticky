export const BREAK_SESSION_NONE = "none";
export const BREAK_SESSION_30M = "30m";
export const BREAK_SESSION_1H = "1h";
export const BREAK_SESSION_2H = "2h";
export const BREAK_SESSION_TODAY = "today";
export const BREAK_SESSION_SCOPE_GLOBAL = "global";
export const BREAK_SESSION_SCOPE_TASK = "task";

export const BREAK_SESSION_OPTIONS = [
  BREAK_SESSION_30M,
  BREAK_SESSION_1H,
  BREAK_SESSION_2H,
  BREAK_SESSION_TODAY,
];

export const BREAK_SESSION_SCOPE_OPTIONS = [
  BREAK_SESSION_SCOPE_GLOBAL,
  BREAK_SESSION_SCOPE_TASK,
];

/**
 * @param {unknown} raw
 */
export function normalizeBreakSession(raw) {
  const input = /** @type {any} */ (raw || {});
  const mode = BREAK_SESSION_OPTIONS.includes(input.mode) ? input.mode : BREAK_SESSION_NONE;
  const untilTs = Number(input.untilTs);
  const scope = BREAK_SESSION_SCOPE_OPTIONS.includes(input.scope)
    ? input.scope
    : BREAK_SESSION_SCOPE_GLOBAL;
  const taskId = String(input.taskId || "");
  const taskTitle = String(input.taskTitle || "");
  if (!Number.isFinite(untilTs) || untilTs <= 0 || mode === BREAK_SESSION_NONE) {
    return {
      mode: BREAK_SESSION_NONE,
      untilTs: 0,
      scope: BREAK_SESSION_SCOPE_GLOBAL,
      taskId: "",
      taskTitle: "",
    };
  }
  const safeScope = scope === BREAK_SESSION_SCOPE_TASK && taskId
    ? BREAK_SESSION_SCOPE_TASK
    : BREAK_SESSION_SCOPE_GLOBAL;
  return {
    mode,
    untilTs: Math.round(untilTs),
    scope: safeScope,
    taskId: safeScope === BREAK_SESSION_SCOPE_TASK ? taskId : "",
    taskTitle: safeScope === BREAK_SESSION_SCOPE_TASK ? taskTitle : "",
  };
}

/**
 * @param {string} mode
 * @param {number} [nowTs]
 * @param {{ scope?: string; taskId?: string; taskTitle?: string }} [binding]
 */
export function createBreakSession(mode, nowTs = Date.now(), binding = {}) {
  const now = Math.max(0, Math.round(Number(nowTs || Date.now())));
  const scope = BREAK_SESSION_SCOPE_OPTIONS.includes(String(binding.scope))
    ? String(binding.scope)
    : BREAK_SESSION_SCOPE_GLOBAL;
  const taskId = String(binding.taskId || "");
  const taskTitle = String(binding.taskTitle || "");
  const safeScope = scope === BREAK_SESSION_SCOPE_TASK && taskId
    ? BREAK_SESSION_SCOPE_TASK
    : BREAK_SESSION_SCOPE_GLOBAL;
  const attach = (/** @type {string} */ safeMode, /** @type {number} */ untilTs) => normalizeBreakSession({
    mode: safeMode,
    untilTs,
    scope: safeScope,
    taskId,
    taskTitle,
  });
  if (mode === BREAK_SESSION_30M) {
    return attach(mode, now + 30 * 60 * 1000);
  }
  if (mode === BREAK_SESSION_1H) {
    return attach(mode, now + 60 * 60 * 1000);
  }
  if (mode === BREAK_SESSION_2H) {
    return attach(mode, now + 2 * 60 * 60 * 1000);
  }
  if (mode === BREAK_SESSION_TODAY) {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return attach(mode, d.getTime());
  }
  return {
    mode: BREAK_SESSION_NONE,
    untilTs: 0,
    scope: BREAK_SESSION_SCOPE_GLOBAL,
    taskId: "",
    taskTitle: "",
  };
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
 * @param {{ mode: string; untilTs: number; scope?: string; taskId?: string } | null | undefined} session
 * @param {string | null | undefined} selectedTaskId
 * @param {number} [nowTs]
 */
export function shouldSuppressBreakPromptBySession(session, selectedTaskId, nowTs = Date.now()) {
  if (!isBreakSessionActive(session, nowTs)) return false;
  const scope = String(session?.scope || BREAK_SESSION_SCOPE_GLOBAL);
  if (scope !== BREAK_SESSION_SCOPE_TASK) return true;
  return String(session?.taskId || "") !== String(selectedTaskId || "");
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
