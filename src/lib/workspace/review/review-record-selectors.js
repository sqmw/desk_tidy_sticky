export const REVIEW_RANGE_ALL = "all";
export const REVIEW_RANGE_TODAY = "today";
export const REVIEW_RANGE_LAST_7_DAYS = "last_7_days";
export const REVIEW_RANGE_LAST_30_DAYS = "last_30_days";
export const REVIEW_RANGE_THIS_MONTH = "this_month";

/**
 * @param {any[]} records
 */
export function buildReviewTagOptions(records) {
  const values = new Set();
  for (const record of Array.isArray(records) ? records : []) {
    for (const tag of Array.isArray(record?.tags) ? record.tags : []) {
      const next = String(tag || "").trim();
      if (next) values.add(next);
    }
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

/**
 * @param {any[]} records
 * @param {{ rangeKey?: string; tag?: string; searchText?: string; now?: Date }} options
 */
export function filterReviewRecords(records, options = {}) {
  const list = Array.isArray(records) ? records : [];
  const now = options.now instanceof Date ? options.now : new Date();
  const rangeKey = String(options.rangeKey || REVIEW_RANGE_ALL);
  const selectedTag = String(options.tag || "").trim();
  const searchText = normalizeSearchText(String(options.searchText || ""));

  return list.filter((record) => {
    const tags = Array.isArray(record?.tags) ? record.tags : [];
    if (selectedTag && !tags.includes(selectedTag)) {
      return false;
    }
    if (searchText && !buildRecordSearchHaystack(record).includes(searchText)) {
      return false;
    }
    if (!matchesReviewDateRange(record?.completedAt, rangeKey, now)) {
      return false;
    }
    return true;
  });
}

/**
 * @param {string} isoString
 * @param {string} rangeKey
 * @param {Date} now
 */
export function matchesReviewDateRange(isoString, rangeKey, now = new Date()) {
  if (rangeKey === REVIEW_RANGE_ALL) return true;
  const date = safeDate(isoString);
  if (!date) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (rangeKey === REVIEW_RANGE_TODAY) {
    return target.getTime() === today.getTime();
  }

  if (rangeKey === REVIEW_RANGE_LAST_7_DAYS) {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return target >= start && target <= today;
  }

  if (rangeKey === REVIEW_RANGE_LAST_30_DAYS) {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return target >= start && target <= today;
  }

  if (rangeKey === REVIEW_RANGE_THIS_MONTH) {
    return (
      target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth()
    );
  }

  return true;
}

/**
 * @param {any} record
 */
function buildRecordSearchHaystack(record) {
  return normalizeSearchText(
    [
      record?.title,
      record?.excerpt,
      record?.note?.text,
      ...(Array.isArray(record?.tags) ? record.tags : []),
    ].join("\n"),
  );
}

/**
 * @param {string} value
 */
function normalizeSearchText(value) {
  return String(value || "").trim().toLocaleLowerCase();
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
