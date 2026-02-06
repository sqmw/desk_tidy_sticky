import { pinyin } from 'pinyin-pro';

const SPLIT_RE = /[^a-z0-9\u4e00-\u9fff]+/gi;

/** @param {string} s */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(SPLIT_RE, '');
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
 * Match query against note text. Supports:
 * - Case-insensitive text match
 * - Chinese pinyin full match
 * - Pinyin initials match
 * @param {string} query - Search query
 * @param {string} text - Note text
 * @returns {{ matched: boolean, score: number }}
 */
export function matchNote(query, text) {
  const q = normalize(query);
  if (!q) return { matched: true, score: 100 };

  const normText = normalize(text);
  if (normText === q) return { matched: true, score: 100 };
  if (normText.startsWith(q)) return { matched: true, score: 90 };
  if (normText.includes(q)) return { matched: true, score: 75 };

  const py = normalize(getPinyin(text));
  if (py.startsWith(q)) return { matched: true, score: 65 };
  if (py.includes(q)) return { matched: true, score: 55 };

  const initials = normalize(getInitials(text));
  if (initials.startsWith(q)) return { matched: true, score: 50 };
  if (isSubsequence(q, initials)) return { matched: true, score: 40 };

  return { matched: false, score: 0 };
}
