/**
 * Keeps the note rectangle fixed while native window controls expand around it.
 *
 * @param {{
 *   outerY: number;
 *   currentHeight: number;
 *   collapsedHeight: number;
 *   wasExpanded: boolean;
 *   previousTopReserve: number;
 *   nextTopReserve: number;
 *   nextBottomReserve: number;
 * }} input
 */
export function getExpandedNoteWindowFrame(input) {
  const noteY = input.outerY + (input.wasExpanded ? input.previousTopReserve : 0);
  const collapsedHeight = Math.max(
    1,
    input.wasExpanded ? input.collapsedHeight : input.currentHeight,
  );
  const topReserve = Math.max(0, input.nextTopReserve);
  const bottomReserve = Math.max(0, input.nextBottomReserve);
  return {
    outerY: noteY - topReserve,
    height: collapsedHeight + topReserve + bottomReserve,
    collapsedHeight,
    topReserve,
    bottomReserve,
  };
}

/**
 * @param {{ outerY: number; collapsedHeight: number; appliedTopReserve: number }} input
 */
export function getCollapsedNoteWindowFrame(input) {
  return {
    outerY: input.outerY + Math.max(0, input.appliedTopReserve),
    height: Math.max(1, input.collapsedHeight),
  };
}

/**
 * Converts the temporary expanded native-window position back to the persisted
 * note rectangle position.
 *
 * @param {{ x: number; y: number }} position
 * @param {number} appliedTopReserve
 * @param {boolean} expanded
 */
export function getPersistedNotePosition(position, appliedTopReserve, expanded) {
  return {
    x: position.x,
    y: position.y + (expanded ? Math.max(0, appliedTopReserve) : 0),
  };
}
