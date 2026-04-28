import { pinyin } from 'pinyin-pro';

const SPLIT_RE = /[^a-z0-9\u4e00-\u9fff]+/gi;
const INTRO_SLICE_LENGTH = 160;
const PREVIEW_LINE_COUNT = 3;

/** @param {string} s */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(SPLIT_RE, '');
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractMeaningfulLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => String(line || '').trim())
    .filter(Boolean);
}

/**
 * @param {string} text
 */
function buildSearchRegions(text) {
  const raw = String(text || '');
  const lines = extractMeaningfulLines(raw);
  const firstLine = lines[0] || raw.trim();
  const previewText = lines.slice(0, PREVIEW_LINE_COUNT).join(' ');
  return {
    full: raw,
    firstLine,
    preview: previewText || firstLine,
    intro: raw.slice(0, INTRO_SLICE_LENGTH),
  };
}

/**
 * @param {string} query
 * @param {string} text
 * @param {Array<{ score: number; matcher: (normalizedQuery: string, normalizedText: string) => boolean }>} rules
 */
function matchRegion(query, text, rules) {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  if (!normalizedQuery || !normalizedText) return { matched: false, score: 0 };
  for (const rule of rules) {
    if (rule.matcher(normalizedQuery, normalizedText)) {
      return { matched: true, score: rule.score };
    }
  }
  return { matched: false, score: 0 };
}

/** @param {string} text */
function getPinyin(text) {
  try {
    // @ts-ignore
    return pinyin(text, { toneType: 'none', type: 'string' }).replace(/\s/g, '') || '';
  } catch {
    return '';
  }
}

/** @param {string} text */
function getInitials(text) {
  try {
    // @ts-ignore
    return pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' }).replace(/\s/g, '') || '';
  } catch {
    return '';
  }
}

/** 
 * @param {string} needle
 * @param {string} haystack
 */
function isSubsequence(needle, haystack) {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/**
 * Match query against note body and optional tags.
 * Ranking is position-aware:
 * - exact / prefix matches
 * - first line / early content matches rank above deep-body matches
 * - tags rank below正文正文命中
 * - pinyin remains as a fallback
 *
 * @param {string} query
 * @param {string} text
 * @param {{ tagText?: string }} [options]
 * @returns {{ matched: boolean, score: number }}
 */
export function matchNote(query, text, options = {}) {
  const q = normalize(query);
  if (!q) return { matched: true, score: 100 };

  const regions = buildSearchRegions(text);
  /** @type {Array<{ score: number; matcher: (needle: string, haystack: string) => boolean }>} */
  const regionRules = [
    { score: 120, matcher: (needle, haystack) => haystack === needle },
    { score: 112, matcher: (needle, haystack) => haystack.startsWith(needle) },
    { score: 102, matcher: (needle, haystack) => haystack.includes(needle) },
  ];

  const firstLineMatch = matchRegion(q, regions.firstLine, [
    { score: 116, matcher: (needle, haystack) => haystack === needle },
    { score: 108, matcher: (needle, haystack) => haystack.startsWith(needle) },
    { score: 96, matcher: (needle, haystack) => haystack.includes(needle) },
  ]);
  if (firstLineMatch.matched) return firstLineMatch;

  const previewMatch = matchRegion(q, regions.preview, [
    { score: 94, matcher: (needle, haystack) => haystack.startsWith(needle) },
    { score: 88, matcher: (needle, haystack) => haystack.includes(needle) },
  ]);
  if (previewMatch.matched) return previewMatch;

  const introMatch = matchRegion(q, regions.intro, [
    { score: 86, matcher: (needle, haystack) => haystack.startsWith(needle) },
    { score: 80, matcher: (needle, haystack) => haystack.includes(needle) },
  ]);
  if (introMatch.matched) return introMatch;

  const fullMatch = matchRegion(q, regions.full, regionRules);
  if (fullMatch.matched) return fullMatch;

  const tagText = String(options.tagText || '');
  const tagMatch = matchRegion(q, tagText, [
    { score: 64, matcher: (needle, haystack) => haystack === needle },
    { score: 58, matcher: (needle, haystack) => haystack.startsWith(needle) },
    { score: 52, matcher: (needle, haystack) => haystack.includes(needle) },
  ]);
  if (tagMatch.matched) return tagMatch;

  const py = normalize(getPinyin(regions.full));
  if (py.startsWith(q)) return { matched: true, score: 48 };
  if (py.includes(q)) return { matched: true, score: 42 };

  const initials = normalize(getInitials(regions.full));
  if (initials.startsWith(q)) return { matched: true, score: 36 };
  if (isSubsequence(q, initials)) return { matched: true, score: 30 };

  return { matched: false, score: 0 };
}
