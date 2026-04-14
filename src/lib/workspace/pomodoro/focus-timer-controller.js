import { PHASE_FOCUS } from "$lib/workspace/pomodoro/focus-runtime.js";
import {
  clearFocusTimerRuntimeCache,
  loadFocusTimerRuntimeCache,
  saveFocusTimerRuntimeCache,
} from "$lib/workspace/pomodoro/focus-timer-runtime-cache.js";
import {
  buildRestoredTimerRuntime,
  buildTimerRuntimeCacheSnapshot,
  shouldClearTimerRuntimeCache,
} from "$lib/workspace/pomodoro/focus-runtime-controller.js";

/**
 * @param {{
 *   getFocusDurationSec: (config?: any) => number;
 *   getSafeConfig: () => any;
 *   getPhase: () => string;
 *   getSelectedTaskId: () => string;
 *   getRemainingSec: () => number;
 *   getFocusDeadlineTs: () => number;
 *   getRunning: () => boolean;
 *   getHasStarted: () => boolean;
 *   getTaskTimingActive: () => boolean;
 *   getTaskSessionStartedAtTs: () => number;
 *   getCompletedFocusCount: () => number;
 *   getFocusSinceBreakSec: () => number;
 *   getNextMiniBreakAtSec: () => number;
 *   getNextLongBreakAtSec: () => number;
 *   getNextMiniWarnAtSec: () => number;
 *   getNextLongWarnAtSec: () => number;
 *   getLastBreakReminderAtSec: () => number;
 *   getActiveBreakKind: () => string;
 *   getBreakRemainingSec: () => number;
 *   getBreakDeadlineTs: () => number;
 *   getSkipUnlockedAfterPostpone: () => boolean;
 *   getBreakTimerActive: () => boolean;
 *   setTimerRuntime: (patch: Record<string, any>) => void;
 *   setDraftFocusMinutes: (minutes: number) => void;
 *   flushCurrentTaskSession: (settleUntilTs?: number) => any;
 *   pauseActiveTaskSession: (
 *     settleUntilTs?: number,
 *     options?: { keepStarted?: boolean; clearSelection?: boolean; pauseFocusTimer?: boolean },
 *   ) => any;
 *   getCurrentSessionSettleTs: () => number;
 *   onPomodoroConfigChange: (config: any) => any;
 *   clampInt: (value: number, fallback: number, min: number, max: number) => number;
 * }} input
 */
export function createFocusTimerController(input) {
  function restoreTimerRuntimeFromCache() {
    const restored = buildRestoredTimerRuntime({
      cached: loadFocusTimerRuntimeCache(),
      nowTs: Date.now(),
      focusDurationSec: input.getFocusDurationSec(),
      fallbackSelectedTaskId: input.getSelectedTaskId(),
    });
    if (!restored) return;
    input.setTimerRuntime(restored);
  }

  function persistTimerRuntimeToCache() {
    const runtime = {
      phase: input.getPhase(),
      selectedTaskId: input.getSelectedTaskId(),
      remainingSec: input.getRemainingSec(),
      focusDeadlineTs: input.getFocusDeadlineTs(),
      running: input.getRunning(),
      hasStarted: input.getHasStarted(),
      taskTimingActive: input.getTaskTimingActive(),
      taskSessionStartedAtTs: input.getTaskSessionStartedAtTs(),
      completedFocusCount: input.getCompletedFocusCount(),
      focusSinceBreakSec: input.getFocusSinceBreakSec(),
      nextMiniBreakAtSec: input.getNextMiniBreakAtSec(),
      nextLongBreakAtSec: input.getNextLongBreakAtSec(),
      nextMiniWarnAtSec: input.getNextMiniWarnAtSec(),
      nextLongWarnAtSec: input.getNextLongWarnAtSec(),
      lastBreakReminderAtSec: input.getLastBreakReminderAtSec(),
      activeBreakKind: input.getActiveBreakKind(),
      breakRemainingSec: input.getBreakRemainingSec(),
      breakDeadlineTs: input.getBreakDeadlineTs(),
      skipUnlockedAfterPostpone: input.getSkipUnlockedAfterPostpone(),
      breakTimerActive: input.getBreakTimerActive(),
    };
    if (shouldClearTimerRuntimeCache(runtime)) {
      clearFocusTimerRuntimeCache();
      return;
    }
    saveFocusTimerRuntimeCache(buildTimerRuntimeCacheSnapshot(runtime));
  }

  function toggleRunning() {
    const currentRemainingSec = input.getRemainingSec();
    const remaining = currentRemainingSec <= 0 ? input.getFocusDurationSec() : currentRemainingSec;
    input.setTimerRuntime({
      remainingSec: remaining,
      phase: PHASE_FOCUS,
    });
    const nextRunning = !input.getRunning();
    if (nextRunning) {
      const patch = {
        focusDeadlineTs: Date.now() + Math.max(0, remaining) * 1000,
        running: true,
        hasStarted: true,
      };
      if (input.getSelectedTaskId() && !input.getTaskSessionStartedAtTs()) {
        Object.assign(patch, {
          taskSessionStartedAtTs: Date.now(),
          taskTimingActive: true,
        });
      }
      input.setTimerRuntime(patch);
      return;
    }
    input.pauseActiveTaskSession(input.getCurrentSessionSettleTs(), {
      keepStarted: Boolean(input.getSelectedTaskId()),
      pauseFocusTimer: true,
    });
  }

  function resetCurrentPhase() {
    input.flushCurrentTaskSession(input.getCurrentSessionSettleTs());
    input.setTimerRuntime({
      phase: PHASE_FOCUS,
      focusDeadlineTs: 0,
      running: false,
      hasStarted: false,
      taskTimingActive: false,
      remainingSec: input.getFocusDurationSec(),
      taskSessionStartedAtTs: 0,
    });
  }

  /** @param {number} minutes */
  function applyFocusPreset(minutes) {
    const safeConfig = input.getSafeConfig();
    const safeMinutes = input.clampInt(minutes, safeConfig.focusMinutes, 5, 90);
    input.setDraftFocusMinutes(safeMinutes);
    const next = {
      ...safeConfig,
      focusMinutes: safeMinutes,
    };
    Promise.resolve(input.onPomodoroConfigChange(next)).catch((e) =>
      console.error("apply focus preset", e),
    );
    if (!input.getRunning() && input.getPhase() === PHASE_FOCUS) {
      input.setTimerRuntime({
        remainingSec: safeMinutes * 60,
        focusDeadlineTs: 0,
      });
    }
  }

  return {
    restoreTimerRuntimeFromCache,
    persistTimerRuntimeToCache,
    toggleRunning,
    resetCurrentPhase,
    applyFocusPreset,
  };
}
