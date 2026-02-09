/**
 * @param {HTMLElement} root
 */
function createTextWalker(root) {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
}

/**
 * @param {HTMLElement} root
 * @param {Node} node
 * @param {number} offset
 */
function offsetFromNode(root, node, offset) {
  let count = 0;
  const walker = createTextWalker(root);
  /** @type {Node | null} */
  let current = walker.nextNode();
  while (current) {
    const text = current.textContent ?? "";
    if (current === node) {
      return count + Math.max(0, Math.min(offset, text.length));
    }
    count += text.length;
    current = walker.nextNode();
  }
  return count;
}

/**
 * @param {HTMLElement} root
 */
export function getSelectionOffsets(root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    const len = (root.textContent ?? "").length;
    return { start: len, end: len };
  }
  const range = selection.getRangeAt(0);
  const start = offsetFromNode(root, range.startContainer, range.startOffset);
  const end = offsetFromNode(root, range.endContainer, range.endOffset);
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

/**
 * @param {HTMLElement} root
 * @param {number} start
 * @param {number} [end]
 */
export function setSelectionOffsets(root, start, end = start) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.max(0, end);
  const range = document.createRange();
  const selection = window.getSelection();
  if (!selection) return;

  let startNode = null;
  let endNode = null;
  let startOffset = 0;
  let endOffset = 0;
  let count = 0;
  const walker = createTextWalker(root);
  /** @type {Node | null} */
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent ?? "";
    const nextCount = count + text.length;
    if (!startNode && safeStart <= nextCount) {
      startNode = node;
      startOffset = Math.max(0, safeStart - count);
    }
    if (!endNode && safeEnd <= nextCount) {
      endNode = node;
      endOffset = Math.max(0, safeEnd - count);
    }
    count = nextCount;
    node = walker.nextNode();
  }

  if (!startNode || !endNode) {
    range.selectNodeContents(root);
    range.collapse(false);
  } else {
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * @param {HTMLElement} root
 */
export function isCaretAtStart(root) {
  const { start, end } = getSelectionOffsets(root);
  return start === 0 && end === 0;
}
