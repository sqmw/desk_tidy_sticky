/**
 * Keeps the note rectangle fixed while native window controls expand around it.
 *
 * @param {{
 *   outerX: number;
 *   outerY: number;
 *   currentWidth: number;
 *   currentHeight: number;
 *   collapsedWidth: number;
 *   collapsedHeight: number;
 *   wasExpanded: boolean;
 *   previousLeftReserve: number;
 *   previousTopReserve: number;
 *   nextLeftReserve: number;
 *   nextRightReserve: number;
 *   nextTopReserve: number;
 *   nextBottomReserve: number;
 * }} input
 */
export function getExpandedNoteWindowFrame(input) {
  const noteX = input.outerX + (input.wasExpanded ? input.previousLeftReserve : 0);
  const noteY = input.outerY + (input.wasExpanded ? input.previousTopReserve : 0);
  const collapsedWidth = Math.max(
    1,
    input.wasExpanded ? input.collapsedWidth : input.currentWidth,
  );
  const collapsedHeight = Math.max(
    1,
    input.wasExpanded ? input.collapsedHeight : input.currentHeight,
  );
  const leftReserve = Math.max(0, input.nextLeftReserve);
  const rightReserve = Math.max(0, input.nextRightReserve);
  const topReserve = Math.max(0, input.nextTopReserve);
  const bottomReserve = Math.max(0, input.nextBottomReserve);
  return {
    outerX: noteX - leftReserve,
    outerY: noteY - topReserve,
    width: collapsedWidth + leftReserve + rightReserve,
    height: collapsedHeight + topReserve + bottomReserve,
    collapsedWidth,
    collapsedHeight,
    leftReserve,
    rightReserve,
    topReserve,
    bottomReserve,
  };
}

/**
 * @param {{
 *   outerX: number;
 *   outerY: number;
 *   collapsedWidth: number;
 *   collapsedHeight: number;
 *   appliedLeftReserve: number;
 *   appliedTopReserve: number;
 * }} input
 */
export function getCollapsedNoteWindowFrame(input) {
  return {
    outerX: input.outerX + Math.max(0, input.appliedLeftReserve),
    outerY: input.outerY + Math.max(0, input.appliedTopReserve),
    width: Math.max(1, input.collapsedWidth),
    height: Math.max(1, input.collapsedHeight),
  };
}

/**
 * Converts the temporary expanded native-window position back to the persisted
 * note rectangle position.
 *
 * @param {{ x: number; y: number }} position
 * @param {{ left: number; top: number }} reserves
 * @param {boolean} expanded
 */
export function getPersistedNotePosition(position, reserves, expanded) {
  return {
    x: position.x + (expanded ? Math.max(0, reserves.left) : 0),
    y: position.y + (expanded ? Math.max(0, reserves.top) : 0),
  };
}
