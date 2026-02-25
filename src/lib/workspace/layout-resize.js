/**
 * @param {number} clientX
 * @param {{ min?: number; max?: number }} [opts]
 */
export function calcSidebarWidth(clientX, opts = {}) {
  const min = opts.min ?? 86;
  const max = opts.max ?? 260;
  return Math.max(min, Math.min(max, Math.round(clientX)));
}

/**
 * @param {{
 *   clientX: number;
 *   rect: { left: number; right: number; width: number };
 *   isCollapsed: boolean;
 *   minInspectorWidth?: number;
 *   minListWidth?: number;
 *   collapseThreshold?: number;
 *   expandThreshold?: number;
 * }} input
 */
export function calcInspectorLayout(input) {
  const minInspectorWidth = input.minInspectorWidth ?? 340;
  const minListWidth = input.minListWidth ?? 140;
  const collapseThreshold = input.collapseThreshold ?? 56;
  const expandThreshold = input.expandThreshold ?? 220;
  const splitter = 8;
  const pointerFromLeft = input.clientX - input.rect.left;

  if (pointerFromLeft <= collapseThreshold) {
    return {
      collapsed: true,
      width: Math.max(minInspectorWidth, Math.floor(input.rect.width - splitter)),
    };
  }

  const nextCollapsed = input.isCollapsed && pointerFromLeft < expandThreshold;
  const listWidth = nextCollapsed ? 0 : minListWidth;
  const max = Math.max(minInspectorWidth, Math.floor(input.rect.width - splitter - listWidth));
  const width = Math.max(minInspectorWidth, Math.min(max, Math.round(input.rect.right - input.clientX)));
  return { collapsed: nextCollapsed, width };
}
