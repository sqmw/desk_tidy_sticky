export const MAX_WORKSPACE_CUSTOM_CSS_LENGTH = 20000;

/**
 * @param {unknown} css
 */
export function normalizeWorkspaceCustomCss(css) {
  if (css == null) return "";
  const text = String(css);
  if (text.length <= MAX_WORKSPACE_CUSTOM_CSS_LENGTH) return text;
  return text.slice(0, MAX_WORKSPACE_CUSTOM_CSS_LENGTH);
}
