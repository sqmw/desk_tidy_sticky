import {
  ensureDayStats,
  getDateKey,
  getRecentDateKeys,
  getTodayTasks,
} from "$lib/workspace/pomodoro/focus-model.js";
import {
  buildFocusHeatmap,
  getBestFocusDay,
  getFocusStreakDays,
  getWeekFocusAverageMinutes,
} from "$lib/workspace/pomodoro/focus-analytics.js";
import {
  buildTaskTitleRollups,
  getTaskCycleSnapshot,
} from "$lib/workspace/pomodoro/focus-pomodoro-metrics.js";
import { buildTodaySummary } from "$lib/workspace/pomodoro/focus-runtime.js";

/**
 * @param {{
 * tasks?: any[];
 * stats?: Record<string, any>;
 * focusMinutes?: number;
 * now?: Date;
 * }} input
 */
export function buildReviewFocusSnapshot(input = {}) {
  const tasks = Array.isArray(input.tasks) ? input.tasks : [];
  const stats = input.stats && typeof input.stats === "object" ? input.stats : {};
  const now = input.now instanceof Date ? input.now : new Date();
  const focusMinutes = Math.max(1, Number(input.focusMinutes || 25));

  const todayKey = getDateKey(now);
  const weekKeys = getRecentDateKeys(now);
  const todayTasks = getTodayTasks(tasks, now);
  const todayStats = ensureDayStats(stats, todayKey);
  const todaySummary = buildTodaySummary(todayTasks, todayStats);

  const todayFocusMinutes = Math.round(Number(todayStats.focusSeconds || 0) / 60);
  const todayPomodoros = Number(todayStats.pomodoros || 0);
  const weekFocusMinutes = weekKeys.reduce(
    (sum, key) => sum + Math.round(Number(stats[key]?.focusSeconds || 0) / 60),
    0,
  );
  const weekPomodoros = weekKeys.reduce((sum, key) => sum + Number(stats[key]?.pomodoros || 0), 0);
  const weekAverageMinutes = getWeekFocusAverageMinutes(stats, now);
  const streakDays = getFocusStreakDays(stats, now);
  const bestFocusDay = getBestFocusDay(stats, now);
  const heatmapCells = buildFocusHeatmap(stats, now);
  const taskRollups = buildTaskTitleRollups(stats, tasks, focusMinutes);
  const todayTaskDistribution = todaySummary.taskDistribution.map((task) => {
    const effectiveSeconds = Number(todayStats.taskEffectiveSeconds?.[task.id] || task.effectiveSeconds || 0);
    const cycleSnapshot = getTaskCycleSnapshot(effectiveSeconds, Number(task.targetSeconds || 0));
    return {
      ...task,
      effectiveSeconds,
      completedCycles: cycleSnapshot.completedCycles,
      currentCycleSeconds: cycleSnapshot.currentCycleSeconds,
      progressPercent: cycleSnapshot.currentCycleProgressPercent,
    };
  });
  const todayTaskCycles = todayTasks.reduce((sum, task) => {
    const effectiveSeconds = Number(todayStats.taskEffectiveSeconds?.[task.id] || 0);
    return sum + getTaskCycleSnapshot(effectiveSeconds, Number(task.targetSeconds || 0)).completedCycles;
  }, 0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return {
    todayKey,
    todayFocusMinutes,
    todayPomodoros,
    todayTaskCount: todayTasks.length,
    todayTaskCycles,
    weekFocusMinutes,
    weekPomodoros,
    weekAverageMinutes,
    streakDays,
    bestDayDateKey: bestFocusDay.dateKey,
    bestDayMinutes: bestFocusDay.minutes,
    heatmapCells,
    taskDistribution: todayTaskDistribution,
    taskRollups,
    currentMinutes,
  };
}
