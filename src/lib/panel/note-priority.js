/**
 * @param {number | undefined | null} p
 */
export function clampPriority(p) {
  return Math.max(1, Math.min(4, Number(p) || 4));
}

/**
 * @param {number | undefined | null} p
 */
export function nextPriority(p) {
  const safe = clampPriority(p);
  return safe >= 4 ? 1 : safe + 1;
}

/**
 * @param {number | undefined | null} p
 */
export function priorityBadge(p) {
  return `Q${clampPriority(p)}`;
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
  return notes.filter((note) => clampPriority(/** @type {any} */ (note).priority) === safe);
}
