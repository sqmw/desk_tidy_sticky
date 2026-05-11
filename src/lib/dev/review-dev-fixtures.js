import { buildReviewFocusSnapshot } from "$lib/workspace/review/review-focus-stats.js";

/**
 * @param {Date} date
 * @param {number} deltaDays
 * @param {number} hour
 * @param {number} minute
 */
function shiftDate(date, deltaDays, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

/**
 * @param {Date} now
 * @param {number} deltaDays
 * @param {number} hour
 * @param {number} minute
 * @param {string} id
 * @param {string} text
 * @param {string[]} [tags]
 * @param {boolean} [fromDoneNote]
 */
function buildFixtureDoneNote(now, deltaDays, hour, minute, id, text, tags = [], fromDoneNote = false) {
  const completedAt = shiftDate(now, deltaDays, hour, minute).toISOString();
  return {
    id,
    text,
    createdAt: completedAt,
    updatedAt: completedAt,
    completedAt,
    isPinned: false,
    isArchived: false,
    isDone: true,
    isDeleted: false,
    isAlwaysOnTop: false,
    isWallpaper: false,
    recordKind: fromDoneNote ? "note" : "done_log",
    tags,
  };
}

/**
 * @param {Date} now
 */
function buildFixtureFocusInput(now) {
  const tasks = [
    {
      id: "fixture-focus-1",
      title: "线代推导整理",
      taskMode: "timeWindow",
      startTime: "09:00",
      endTime: "10:30",
      targetSeconds: 90 * 60,
      recurrence: "workday",
      weekdays: [1, 2, 3, 4, 5],
      enabled: true,
      createdAt: shiftDate(now, -6, 8, 40).toISOString(),
    },
    {
      id: "fixture-focus-2",
      title: "论文速记回顾",
      taskMode: "duration",
      startTime: "14:00",
      endTime: "15:00",
      targetSeconds: 60 * 60,
      recurrence: "daily",
      weekdays: [],
      enabled: true,
      createdAt: shiftDate(now, -5, 13, 10).toISOString(),
    },
    {
      id: "fixture-focus-3",
      title: "项目收尾与发布",
      taskMode: "duration",
      startTime: "20:00",
      endTime: "21:00",
      targetSeconds: 75 * 60,
      recurrence: "none",
      weekdays: [],
      enabled: true,
      createdAt: shiftDate(now, -2, 19, 20).toISOString(),
    },
  ];

  /** @type {Record<string, any>} */
  const stats = {};
  const dayFixtures = [
    { daysAgo: 0, focusSeconds: 110 * 60, pomodoros: 3, completed: ["fixture-focus-1"], taskSeconds: { "fixture-focus-1": 70 * 60, "fixture-focus-2": 40 * 60 }, taskPomodoros: { "fixture-focus-1": 2, "fixture-focus-2": 1 } },
    { daysAgo: 1, focusSeconds: 160 * 60, pomodoros: 4, completed: ["fixture-focus-2"], taskSeconds: { "fixture-focus-2": 60 * 60, "fixture-focus-3": 100 * 60 }, taskPomodoros: { "fixture-focus-2": 1, "fixture-focus-3": 3 } },
    { daysAgo: 2, focusSeconds: 95 * 60, pomodoros: 2, completed: ["fixture-focus-3"], taskSeconds: { "fixture-focus-3": 95 * 60 }, taskPomodoros: { "fixture-focus-3": 2 } },
    { daysAgo: 3, focusSeconds: 140 * 60, pomodoros: 4, completed: ["fixture-focus-1"], taskSeconds: { "fixture-focus-1": 90 * 60, "fixture-focus-2": 50 * 60 }, taskPomodoros: { "fixture-focus-1": 2, "fixture-focus-2": 2 } },
    { daysAgo: 4, focusSeconds: 55 * 60, pomodoros: 1, completed: [], taskSeconds: { "fixture-focus-2": 55 * 60 }, taskPomodoros: { "fixture-focus-2": 1 } },
    { daysAgo: 5, focusSeconds: 125 * 60, pomodoros: 3, completed: ["fixture-focus-1"], taskSeconds: { "fixture-focus-1": 75 * 60, "fixture-focus-3": 50 * 60 }, taskPomodoros: { "fixture-focus-1": 2, "fixture-focus-3": 1 } },
    { daysAgo: 6, focusSeconds: 80 * 60, pomodoros: 2, completed: [], taskSeconds: { "fixture-focus-2": 40 * 60, "fixture-focus-3": 40 * 60 }, taskPomodoros: { "fixture-focus-2": 1, "fixture-focus-3": 1 } },
  ];

  for (const item of dayFixtures) {
    const day = shiftDate(now, -item.daysAgo, 12, 0);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    stats[key] = {
      focusSeconds: item.focusSeconds,
      pomodoros: item.pomodoros,
      completedTaskIds: item.completed,
      taskPomodoros: item.taskPomodoros,
      taskEffectiveSeconds: item.taskSeconds,
      taskTitles: {
        "fixture-focus-1": "线代推导整理",
        "fixture-focus-2": "论文速记回顾",
        "fixture-focus-3": "项目收尾与发布",
      },
    };
  }

  return { tasks, stats };
}

/**
 * @param {{ now?: Date; focusMinutes?: number }} [input]
 */
export function buildReviewDevFixtures(input = {}) {
  const now = input.now instanceof Date ? input.now : new Date();
  const focusMinutes = Math.max(1, Number(input.focusMinutes || 25));

  const notes = [
    buildFixtureDoneNote(
      now,
      0,
      9,
      40,
      "fixture-done-1",
      "线代 day03 推导收口\n把矩阵求导横向量/纵向量的约定重新梳理了一遍，补全了自己的错题备注。",
      ["数学", "复盘"],
    ),
    buildFixtureDoneNote(
      now,
      0,
      15,
      25,
      "fixture-done-2",
      "论文精读 2 篇\n顺手整理了一个可继续扩写的摘要框架。",
      ["论文", "阅读"],
      true,
    ),
    buildFixtureDoneNote(
      now,
      -1,
      21,
      10,
      "fixture-done-3",
      "桌面贴纸交互回归检查\n把 hover、置顶、编辑态切换重新走完一遍，记录了两个需要继续优化的细节。",
      ["项目", "回归"],
    ),
    buildFixtureDoneNote(
      now,
      -3,
      11,
      5,
      "fixture-done-4",
      "项目发布说明收尾\n把版本变化、视频入口和 FAQ 统一到同一版说明里。",
      ["发布", "文档"],
    ),
    buildFixtureDoneNote(
      now,
      -5,
      18,
      45,
      "fixture-done-5",
      "做菜练习\n拍了两张过程图，顺手记下调味比例和下次想优化的地方。",
      ["生活", "图片"],
    ),
  ];

  const focusInput = buildFixtureFocusInput(now);
  const focusSnapshot = buildReviewFocusSnapshot({
    tasks: focusInput.tasks,
    stats: focusInput.stats,
    focusMinutes,
    now,
  });

  return {
    notes,
    focusSnapshot,
  };
}
