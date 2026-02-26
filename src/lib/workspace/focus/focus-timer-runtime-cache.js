const FOCUS_TIMER_RUNTIME_KEY = "workspace.focus.timer.runtime.v1";

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function safeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 */
function safeBool(value, fallback) {
  if (value === true) return true;
  if (value === false) return false;
  return fallback;
}

/**
 * @param {unknown} raw
 */
function normalizeRuntime(raw) {
  const obj = raw && typeof raw === "object" ? /** @type {any} */ (raw) : {};
  const phase = String(obj.phase || "focus");
  const activeBreakKind = String(obj.activeBreakKind || "");
  return {
    phase,
    remainingSec: Math.max(0, Math.floor(safeNumber(obj.remainingSec, 25 * 60))),
    running: safeBool(obj.running, false),
    hasStarted: safeBool(obj.hasStarted, false),
    completedFocusCount: Math.max(0, Math.floor(safeNumber(obj.completedFocusCount, 0))),
    focusSinceBreakSec: Math.max(0, Math.floor(safeNumber(obj.focusSinceBreakSec, 0))),
    nextMiniBreakAtSec: Math.max(0, Math.floor(safeNumber(obj.nextMiniBreakAtSec, 10 * 60))),
    nextLongBreakAtSec: Math.max(0, Math.floor(safeNumber(obj.nextLongBreakAtSec, 30 * 60))),
    nextMiniWarnAtSec: Math.max(0, Math.floor(safeNumber(obj.nextMiniWarnAtSec, 10 * 60 - 10))),
    nextLongWarnAtSec: Math.max(0, Math.floor(safeNumber(obj.nextLongWarnAtSec, 30 * 60 - 10))),
    lastBreakReminderAtSec: Math.floor(safeNumber(obj.lastBreakReminderAtSec, -1)),
    activeBreakKind: activeBreakKind === "mini" || activeBreakKind === "long" ? activeBreakKind : "",
    skipUnlockedAfterPostpone: safeBool(obj.skipUnlockedAfterPostpone, false),
    savedAt: Math.max(0, Math.floor(safeNumber(obj.savedAt, 0))),
  };
}

/**
 * @returns {ReturnType<typeof normalizeRuntime> | null}
 */
export function loadFocusTimerRuntimeCache() {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    if (!storage) return null;
    let raw = storage.getItem(FOCUS_TIMER_RUNTIME_KEY);
    // One-time compatibility migration from old session storage cache.
    if (!raw && window.sessionStorage) {
      raw = window.sessionStorage.getItem(FOCUS_TIMER_RUNTIME_KEY);
      if (raw) {
        storage.setItem(FOCUS_TIMER_RUNTIME_KEY, raw);
        window.sessionStorage.removeItem(FOCUS_TIMER_RUNTIME_KEY);
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const safe = normalizeRuntime(parsed);
    // Keep cache short-lived to avoid resuming a very stale timer after long idle.
    const ageMs = Date.now() - safe.savedAt;
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 1000 * 60 * 60 * 12) return null;
    return safe;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, any>} runtime
 */
export function saveFocusTimerRuntimeCache(runtime) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(
      FOCUS_TIMER_RUNTIME_KEY,
      JSON.stringify({
        ...normalizeRuntime(runtime),
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Best effort cache; ignore storage errors.
  }
}

export function clearFocusTimerRuntimeCache() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage?.removeItem(FOCUS_TIMER_RUNTIME_KEY);
    window.sessionStorage?.removeItem(FOCUS_TIMER_RUNTIME_KEY);
  } catch {
    // ignore
  }
}
