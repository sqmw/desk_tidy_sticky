import { getDateKey } from "$lib/workspace/pomodoro/focus-model.js";
import { applyFocusCompleted, applyFocusElapsedRange } from "$lib/workspace/pomodoro/focus-runtime.js";

/**
 * @param {{
 *   baseStats: Record<string, any>;
 *   settleUntilTs: number;
 *   taskId: string;
 *   sessionStartedAt: number;
 *   allTasksById: Map<string, any>;
 * }} input
 */
export function buildStatsWithTaskSession(input) {
  const safeStart = Math.max(0, Math.floor(Number(input.sessionStartedAt || 0)));
  const safeEnd = Math.max(0, Math.floor(Number(input.settleUntilTs || 0)));
  if (!safeStart || safeEnd <= safeStart) return input.baseStats;
  const taskTitle = input.taskId ? String(input.allTasksById.get(String(input.taskId || ""))?.title || "") : "";
  return applyFocusElapsedRange(input.baseStats, input.taskId, taskTitle, safeStart, safeEnd);
}

/**
 * @param {{
 *   selectedTaskId: string;
 *   taskSessionStartedAtTs: number;
 *   settleTs: number;
 *   nowTs: number;
 * }} input
 */
export function getCurrentTaskLiveTodaySeconds(input) {
  if (!input.selectedTaskId || !input.taskSessionStartedAtTs) return 0;
  if (!input.settleTs || input.settleTs <= input.taskSessionStartedAtTs) return 0;
  const nowDate = new Date(input.nowTs);
  const todayStartTs = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();
  const effectiveStartTs = Math.max(todayStartTs, input.taskSessionStartedAtTs);
  if (input.settleTs <= effectiveStartTs) return 0;
  return Math.max(0, Math.floor((input.settleTs - effectiveStartTs) / 1000));
}

/**
 * @param {{
 *   stats: Record<string, any>;
 *   settleUntilTs: number;
 *   selectedTaskId: string;
 *   selectedTaskTitle: string;
 *   allTasksById: Map<string, any>;
 *   taskSessionStartedAtTs: number;
 * }} input
 */
export function buildFocusCompletedStats(input) {
  const nextStats = buildStatsWithTaskSession({
    baseStats: input.stats,
    settleUntilTs: input.settleUntilTs,
    taskId: input.selectedTaskId,
    sessionStartedAt: input.taskSessionStartedAtTs,
    allTasksById: input.allTasksById,
  });
  return applyFocusCompleted(
    nextStats,
    getDateKey(new Date(input.settleUntilTs)),
    input.selectedTaskId,
    input.selectedTaskTitle,
  );
}

/**
 * @param {number[]} draftWeekdays
 * @param {number} day
 */
export function toggleDraftWeekdayValue(draftWeekdays, day) {
  const safeWeekdays = Array.isArray(draftWeekdays) ? draftWeekdays : [];
  if (safeWeekdays.includes(day)) {
    return safeWeekdays.filter((weekday) => weekday !== day);
  }
  return [...safeWeekdays, day].sort((left, right) => left - right);
}

/**
 * @param {{
 *   task: { title?: string; startTime?: string };
 *   leadMinutes: number;
 *   strings: Record<string, any>;
 * }} input
 */
export function buildTaskStartNotification(input) {
  const title = input.strings.pomodoroTaskStartSoon || "Task starts soon";
  const taskTitle = String(input.task?.title || input.strings.pomodoroNoTaskSelected || "Not selected");
  const startTime = String(input.task?.startTime || "00:00");
  const body = `${taskTitle} · ${input.strings.pomodoroTaskStartAt || "Starts at"} ${startTime} · ${
    input.strings.pomodoroTaskStartLead || "In"
  } ${input.leadMinutes}m`;
  return { title, body };
}
