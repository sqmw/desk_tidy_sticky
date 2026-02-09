const COMMAND_TOKEN_PATTERN = /(^|\s)@([a-zA-Z]*)$/;

/**
 * @param {string} text
 * @param {number} caret
 */
export function findSourceCommandToken(text, caret) {
  const safeText = String(text ?? "");
  const safeCaret = Math.max(0, Math.min(Number(caret) || 0, safeText.length));
  const beforeCaret = safeText.slice(0, safeCaret);
  const matched = COMMAND_TOKEN_PATTERN.exec(beforeCaret);
  if (!matched) return null;
  return {
    query: matched[2] || "",
    beforeCaret,
    tokenLength: (matched[2] || "").length + 1,
    caret: safeCaret,
  };
}

/**
 * @param {{ text: string; caret: number; insert: string }} options
 */
export function applySourceCommandInsert(options) {
  const text = String(options.text ?? "");
  const token = findSourceCommandToken(text, Number(options.caret) || 0);
  if (!token) return null;
  const tokenStart = token.beforeCaret.length - token.tokenLength;
  const suffix = text.slice(token.caret);
  const nextText = text.slice(0, tokenStart) + String(options.insert ?? "") + suffix;
  const nextCaret = Math.max(0, nextText.length - suffix.length);
  return { nextText, nextCaret };
}
