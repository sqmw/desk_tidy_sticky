import { BLOCK_TYPE, createBlock, nextBlockTypeOnEnter } from "$lib/note/block-model.js";

/**
 * @typedef {{ id: string; type: string; text: string; checked: boolean }} NoteBlock
 */

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 * @param {string} text
 */
export function replaceBlockText(blocks, idx, text) {
  return blocks.map((block, i) => (i === idx ? { ...block, text } : block));
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 */
export function toggleTodoAt(blocks, idx) {
  return blocks.map((block, i) =>
    i === idx ? { ...block, checked: !block.checked } : block,
  );
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 * @param {{ type: string; key: string; label: string }} cmd
 */
export function applyBlockCommandAt(blocks, idx, cmd) {
  const current = blocks[idx];
  if (!current) return blocks;
  const rest = current.text.replace(/^\/\S+\s*/, "");
  const nextBlock = {
    ...current,
    type: cmd.type,
    text: rest,
    checked: cmd.type === BLOCK_TYPE.TODO ? false : current.checked,
  };
  return blocks.map((block, i) => (i === idx ? nextBlock : block));
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 */
export function normalizeBlockAtToParagraph(blocks, idx) {
  return blocks.map((block, i) =>
    i === idx ? { ...block, type: BLOCK_TYPE.PARAGRAPH, checked: false } : block,
  );
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 * @param {number} caret
 */
export function splitBlockAtCaret(blocks, idx, caret) {
  const current = blocks[idx];
  if (!current) return null;
  const head = current.text.slice(0, caret);
  const tail = current.text.slice(caret);
  const currentNext = { ...current, text: head };
  const inserted = createBlock(nextBlockTypeOnEnter(current.type), tail, {
    checked: false,
  });
  const next = [...blocks.slice(0, idx), currentNext, inserted, ...blocks.slice(idx + 1)];
  return { next, inserted, head, tail };
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 */
export function mergeBlockWithPrevious(blocks, idx) {
  if (idx <= 0) return null;
  const current = blocks[idx];
  const prev = blocks[idx - 1];
  if (!current || !prev) return null;
  const joiner = prev.type === BLOCK_TYPE.CODE ? "\n" : prev.text && current.text ? " " : "";
  const merged = { ...prev, text: `${prev.text}${joiner}${current.text}` };
  const next = [...blocks];
  next[idx - 1] = merged;
  next.splice(idx, 1);
  return { next, merged, prevTextLength: prev.text.length };
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} from
 * @param {number} to
 */
export function moveBlock(blocks, from, to) {
  if (from === to) return blocks;
  if (from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * @param {NoteBlock[]} blocks
 * @param {number} idx
 */
export function insertParagraphAfter(blocks, idx) {
  const inserted = createBlock(BLOCK_TYPE.PARAGRAPH, "");
  const next = [...blocks.slice(0, idx + 1), inserted, ...blocks.slice(idx + 1)];
  return { next, inserted };
}
