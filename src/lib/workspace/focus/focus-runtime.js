import { ensureDayStats, normalizeFocusTask } from "$lib/workspace/focus/focus-model.js";

export const PHASE_FOCUS = "focus";
export const PHASE_SHORT_BREAK = "shortBreak";
export const PHASE_LONG_BREAK = "longBreak";
export const FOCUS_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * @param {unknown} config
 * @param {(v: unknown, fallback: number, min: number, max: number) => number} clamp
 */
export function getSafeConfig(config, clamp) {
  const raw = /** @type {any} */ (config || {});
  return {
    focusMinutes: clamp(raw.focusMinutes, 25, 5, 90),
    shortBreakMinutes: clamp(raw.shortBreakMinutes, 5, 1, 30),
    longBreakMinutes: clamp(raw.longBreakMinutes, 15, 5, 60),
    longBreakEvery: clamp(raw.longBreakEvery, 4, 2, 8),
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
 * @param {Record<string, any>} stats
 * @param {string} todayKey
 * @param {string} taskId
 */
export function toggleTaskDoneInStats(stats, todayKey, taskId) {
  const day = ensureDayStats(stats, todayKey);
  const has = day.completedTaskIds.includes(taskId);
  const completedTaskIds = has
    ? day.completedTaskIds.filter((/** @type {string} */ id) => id !== taskId)
    : [...day.completedTaskIds, taskId];
  return {
    ...stats,
    [todayKey]: {
      ...day,
      completedTaskIds,
    },
  };
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
    };
  }
  return { nextTasks, nextStats };
}

/**
 * @param {Record<string, any>} stats
 * @param {string} todayKey
 * @param {string} selectedTaskId
 * @param {number} focusMinutes
 */
export function applyFocusCompleted(stats, todayKey, selectedTaskId, focusMinutes) {
  const day = ensureDayStats(stats, todayKey);
  const taskPomodoros = { ...day.taskPomodoros };
  if (selectedTaskId) {
    taskPomodoros[selectedTaskId] = Number(taskPomodoros[selectedTaskId] || 0) + 1;
  }
  return {
    ...stats,
    [todayKey]: {
      ...day,
      focusSeconds: Number(day.focusSeconds || 0) + focusMinutes * 60,
      pomodoros: Number(day.pomodoros || 0) + 1,
      taskPomodoros,
    },
  };
}

/**
 * @param {{
 * id?: string;
 * title: string;
 * startTime: string;
 * endTime: string;
 * targetPomodoros: number;
 * recurrence: string;
 * weekdays: number[];
 * }} draft
 */
export function buildFocusTaskFromDraft(draft) {
  return normalizeFocusTask({
    id: draft.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title,
    startTime: draft.startTime,
    endTime: draft.endTime,
    targetPomodoros: draft.targetPomodoros,
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
  const completedCount = todayTasks.filter((task) => todayStats.completedTaskIds.includes(task.id)).length;
  const targetPomodoros = todayTasks.reduce((sum, task) => sum + Number(task.targetPomodoros || 1), 0);
  const donePomodoros = todayTasks.reduce(
    (sum, task) => sum + Number(todayStats.taskPomodoros?.[task.id] || 0),
    0,
  );
  const taskDistribution = todayTasks
    .map((task) => ({
      id: task.id,
      title: task.title,
      pomodoros: Number(todayStats.taskPomodoros?.[task.id] || 0),
    }))
    .sort((a, b) => b.pomodoros - a.pomodoros)
    .slice(0, 5);
  return {
    completedCount,
    targetPomodoros,
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
