import { getDateKey } from "$lib/workspace/focus/focus-model.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Record<string, any>} stats
 * @param {string} key
 */
function getFocusMinutes(stats, key) {
  return Math.max(0, Math.round(Number(stats[key]?.focusSeconds || 0) / 60));
}

/**
 * @param {Date} [today]
 * @param {number} [days]
 */
function recentDateKeys(today = new Date(), days = 7) {
  const out = [];
  const safeDays = Math.max(1, Math.floor(days));
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * ONE_DAY_MS);
    out.push(getDateKey(d));
  }
  return out;
}

/**
 * @param {Record<string, any>} stats
 * @param {Date} [today]
 */
export function getWeekFocusAverageMinutes(stats, today = new Date()) {
  const keys = recentDateKeys(today, 7);
  const total = keys.reduce((sum, key) => sum + getFocusMinutes(stats, key), 0);
  return Math.round(total / 7);
}

/**
 * @param {Record<string, any>} stats
 * @param {Date} [today]
 */
export function getFocusStreakDays(stats, today = new Date()) {
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today.getTime() - i * ONE_DAY_MS);
    const key = getDateKey(d);
    if (getFocusMinutes(stats, key) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * @param {Record<string, any>} stats
 * @param {Date} [today]
 * @param {number} [days]
 */
export function getBestFocusDay(stats, today = new Date(), days = 30) {
  const keys = recentDateKeys(today, days);
  let bestKey = "";
  let bestMinutes = 0;
  for (const key of keys) {
    const minutes = getFocusMinutes(stats, key);
    if (minutes > bestMinutes) {
      bestMinutes = minutes;
      bestKey = key;
    }
  }
  return {
    dateKey: bestKey,
    minutes: bestMinutes,
  };
}

/**
 * @param {Record<string, any>} stats
 * @param {Date} [today]
 * @param {number} [days]
 */
export function buildFocusHeatmap(stats, today = new Date(), days = 28) {
  const keys = recentDateKeys(today, days);
  const cells = keys.map((key) => {
    const minutes = getFocusMinutes(stats, key);
    return { key, minutes };
  });
  const maxMinutes = Math.max(1, ...cells.map((x) => x.minutes));
  return cells.map((cell) => ({
    ...cell,
    level: Math.min(4, Math.floor((cell.minutes / maxMinutes) * 4)),
  }));
}
