export const BLOCK_TYPE = {
  PARAGRAPH: "paragraph",
  HEADING1: "heading1",
  HEADING2: "heading2",
  HEADING3: "heading3",
  TODO: "todo",
  BULLET: "bullet",
  QUOTE: "quote",
  CODE: "code",
};

export const BLOCK_TYPE_OPTIONS = [
  { type: BLOCK_TYPE.PARAGRAPH, key: "text", label: "Text" },
  { type: BLOCK_TYPE.HEADING1, key: "h1", label: "Heading 1" },
  { type: BLOCK_TYPE.HEADING2, key: "h2", label: "Heading 2" },
  { type: BLOCK_TYPE.HEADING3, key: "h3", label: "Heading 3" },
  { type: BLOCK_TYPE.TODO, key: "todo", label: "Todo" },
  { type: BLOCK_TYPE.BULLET, key: "bullet", label: "Bullet" },
  { type: BLOCK_TYPE.QUOTE, key: "quote", label: "Quote" },
  { type: BLOCK_TYPE.CODE, key: "code", label: "Code" },
];

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {string} type
 * @param {string} text
 * @param {{ checked?: boolean }} [options]
 */
export function createBlock(type, text, options = {}) {
  return {
    id: makeId(),
    type,
    text,
    checked: !!options.checked,
  };
}

/**
 * @param {string} markdown
 */
export function parseMarkdownToBlocks(markdown) {
  const lines = String(markdown ?? "").replaceAll("\r\n", "\n").split("\n");
  /** @type {Array<{ id: string; type: string; text: string; checked: boolean }>} */
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (/^```/.test(line.trim())) {
      i += 1;
      const codeLines = [];
      while (i < lines.length && !/^```/.test((lines[i] ?? "").trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(createBlock(BLOCK_TYPE.CODE, codeLines.join("\n")));
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const type =
        level === 1 ? BLOCK_TYPE.HEADING1 : level === 2 ? BLOCK_TYPE.HEADING2 : BLOCK_TYPE.HEADING3;
      blocks.push(createBlock(type, h[2]));
      i += 1;
      continue;
    }
    const todo = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    if (todo) {
      blocks.push(createBlock(BLOCK_TYPE.TODO, todo[2], { checked: todo[1].toLowerCase() === "x" }));
      i += 1;
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push(createBlock(BLOCK_TYPE.BULLET, bullet[1]));
      i += 1;
      continue;
    }
    const quote = /^>\s+(.*)$/.exec(line);
    if (quote) {
      blocks.push(createBlock(BLOCK_TYPE.QUOTE, quote[1]));
      i += 1;
      continue;
    }
    blocks.push(createBlock(BLOCK_TYPE.PARAGRAPH, line));
    i += 1;
  }
  if (blocks.length === 0) {
    blocks.push(createBlock(BLOCK_TYPE.PARAGRAPH, ""));
  }
  return blocks;
}

/**
 * @param {Array<{ type: string; text: string; checked?: boolean }>} blocks
 */
export function blocksToMarkdown(blocks) {
  const normalized = Array.isArray(blocks) ? blocks : [];
  return normalized
    .map((block) => {
      const text = String(block.text ?? "");
      switch (block.type) {
        case BLOCK_TYPE.HEADING1:
          return `# ${text}`;
        case BLOCK_TYPE.HEADING2:
          return `## ${text}`;
        case BLOCK_TYPE.HEADING3:
          return `### ${text}`;
        case BLOCK_TYPE.TODO:
          return `- [${block.checked ? "x" : " "}] ${text}`;
        case BLOCK_TYPE.BULLET:
          return `- ${text}`;
        case BLOCK_TYPE.QUOTE:
          return `> ${text}`;
        case BLOCK_TYPE.CODE:
          return `\`\`\`\n${text}\n\`\`\``;
        default:
          return text;
      }
    })
    .join("\n");
}

/**
 * @param {string} type
 */
export function shortTypeLabel(type) {
  switch (type) {
    case BLOCK_TYPE.HEADING1:
      return "H1";
    case BLOCK_TYPE.HEADING2:
      return "H2";
    case BLOCK_TYPE.HEADING3:
      return "H3";
    case BLOCK_TYPE.TODO:
      return "To";
    case BLOCK_TYPE.BULLET:
      return "Li";
    case BLOCK_TYPE.QUOTE:
      return "Q";
    case BLOCK_TYPE.CODE:
      return "{}";
    default:
      return "P";
  }
}

/**
 * @param {string} type
 */
export function nextBlockTypeOnEnter(type) {
  if (type === BLOCK_TYPE.BULLET || type === BLOCK_TYPE.TODO || type === BLOCK_TYPE.QUOTE) {
    return type;
  }
  return BLOCK_TYPE.PARAGRAPH;
}

/**
 * @param {string} query
 */
export function filterBlockCommands(query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return BLOCK_TYPE_OPTIONS;
  return BLOCK_TYPE_OPTIONS.filter(
    (item) => item.key.startsWith(q) || item.label.toLowerCase().includes(q),
  );
}
