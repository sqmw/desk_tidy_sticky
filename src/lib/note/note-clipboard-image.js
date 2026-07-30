import { convertFileSrc } from "@tauri-apps/api/core";

/** @param {Blob} blob */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      resolve(raw.startsWith("data:") ? raw.split(",")[1] || "" : raw);
    };
    reader.onerror = () => reject(reader.error || new Error("read blob failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {{
 *   invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *   noteId: string;
 *   file: File;
 * }} input
 */
export async function saveClipboardImageMarkdown(input) {
  const dataBase64 = await blobToBase64(input.file);
  const savedPath = await input.invoke("save_clipboard_image", {
    noteId: input.noteId,
    mimeType: input.file.type || "image/png",
    dataBase64,
  });
  const imageSrc = convertFileSrc(savedPath);
  const label = `pasted-${new Date().toISOString().replaceAll(":", "-")}`;
  return `![${label}](${imageSrc})`;
}
