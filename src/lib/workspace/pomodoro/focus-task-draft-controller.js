import {
  FOCUS_TASK_MODE_DURATION,
  FOCUS_TASK_MODE_TIME_WINDOW,
  RECURRENCE,
  clampInt,
} from "$lib/workspace/pomodoro/focus-model.js";
import {
  buildFocusTaskFromDraft,
  PHASE_FOCUS,
  removeTaskFromState,
  updateTaskInState,
} from "$lib/workspace/pomodoro/focus-runtime.js";
import { toggleDraftWeekdayValue } from "$lib/workspace/pomodoro/focus-task-controller.js";

/**
 * @param {{
 *   getTasks: () => any[];
 *   getStats: () => Record<string, any>;
 *   getSelectedTaskId: () => string;
 *   getTaskTimingActive: () => boolean;
 *   getRunning: () => boolean;
 *   getHasStarted: () => boolean;
 *   getTaskSessionStartedAtTs: () => number;
 *   getCurrentSessionSettleTs: () => number;
 *   getFocusDurationSec: (config?: any) => number;
 *   getDraftTitle: () => string;
 *   getDraftTaskMode: () => string;
 *   getDraftTargetMinutes: () => number;
 *   getDraftStartTime: () => string;
 *   getDraftEndTime: () => string;
 *   getDraftRecurrence: () => string;
 *   getDraftWeekdays: () => number[];
 *   getDraftTaskStartReminderEnabled: () => boolean;
 *   getDraftTaskStartReminderLeadMinutes: () => number;
 *   getDefaultTaskStartReminderLeadMinutes: () => number;
 *   setFocusRuntime: (patch: Record<string, any>) => void;
 *   setDraftState: (patch: Record<string, any>) => void;
 *   pauseActiveTaskSession: (
 *     settleUntilTs?: number,
 *     options?: { keepStarted?: boolean; clearSelection?: boolean; pauseFocusTimer?: boolean },
 *   ) => any;
 *   emitTasks: (tasks: any[]) => void;
 *   emitStats: (stats: Record<string, any>) => void;
 *   ensureNotificationPermissionFromUserGesture: () => any;
 * }} input
 */
export function createFocusTaskDraftController(input) {
  /** @param {string} taskId */
  function startTaskFocus(taskId) {
    if (input.getTaskTimingActive() || input.getRunning() || input.getTaskSessionStartedAtTs() > 0) {
      input.pauseActiveTaskSession(input.getCurrentSessionSettleTs(), {
        keepStarted: false,
        pauseFocusTimer: true,
      });
    }
    const remainingSec = input.getFocusDurationSec();
    input.setFocusRuntime({
      selectedTaskId: taskId,
      phase: PHASE_FOCUS,
      remainingSec,
      focusDeadlineTs: Date.now() + remainingSec * 1000,
      running: true,
      hasStarted: true,
      taskTimingActive: true,
      taskSessionStartedAtTs: Date.now(),
    });
  }

  /** @param {string} taskId */
  function selectTask(taskId) {
    const nextTaskId = taskId || "";
    if (input.getSelectedTaskId() === nextTaskId) return;
    if (input.getTaskTimingActive() || input.getRunning() || input.getTaskSessionStartedAtTs() > 0) {
      input.pauseActiveTaskSession(input.getCurrentSessionSettleTs(), {
        keepStarted: false,
        pauseFocusTimer: true,
      });
    }
    input.setFocusRuntime({ selectedTaskId: nextTaskId });
  }

  /** @param {string} taskId */
  function removeTask(taskId) {
    const selectedTaskId = input.getSelectedTaskId();
    const statsBeforeRemove = selectedTaskId === taskId
      ? input.pauseActiveTaskSession(input.getCurrentSessionSettleTs(), {
          keepStarted: false,
          clearSelection: true,
          pauseFocusTimer: true,
        })
      : input.getStats();
    if (selectedTaskId === taskId) {
      input.setFocusRuntime({
        selectedTaskId: "",
        taskTimingActive: false,
        hasStarted: false,
        taskSessionStartedAtTs: 0,
      });
    }
    const { nextTasks, nextStats } = removeTaskFromState(input.getTasks(), statsBeforeRemove, taskId);
    input.emitTasks(nextTasks);
    input.emitStats(nextStats);
  }

  /**
   * @param {string} taskId
   * @param {{
   *   title?: string;
   *   startTime?: string;
   *   endTime?: string;
   *   recurrence?: string;
   *   weekdays?: number[];
   *   taskStartReminderEnabled?: boolean;
   *   taskStartReminderLeadMinutes?: number;
   * }} patch
   */
  function updateTask(taskId, patch) {
    if (patch?.taskStartReminderEnabled === true) {
      Promise.resolve(input.ensureNotificationPermissionFromUserGesture()).catch((error) =>
        console.error("focus request notification permission for task reminder", error),
      );
    }
    input.emitTasks(updateTaskInState(input.getTasks(), taskId, patch));
  }

  function addTask() {
    const title = input.getDraftTitle().trim();
    if (!title) return;
    const taskStartReminderEnabled = input.getDraftTaskStartReminderEnabled() === true;
    if (taskStartReminderEnabled) {
      Promise.resolve(input.ensureNotificationPermissionFromUserGesture()).catch((error) =>
        console.error("focus request notification permission for new task reminder", error),
      );
    }
    const safeTaskMode = input.getDraftTaskMode() === FOCUS_TASK_MODE_DURATION
      ? FOCUS_TASK_MODE_DURATION
      : FOCUS_TASK_MODE_TIME_WINDOW;
    const next = buildFocusTaskFromDraft({
      title,
      taskMode: safeTaskMode,
      targetSeconds: clampInt(input.getDraftTargetMinutes(), 120, 1, 24 * 60) * 60,
      startTime: input.getDraftStartTime(),
      endTime: input.getDraftEndTime(),
      recurrence: input.getDraftRecurrence(),
      weekdays: input.getDraftRecurrence() === RECURRENCE.CUSTOM ? input.getDraftWeekdays() : [],
      taskStartReminderEnabled,
      taskStartReminderLeadMinutes: clampInt(
        input.getDraftTaskStartReminderLeadMinutes(),
        clampInt(input.getDefaultTaskStartReminderLeadMinutes(), 10, 1, 60),
        1,
        60,
      ),
    });
    input.emitTasks([...input.getTasks(), next]);
    input.setDraftState({
      draftTitle: "",
      draftTaskMode: FOCUS_TASK_MODE_TIME_WINDOW,
      draftTargetMinutes: 120,
      draftTaskStartReminderEnabled: false,
      draftTaskStartReminderLeadMinutes: clampInt(input.getDefaultTaskStartReminderLeadMinutes(), 10, 1, 60),
    });
    if (!input.getSelectedTaskId()) input.setFocusRuntime({ selectedTaskId: next.id });
  }

  /** @param {number} day */
  function toggleDraftWeekday(day) {
    input.setDraftState({
      draftWeekdays: toggleDraftWeekdayValue(input.getDraftWeekdays(), day),
    });
  }

  return {
    addTask,
    removeTask,
    selectTask,
    startTaskFocus,
    toggleDraftWeekday,
    updateTask,
  };
}
