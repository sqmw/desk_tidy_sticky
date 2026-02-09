import { BLOCK_TYPE } from "$lib/note/block-model.js";

/**
 * @param {string} type
 * @param {string} raw
 */
export function normalizeBlockInput(type, raw) {
  const base = String(raw ?? "").replaceAll("\r", "");
  if (type === BLOCK_TYPE.CODE) {
    return base;
  }
  return base.replaceAll("\n", " ");
}

/**
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.startsWith("data:") ? raw.split(",")[1] || "" : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("read blob failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {DataTransferItemList | null | undefined} items
 */
export function findPastedImageItem(items) {
  if (!items) return null;
  return Array.from(items).find((item) => item.kind === "file" && item.type.startsWith("image/")) ?? null;
}

/**
 * @param {string} imageSrc
 */
export function createPastedImageMarkdown(imageSrc) {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return `![pasted-${stamp}](${imageSrc})`;
}
