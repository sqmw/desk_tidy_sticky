/**
 * @param {number | undefined | null} p
 */
export function clampPriority(p) {
  return Math.max(1, Math.min(4, Number(p) || 4));
}

/**
 * @param {number | undefined | null} p
 * @returns {number | null}
 */
export function normalizePriority(p) {
  if (p == null) return null;
  const v = Number(p);
  if (!Number.isFinite(v)) return null;
  return Math.max(1, Math.min(4, v));
}

/**
 * @param {number | undefined | null} p
 * @returns {number | null}
 */
export function nextPriority(p) {
  const normalized = normalizePriority(p);
  if (normalized == null) return 1;
  return normalized >= 4 ? null : normalized + 1;
}

/**
 * @param {number | undefined | null} p
 */
export function priorityBadge(p) {
  const normalized = normalizePriority(p);
  return normalized == null ? "" : `Q${normalized}`;
}

/**
 * @param {any} strings
 */
export function buildQuadrants(strings) {
  return [
    { key: 1, title: strings.quadrantQ1, subtitle: strings.quadrantQ1Desc },
    { key: 2, title: strings.quadrantQ2, subtitle: strings.quadrantQ2Desc },
    { key: 3, title: strings.quadrantQ3, subtitle: strings.quadrantQ3Desc },
    { key: 4, title: strings.quadrantQ4, subtitle: strings.quadrantQ4Desc },
  ];
}

/**
 * @template T
 * @param {T[]} notes
 * @param {number} quadrant
 * @returns {T[]}
 */
export function filterNotesByQuadrant(notes, quadrant) {
  const safe = clampPriority(quadrant);
  return notes.filter((note) => normalizePriority(/** @type {any} */ (note).priority) === safe);
}
