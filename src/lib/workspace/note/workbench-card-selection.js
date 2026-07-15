const CARD_INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [data-card-action]";

/**
 * Keep the card's pointer shortcut separate from its semantic controls.
 * @param {{ target?: unknown }} event
 * @param {boolean} inspectorOpen
 */
export function shouldOpenWorkbenchCardFromClick(event, inspectorOpen) {
  if (!inspectorOpen) return false;
  const target = /** @type {{ closest?: (selector: string) => unknown } | null | undefined} */ (event?.target);
  return !target?.closest?.(CARD_INTERACTIVE_SELECTOR);
}
