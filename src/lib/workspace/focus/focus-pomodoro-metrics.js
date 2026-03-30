/**
 * @param {number} effectiveSeconds
 * @param {number} focusMinutes
 */
export function getEquivalentPomodoros(effectiveSeconds, focusMinutes) {
  const safeSeconds = Math.max(0, Number(effectiveSeconds || 0));
  const pomodoroSeconds = Math.max(60, Math.round(Number(focusMinutes || 25) * 60));
  return safeSeconds / pomodoroSeconds;
}

/**
 * @param {number} value
 * @param {number} [digits]
 */
export function formatPomodoroScore(value, digits = 1) {
  const safe = Math.max(0, Number(value || 0));
  if (safe === 0) return "0";
  const fixed = safe.toFixed(Math.max(0, Math.min(2, Math.floor(Number(digits || 1)))));
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

/**
 * @param {number} totalSeconds
 */
export function formatFocusDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * @param {Record<string, any>} stats
 * @param {any[]} tasks
 * @param {number} focusMinutes
 */
export function buildTaskTitleRollups(stats, tasks, focusMinutes) {
  const latestTitleById = Object.fromEntries(
    (Array.isArray(tasks) ? tasks : []).map((task) => [String(task?.id || ""), String(task?.title || "Untitled")]),
  );
  /** @type {Map<string, { title: string; focusSeconds: number; completedPomodoros: number }>} */
  const rollups = new Map();
  for (const day of Object.values(stats && typeof stats === "object" ? stats : {})) {
    const taskEffectiveSeconds = day?.taskEffectiveSeconds && typeof day.taskEffectiveSeconds === "object"
      ? day.taskEffectiveSeconds
      : {};
    const taskPomodoros = day?.taskPomodoros && typeof day.taskPomodoros === "object"
      ? day.taskPomodoros
      : {};
    const taskTitles = day?.taskTitles && typeof day.taskTitles === "object"
      ? day.taskTitles
      : {};
    const taskIds = new Set([
      ...Object.keys(taskEffectiveSeconds),
      ...Object.keys(taskPomodoros),
      ...Object.keys(taskTitles),
    ]);
    for (const taskId of taskIds) {
      const title = String(taskTitles[taskId] || latestTitleById[taskId] || "Untitled");
      const prev = rollups.get(title) || {
        title,
        focusSeconds: 0,
        completedPomodoros: 0,
      };
      prev.focusSeconds += Math.max(0, Number(taskEffectiveSeconds[taskId] || 0));
      prev.completedPomodoros += Math.max(0, Number(taskPomodoros[taskId] || 0));
      rollups.set(title, prev);
    }
  }
  return Array.from(rollups.values())
    .map((item) => ({
      ...item,
      equivalentPomodoros: getEquivalentPomodoros(item.focusSeconds, focusMinutes),
    }))
    .sort((a, b) =>
      b.focusSeconds - a.focusSeconds ||
      b.completedPomodoros - a.completedPomodoros ||
      a.title.localeCompare(b.title, "zh-Hans-CN")
    );
}
