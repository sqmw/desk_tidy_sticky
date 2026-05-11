const REVIEW_LOG_FALLBACK_DAYS = 42;

/**
 * @param {any[]} notes
 */
export function getReviewRecords(notes) {
  return (Array.isArray(notes) ? notes : [])
    .filter((note) => !note?.isDeleted && !note?.isArchived)
    .filter((note) => resolveRecordKind(note) === "done_log" || !!note?.isDone)
    .map((note) => {
      const completedAt = getRecordTimestamp(note);
      const dateKey = getDateKeyFromIso(completedAt);
      const preview = buildRecordPreview(note?.text || "");
      return {
        id: String(note?.id || ""),
        note,
        completedAt,
        dateKey,
        title: preview.title,
        excerpt: preview.excerpt,
        tags: Array.isArray(note?.tags) ? note.tags.filter(Boolean) : [],
        source: resolveRecordKind(note) === "done_log" ? "done_log" : "note",
      };
    })
    .filter((record) => !!record.id && !!record.dateKey)
    .sort((left, right) => {
      const diff = Date.parse(right.completedAt || "") - Date.parse(left.completedAt || "");
      if (diff !== 0) return diff;
      return right.id.localeCompare(left.id);
    });
}

/**
 * @param {any[]} records
 * @param {Date} monthDate
 */
export function buildReviewCalendarMonth(records, monthDate) {
  const cursor = new Date(monthDate);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(1);
  const monthIndex = cursor.getMonth();
  const firstDay = new Date(cursor);
  const firstWeekday = firstDay.getDay();
  firstDay.setDate(firstDay.getDate() - firstWeekday);

  /** @type {Map<string, any[]>} */
  const recordMap = new Map();
  for (const record of records) {
    const prev = recordMap.get(record.dateKey);
    if (prev) prev.push(record);
    else recordMap.set(record.dateKey, [record]);
  }

  return Array.from({ length: REVIEW_LOG_FALLBACK_DAYS }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const dateKey = getDateKey(date);
    const dayRecords = recordMap.get(dateKey) || [];
    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === monthIndex,
      count: dayRecords.length,
      records: dayRecords,
    };
  });
}

/**
 * @param {string} isoString
 */
export function formatReviewDateTime(isoString) {
  const date = safeDate(isoString);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * @param {string} isoString
 */
export function formatReviewDayLabel(isoString) {
  const date = safeDate(isoString);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

/**
 * @param {Date} date
 */
export function formatReviewMonthLabel(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  }).format(date);
}

/**
 * @param {Date} date
 */
export function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} isoString
 */
export function getDateKeyFromIso(isoString) {
  const date = safeDate(isoString);
  return date ? getDateKey(date) : "";
}

/**
 * @param {any} note
 */
export function resolveRecordKind(note) {
  return String(note?.recordKind || note?.record_kind || "note");
}

/**
 * @param {any} note
 */
export function getRecordTimestamp(note) {
  return String(
    note?.completedAt ||
      note?.completed_at ||
      note?.updatedAt ||
      note?.updated_at ||
      note?.createdAt ||
      note?.created_at ||
      "",
  ).trim();
}

/**
 * @param {string} text
 */
function buildRecordPreview(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || "Untitled";
  const excerpt = (lines.slice(1).join(" ") || title).slice(0, 220);
  return { title, excerpt };
}

/**
 * @param {string} isoString
 */
function safeDate(isoString) {
  const value = String(isoString || "").trim();
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
