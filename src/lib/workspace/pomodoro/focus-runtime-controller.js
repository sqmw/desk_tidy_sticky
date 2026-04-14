import { PHASE_FOCUS } from "$lib/workspace/pomodoro/focus-runtime.js";

/**
 * @param {number} deadlineTs
 * @param {number} [nowTs]
 */
export function getRemainingFromDeadline(deadlineTs, nowTs = Date.now()) {
  if (!Number.isFinite(deadlineTs) || deadlineTs <= 0) return 0;
  return Math.max(0, Math.ceil((deadlineTs - nowTs) / 1000));
}

/**
 * @param {{
 *   cached: Record<string, any> | null;
 *   nowTs: number;
 *   focusDurationSec: number;
 *   fallbackSelectedTaskId: string;
 * }} input
 */
export function buildRestoredTimerRuntime(input) {
  if (!input.cached) return null;
  const cachedAgeSec = Math.max(0, Math.floor((input.nowTs - Number(input.cached.savedAt || 0)) / 1000));
  const restored = input.cached.phase !== PHASE_FOCUS
    ? {
        ...input.cached,
        phase: PHASE_FOCUS,
        remainingSec: input.focusDurationSec,
        focusTotalSec: input.focusDurationSec,
        focusDeadlineTs: 0,
        running: false,
        hasStarted: false,
        activeBreakKind: "",
        breakRemainingSec: 0,
        breakDeadlineTs: 0,
        skipUnlockedAfterPostpone: false,
      }
    : input.cached;
  const restoredFocusRemaining = restored.running
    ? (
        restored.focusDeadlineTs > 0
          ? getRemainingFromDeadline(restored.focusDeadlineTs, input.nowTs)
          : Math.max(0, Math.floor(Number(restored.remainingSec || 0)) - cachedAgeSec)
      )
    : Math.max(0, Math.floor(Number(restored.remainingSec || 0)));
  const restoredFocusTotalSec = Math.max(
    restoredFocusRemaining,
    Math.max(1, Math.floor(Number(restored.focusTotalSec || input.focusDurationSec || 0))),
  );
  const restoredBreakRemaining = restored.activeBreakKind
    ? (
        restored.breakDeadlineTs > 0
          ? getRemainingFromDeadline(restored.breakDeadlineTs, input.nowTs)
          : Math.max(0, Math.floor(Number(restored.breakRemainingSec || 0)) - cachedAgeSec)
      )
    : Math.max(0, Math.floor(Number(restored.breakRemainingSec || 0)));
  const taskTimingActive = Boolean(
    restored.selectedTaskId &&
    restored.taskSessionStartedAtTs > 0 &&
    (restored.taskTimingActive || (restored.running && restoredFocusRemaining > 0)),
  );
  return {
    phase: restored.phase,
    remainingSec: restoredFocusRemaining,
    focusTotalSec: restoredFocusTotalSec,
    focusDeadlineTs: restored.running && restoredFocusRemaining > 0
      ? (
          restored.focusDeadlineTs > 0
            ? restored.focusDeadlineTs
            : input.nowTs + restoredFocusRemaining * 1000
        )
      : 0,
    running: restored.running && restoredFocusRemaining > 0,
    hasStarted: Boolean(restored.selectedTaskId) && (restored.hasStarted || taskTimingActive),
    taskTimingActive,
    completedFocusCount: restored.completedFocusCount,
    focusSinceBreakSec: Math.max(
      0,
      Math.floor(Number(restored.focusSinceBreakSec || 0)) + (restored.activeBreakKind ? 0 : cachedAgeSec),
    ),
    nextMiniBreakAtSec: restored.nextMiniBreakAtSec,
    nextLongBreakAtSec: restored.nextLongBreakAtSec,
    nextMiniWarnAtSec: restored.nextMiniWarnAtSec,
    nextLongWarnAtSec: restored.nextLongWarnAtSec,
    lastBreakReminderAtSec: restored.lastBreakReminderAtSec,
    activeBreakKind: restoredBreakRemaining > 0 ? restored.activeBreakKind : "",
    breakRemainingSec: restoredBreakRemaining,
    breakDeadlineTs: restoredBreakRemaining > 0
      ? (
          restored.breakDeadlineTs > 0
            ? restored.breakDeadlineTs
            : input.nowTs + restoredBreakRemaining * 1000
        )
      : 0,
    skipUnlockedAfterPostpone: restored.skipUnlockedAfterPostpone,
    selectedTaskId: String(restored.selectedTaskId || input.fallbackSelectedTaskId || ""),
    taskSessionStartedAtTs: taskTimingActive
      ? Math.max(0, Math.floor(Number(restored.taskSessionStartedAtTs || 0)))
      : 0,
  };
}

/**
 * @param {Record<string, any>} runtime
 */
export function shouldClearTimerRuntimeCache(runtime) {
  return !runtime.hasStarted && !runtime.running && !runtime.taskTimingActive && !runtime.breakTimerActive;
}

/**
 * @param {Record<string, any>} runtime
 */
export function buildTimerRuntimeCacheSnapshot(runtime) {
  return {
    phase: runtime.phase,
    selectedTaskId: runtime.selectedTaskId,
    remainingSec: runtime.remainingSec,
    focusTotalSec: runtime.focusTotalSec,
    focusDeadlineTs: runtime.focusDeadlineTs,
    running: runtime.running,
    hasStarted: runtime.hasStarted,
    taskTimingActive: runtime.taskTimingActive,
    taskSessionStartedAtTs: runtime.taskSessionStartedAtTs,
    completedFocusCount: runtime.completedFocusCount,
    focusSinceBreakSec: runtime.focusSinceBreakSec,
    nextMiniBreakAtSec: runtime.nextMiniBreakAtSec,
    nextLongBreakAtSec: runtime.nextLongBreakAtSec,
    nextMiniWarnAtSec: runtime.nextMiniWarnAtSec,
    nextLongWarnAtSec: runtime.nextLongWarnAtSec,
    lastBreakReminderAtSec: runtime.lastBreakReminderAtSec,
    activeBreakKind: runtime.activeBreakKind,
    breakRemainingSec: runtime.breakRemainingSec,
    breakDeadlineTs: runtime.breakDeadlineTs,
    skipUnlockedAfterPostpone: runtime.skipUnlockedAfterPostpone,
    savedAt: Date.now(),
  };
}
