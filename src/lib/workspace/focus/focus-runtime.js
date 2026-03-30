import {
  ensureDayStats,
  FOCUS_TASK_MODE_TIME_WINDOW,
  getDateKey,
  getTaskTargetSeconds,
  normalizeFocusTask,
  timeToMinutes,
} from "$lib/workspace/focus/focus-model.js";
import { normalizeBreakReminderMode } from "$lib/workspace/focus/focus-break-reminder-mode.js";

export const PHASE_FOCUS = "focus";
export const PHASE_SHORT_BREAK = "shortBreak";
export const PHASE_LONG_BREAK = "longBreak";
export const FOCUS_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
export const BREAK_KIND_MINI = "mini";
export const BREAK_KIND_LONG = "long";

/**
 * @param {number} effectiveSeconds
 * @param {number} targetSeconds
 */
export function isTaskEffectiveTargetMet(effectiveSeconds, targetSeconds) {
  return Math.max(0, Math.floor(Number(effectiveSeconds || 0))) >= Math.max(1, Math.floor(Number(targetSeconds || 0)));
}

/**
 * @param {unknown} config
 * @param {(v: unknown, fallback: number, min: number, max: number) => number} clamp
 */
export function getSafeConfig(config, clamp) {
  const raw = /** @type {any} */ (config || {});
  return {
    breakReminderEnabled: raw.breakReminderEnabled !== false,
    focusMinutes: clamp(raw.focusMinutes, 25, 5, 90),
    shortBreakMinutes: clamp(raw.shortBreakMinutes, 5, 1, 30),
    longBreakMinutes: clamp(raw.longBreakMinutes, 15, 5, 60),
    longBreakEvery: clamp(raw.longBreakEvery, 4, 2, 8),
    miniBreakEveryMinutes: clamp(raw.miniBreakEveryMinutes, 10, 1, 60),
    miniBreakDurationSeconds: clamp(raw.miniBreakDurationSeconds, 20, 10, 300),
    longBreakEveryMinutes: clamp(raw.longBreakEveryMinutes, 30, 1, 180),
    longBreakDurationMinutes: clamp(raw.longBreakDurationMinutes, 5, 1, 30),
    breakNotifyBeforeSeconds: clamp(raw.breakNotifyBeforeSeconds, 10, 0, 120),
    taskStartReminderEnabled: raw.taskStartReminderEnabled === true,
    taskStartReminderLeadMinutes: clamp(raw.taskStartReminderLeadMinutes, 10, 1, 60),
    miniBreakPostponeMinutes: clamp(raw.miniBreakPostponeMinutes, 5, 1, 30),
    longBreakPostponeMinutes: clamp(raw.longBreakPostponeMinutes, 10, 1, 60),
    breakPostponeLimit: clamp(raw.breakPostponeLimit, 3, 0, 10),
    breakStrictMode: raw.breakStrictMode === true,
    breakReminderMode: normalizeBreakReminderMode(raw.breakReminderMode),
    independentMiniBreakEveryMinutes: clamp(
      raw.independentMiniBreakEveryMinutes,
      clamp(raw.miniBreakEveryMinutes, 10, 1, 180),
      1,
      180,
    ),
    independentLongBreakEveryMinutes: clamp(
      raw.independentLongBreakEveryMinutes,
      clamp(raw.longBreakEveryMinutes, 30, 1, 360),
      1,
      360,
    ),
  };
}

/**
 * @param {{
 * miniBreakEveryMinutes:number;
 * miniBreakDurationSeconds:number;
 * longBreakEveryMinutes:number;
 * longBreakDurationMinutes:number;
 * breakNotifyBeforeSeconds:number;
 * }} config
 */
export function getBreakPlanSec(config) {
  return {
    miniEverySec: Math.max(10, Number(config.miniBreakEveryMinutes || 10) * 60),
    miniDurationSec: Math.max(10, Number(config.miniBreakDurationSeconds || 20)),
    longEverySec: Math.max(10, Number(config.longBreakEveryMinutes || 30) * 60),
    longDurationSec: Math.max(60, Number(config.longBreakDurationMinutes || 5) * 60),
    notifyBeforeSec: Math.max(0, Number(config.breakNotifyBeforeSeconds || 10)),
  };
}

/**
 * @param {string} phase
 * @param {{focusMinutes:number;shortBreakMinutes:number;longBreakMinutes:number}} config
 */
export function getPhaseDurationSec(phase, config) {
  if (phase === PHASE_SHORT_BREAK) return config.shortBreakMinutes * 60;
  if (phase === PHASE_LONG_BREAK) return config.longBreakMinutes * 60;
  return config.focusMinutes * 60;
}

/**
 * @param {string} phase
 * @param {number} completedFocusCount
 * @param {number} longBreakEvery
 */
export function nextPhaseState(phase, completedFocusCount, longBreakEvery) {
  if (phase === PHASE_FOCUS) {
    const nextCount = completedFocusCount + 1;
    return {
      phase: nextCount % longBreakEvery === 0 ? PHASE_LONG_BREAK : PHASE_SHORT_BREAK,
      completedFocusCount: nextCount,
    };
  }
  return {
    phase: PHASE_FOCUS,
    completedFocusCount,
  };
}

/**
 * @param {string} phase
 * @param {any} strings
 */
export function phaseLabel(phase, strings) {
  const safeStrings = strings && typeof strings === "object" ? strings : {};
  if (phase === PHASE_SHORT_BREAK) return safeStrings.pomodoroShortBreak || "Short break";
  if (phase === PHASE_LONG_BREAK) return safeStrings.pomodoroLongBreak || "Long break";
  return safeStrings.pomodoroFocus || "Focus";
}

/**
 * @param {any[]} tasks
 * @param {Record<string, any>} stats
 * @param {string} taskId
 */
export function removeTaskFromState(tasks, stats, taskId) {
  const nextTasks = tasks.filter((task) => task.id !== taskId);
  /** @type {Record<string, any>} */
  const nextStats = {};
  for (const [key] of Object.entries(/** @type {Record<string, any>} */ (stats))) {
    const day = ensureDayStats(stats, key);
    nextStats[key] = {
      ...day,
      completedTaskIds: day.completedTaskIds.filter((/** @type {string} */ id) => id !== taskId),
      taskPomodoros: Object.fromEntries(
        Object.entries(day.taskPomodoros).filter(([id]) => id !== taskId),
      ),
      taskEffectiveSeconds: Object.fromEntries(
        Object.entries(day.taskEffectiveSeconds || {}).filter(([id]) => id !== taskId),
      ),
      taskTitles: Object.fromEntries(
        Object.entries(day.taskTitles || {}).filter(([id]) => id !== taskId),
      ),
    };
  }
  return { nextTasks, nextStats };
}

/**
 * @param {any[]} tasks
 * @param {string} taskId
 * @param {{
 * title?: string;
 * taskMode?: "duration" | "timeWindow";
 * targetSeconds?: number;
 * startTime?: string;
 * endTime?: string;
 * recurrence?: string;
 * weekdays?: number[];
 * }} patch
 */
export function updateTaskInState(tasks, taskId, patch) {
  const safeTaskId = String(taskId || "");
  if (!safeTaskId) return tasks;
  return tasks.map((task) => {
    if (String(task.id || "") !== safeTaskId) return task;
    const nextRecurrence = patch?.recurrence ?? task.recurrence;
    const nextWeekdays = nextRecurrence === "custom"
      ? (patch?.weekdays ?? task.weekdays)
      : [];
    return normalizeFocusTask({
      ...task,
      ...patch,
      recurrence: nextRecurrence,
      weekdays: nextWeekdays,
    });
  });
}

/**
 * @param {Record<string, any>} stats
 * @param {string} selectedTaskId
 * @param {string} selectedTaskTitle
 * @param {number} startTs
 * @param {number} endTs
 */
export function applyFocusElapsedRange(stats, selectedTaskId, selectedTaskTitle, startTs, endTs) {
  const safeStart = Math.max(0, Math.floor(Number(startTs || 0)));
  const safeEnd = Math.max(0, Math.floor(Number(endTs || 0)));
  if (safeEnd <= safeStart) return stats;
  /** @type {Record<string, any>} */
  let nextStats = { ...(stats && typeof stats === "object" ? stats : {}) };
  let cursor = safeStart;
  while (cursor < safeEnd) {
    const cursorDate = new Date(cursor);
    const dayStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate());
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(dayStart.getDate() + 1);
    const sliceEnd = Math.min(safeEnd, nextDayStart.getTime());
    const elapsedSec = Math.max(0, Math.floor((sliceEnd - cursor) / 1000));
    if (elapsedSec > 0) {
      const dateKey = getDateKey(cursorDate);
      const day = ensureDayStats(nextStats, dateKey);
      const taskEffectiveSeconds = { ...(day.taskEffectiveSeconds || {}) };
      const taskTitles = { ...(day.taskTitles || {}) };
      if (selectedTaskId) {
        taskEffectiveSeconds[selectedTaskId] = Number(taskEffectiveSeconds[selectedTaskId] || 0) + elapsedSec;
        taskTitles[selectedTaskId] = String(selectedTaskTitle || taskTitles[selectedTaskId] || "Untitled");
      }
      nextStats = {
        ...nextStats,
        [dateKey]: {
          ...day,
          focusSeconds: Number(day.focusSeconds || 0) + elapsedSec,
          taskEffectiveSeconds,
          taskTitles,
        },
      };
    }
    cursor = sliceEnd;
  }
  return nextStats;
}

/**
 * @param {Record<string, any>} stats
 * @param {string} todayKey
 * @param {string} selectedTaskId
 * @param {string} selectedTaskTitle
 */
export function applyFocusCompleted(stats, todayKey, selectedTaskId, selectedTaskTitle) {
  const day = ensureDayStats(stats, todayKey);
  const taskPomodoros = { ...day.taskPomodoros };
  const taskTitles = { ...(day.taskTitles || {}) };
  if (selectedTaskId) {
    taskPomodoros[selectedTaskId] = Number(taskPomodoros[selectedTaskId] || 0) + 1;
    taskTitles[selectedTaskId] = String(selectedTaskTitle || taskTitles[selectedTaskId] || "Untitled");
  }
  return {
    ...stats,
    [todayKey]: {
      ...day,
      pomodoros: Number(day.pomodoros || 0) + 1,
      taskPomodoros,
      taskTitles,
    },
  };
}

/**
 * @param {{
 * id?: string;
 * title: string;
 * taskMode?: "duration" | "timeWindow";
 * targetSeconds?: number;
 * startTime: string;
 * endTime: string;
 * recurrence: string;
 * weekdays: number[];
 * }} draft
 */
export function buildFocusTaskFromDraft(draft) {
  return normalizeFocusTask({
    id: draft.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title,
    taskMode: draft.taskMode || "timeWindow",
    targetSeconds: draft.targetSeconds,
    startTime: draft.startTime,
    endTime: draft.endTime,
    recurrence: draft.recurrence,
    weekdays: draft.weekdays,
    enabled: true,
    createdAt: new Date().toISOString(),
  });
}

/**
 * @param {any[]} todayTasks
 * @param {any} todayStats
 */
export function buildTodaySummary(todayTasks, todayStats) {
  const donePomodoros = todayTasks.reduce(
    (sum, task) => sum + Number(todayStats.taskPomodoros?.[task.id] || 0),
    0,
  );
  const normalizedTasks = todayTasks.map((task) => {
    const targetSeconds = getTaskTargetSeconds(task);
    const effectiveSeconds = Number(todayStats.taskEffectiveSeconds?.[task.id] || 0);
    return {
      ...task,
      targetSeconds,
      effectiveSeconds,
      completed: isTaskEffectiveTargetMet(effectiveSeconds, targetSeconds),
    };
  });
  const taskDistribution = normalizedTasks
    .filter((task) => String(task.taskMode || FOCUS_TASK_MODE_TIME_WINDOW) === FOCUS_TASK_MODE_TIME_WINDOW)
    .map((task) => ({
      id: task.id,
      title: task.title,
      startTime: task.startTime,
      endTime: task.endTime,
      startMinutes: timeToMinutes(task.startTime || "00:00"),
      endMinutes: timeToMinutes(task.endTime || "23:59"),
      targetSeconds: task.targetSeconds,
      effectiveSeconds: task.effectiveSeconds,
      completed: task.completed,
      progressPercent: Math.max(0, Math.min(100, Math.round((task.effectiveSeconds / Math.max(task.targetSeconds, 1)) * 100))),
      pomodoros: Number(todayStats.taskPomodoros?.[task.id] || 0),
    }))
    .sort((a, b) => a.startMinutes - b.startMinutes);
  return {
    taskCount: todayTasks.length,
    completedCount: normalizedTasks.filter((task) => task.completed).length,
    donePomodoros,
    taskDistribution,
  };
}

/** @param {any[]} todayTasks */
export function buildTimerTaskOptions(todayTasks) {
  return todayTasks.map((task) => ({
    id: task.id,
    title: task.title,
    timeRange: `${task.startTime}-${task.endTime}`,
  }));
}
