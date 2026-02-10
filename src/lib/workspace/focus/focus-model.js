/**
 * @typedef {"none" | "daily" | "workday" | "custom"} FocusRecurrence
 */

/**
 * @typedef {Object} FocusTask
 * @property {string} id
 * @property {string} title
 * @property {string} startTime
 * @property {string} endTime
 * @property {FocusRecurrence} recurrence
 * @property {number[]} weekdays
 * @property {number} targetPomodoros
 * @property {boolean} enabled
 * @property {string} createdAt
 */

/**
 * @typedef {Object} FocusDayStats
 * @property {number} focusSeconds
 * @property {number} pomodoros
 * @property {string[]} completedTaskIds
 * @property {Record<string, number>} taskPomodoros
 */

/**
 * @typedef {Record<string, FocusDayStats>} FocusStats
 */

/** @type {{ NONE: FocusRecurrence; DAILY: FocusRecurrence; WORKDAY: FocusRecurrence; CUSTOM: FocusRecurrence }} */
const RECURRENCE = {
  NONE: "none",
  DAILY: "daily",
  WORKDAY: "workday",
  CUSTOM: "custom",
};

/**
 * @param {number} n
 */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {Date} [date]
 */
export function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
export function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * @param {unknown} value
 * @param {string} fallback
 */
function normalizeTime(value, fallback) {
  const text = String(value ?? "").trim();
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(text);
  if (!m) return fallback;
  const hh = clampInt(m[1], Number(fallback.slice(0, 2)), 0, 23);
  const mm = clampInt(m[2], Number(fallback.slice(3, 5)), 0, 59);
  return `${pad2(hh)}:${pad2(mm)}`;
}

/**
 * @param {string} timeText
 */
export function timeToMinutes(timeText) {
  const [h, m] = normalizeTime(timeText, "00:00").split(":").map(Number);
  return h * 60 + m;
}

/**
 * @param {unknown} rec
 * @returns {FocusRecurrence}
 */
function normalizeRecurrence(rec) {
  if (rec === RECURRENCE.DAILY) return RECURRENCE.DAILY;
  if (rec === RECURRENCE.WORKDAY) return RECURRENCE.WORKDAY;
  if (rec === RECURRENCE.CUSTOM) return RECURRENCE.CUSTOM;
  return RECURRENCE.NONE;
}

/**
 * @param {unknown} days
 */
function normalizeWeekdays(days) {
  if (!Array.isArray(days)) return [];
  const set = new Set(
    days
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
  );
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * @param {any} raw
 * @returns {FocusTask}
 */
export function normalizeFocusTask(raw) {
  const title = String(raw?.title ?? "").trim();
  return {
    id: String(raw?.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: title || "Untitled",
    startTime: normalizeTime(raw?.startTime, "09:00"),
    endTime: normalizeTime(raw?.endTime, "10:00"),
    recurrence: normalizeRecurrence(raw?.recurrence),
    weekdays: normalizeWeekdays(raw?.weekdays),
    targetPomodoros: clampInt(raw?.targetPomodoros, 1, 1, 24),
    enabled: raw?.enabled !== false,
    createdAt: String(raw?.createdAt || new Date().toISOString()),
  };
}

/**
 * @param {unknown} raw
 * @returns {FocusTask[]}
 */
export function normalizeFocusTasks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeFocusTask(item));
}

/**
 * @param {any} raw
 * @returns {FocusDayStats}
 */
function normalizeDayStats(raw) {
  const completedTaskIds = Array.isArray(raw?.completedTaskIds)
    ? raw.completedTaskIds.map((/** @type {unknown} */ id) => String(id))
    : [];
  const taskPomodoros = typeof raw?.taskPomodoros === "object" && raw?.taskPomodoros
    ? Object.fromEntries(
        Object.entries(raw.taskPomodoros).map(([k, v]) => [String(k), clampInt(v, 0, 0, 9999)]),
      )
    : {};
  return {
    focusSeconds: clampInt(raw?.focusSeconds, 0, 0, 86400 * 31),
    pomodoros: clampInt(raw?.pomodoros, 0, 0, 9999),
    completedTaskIds: Array.from(new Set(completedTaskIds)),
    taskPomodoros,
  };
}

/**
 * @param {unknown} raw
 * @returns {FocusStats}
 */
export function normalizeFocusStats(raw) {
  if (!raw || typeof raw !== "object") return {};
  /** @type {FocusStats} */
  const out = {};
  for (const [k, v] of Object.entries(/** @type {Record<string, any>} */ (raw))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    out[k] = normalizeDayStats(v);
  }
  return out;
}

/**
 * @param {FocusStats} stats
 * @param {string} dateKey
 * @returns {FocusDayStats}
 */
export function ensureDayStats(stats, dateKey) {
  const base = stats[dateKey];
  if (base) return base;
  return {
    focusSeconds: 0,
    pomodoros: 0,
    completedTaskIds: [],
    taskPomodoros: {},
  };
}

/**
 * @param {ReturnType<typeof normalizeFocusTask>} task
 * @param {Date} date
 */
export function shouldRunOnDate(task, date) {
  if (!task.enabled) return false;
  const jsDay = date.getDay(); // 0 = Sun
  const weekday = jsDay === 0 ? 7 : jsDay;
  if (task.recurrence === RECURRENCE.DAILY) return true;
  if (task.recurrence === RECURRENCE.WORKDAY) return weekday >= 1 && weekday <= 5;
  if (task.recurrence === RECURRENCE.CUSTOM) {
    return task.weekdays.includes(weekday);
  }
  return true;
}

/**
 * @param {ReturnType<typeof normalizeFocusTasks>} tasks
 * @param {Date} [date]
 */
export function getTodayTasks(tasks, date = new Date()) {
  return tasks
    .filter((task) => shouldRunOnDate(task, date))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/**
 * @param {Date} [today]
 */
export function getRecentDateKeys(today = new Date()) {
  const keys = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(getDateKey(d));
  }
  return keys;
}

export { RECURRENCE };
