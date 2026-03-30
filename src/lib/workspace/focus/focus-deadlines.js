import { ensureDayStats, getDateKey, getTaskTargetSeconds, getTodayTasks, timeToMinutes } from "$lib/workspace/focus/focus-model.js";
import { getTaskCycleSnapshot } from "$lib/workspace/focus/focus-pomodoro-metrics.js";

/**
 * @param {any[]} tasks
 * @param {Record<string, any>} stats
 * @param {Date} [now]
 * @param {number} [limit]
 */
export function getFocusDeadlinesForToday(tasks, stats, now = new Date(), limit = 5) {
  const todayTasks = getTodayTasks(tasks, now);
  const day = ensureDayStats(stats || {}, getDateKey(now));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return todayTasks
    .map((task) => {
      const startMinutes = timeToMinutes(task.startTime || "00:00");
      const endMinutes = timeToMinutes(task.endTime || "23:59");
      const minutesUntilStart = startMinutes - nowMinutes;
      const minutesLeft = endMinutes - nowMinutes;
      const started = nowMinutes >= startMinutes;
      const targetSeconds = getTaskTargetSeconds(task);
      const effectiveSeconds = Number(day.taskEffectiveSeconds?.[task.id] || 0);
      const cycleSnapshot = getTaskCycleSnapshot(effectiveSeconds, targetSeconds);
      return {
        id: task.id,
        title: task.title,
        taskMode: String(task.taskMode || "timeWindow"),
        startTime: task.startTime,
        endTime: task.endTime,
        started,
        taskCycles: cycleSnapshot.completedCycles,
        currentCycleSeconds: cycleSnapshot.currentCycleSeconds,
        isOverdue: minutesLeft < 0,
        minutesUntilStart,
        minutesLeft,
        startMinutes,
        targetSeconds,
        effectiveSeconds,
        progressPercent: cycleSnapshot.currentCycleProgressPercent,
        donePomodoros: Number(day.taskPomodoros?.[task.id] || 0),
      };
    })
    .sort((a, b) => {
      // Overdue first, then running, then upcoming.
      /** @param {{ isOverdue: boolean; started: boolean }} item */
      const rank = (item) => (item.isOverdue ? 0 : item.started ? 1 : 2);
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;

      // Same rank ordering by urgency.
      if (a.isOverdue && b.isOverdue) {
        // More overdue first.
        return a.minutesLeft - b.minutesLeft;
      }
      if (a.started && b.started) {
        // Less time left first.
        return a.minutesLeft - b.minutesLeft;
      }
      // Upcoming: starts sooner first.
      return a.minutesUntilStart - b.minutesUntilStart;
    })
    .slice(0, Math.max(1, Math.floor(limit)));
}
