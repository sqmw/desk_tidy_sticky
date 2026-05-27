export const MARKDOWN_STORAGE_MODE_APP_DEFAULT = "app_default";
export const MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY = "custom_directory";

/** @param {unknown} input */
export function normalizeMarkdownStorageMode(input) {
  return input === MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY
    ? MARKDOWN_STORAGE_MODE_CUSTOM_DIRECTORY
    : MARKDOWN_STORAGE_MODE_APP_DEFAULT;
}

/** @param {unknown} input */
export function normalizeMarkdownStorageRoot(input) {
  return typeof input === "string" ? input.trim() : "";
}

/**
 * @param {any} raw
 */
export function normalizeMarkdownStorageSnapshot(raw) {
  const mode = normalizeMarkdownStorageMode(raw?.mode);
  const configuredRoot = normalizeMarkdownStorageRoot(raw?.configuredRoot);
  const defaultRoot = typeof raw?.defaultRoot === "string" ? raw.defaultRoot : "";
  const resolvedRoot = typeof raw?.resolvedRoot === "string" ? raw.resolvedRoot : defaultRoot;
  const directories = raw?.directories && typeof raw.directories === "object" ? raw.directories : {};
  return {
    mode,
    configuredRoot,
    defaultRoot,
    resolvedRoot,
    status: typeof raw?.status === "string" ? raw.status : "missing",
    message: typeof raw?.message === "string" ? raw.message : "",
    directories: {
      root: typeof directories.root === "string" ? directories.root : resolvedRoot,
      notes: typeof directories.notes === "string" ? directories.notes : "",
      review: typeof directories.review === "string" ? directories.review : "",
      attachments: typeof directories.attachments === "string" ? directories.attachments : "",
    },
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function getMarkdownStorageSnapshot(invoke) {
  return normalizeMarkdownStorageSnapshot(await invoke("get_markdown_storage_snapshot"));
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {{ mode: string; root?: string }} input
 */
export async function setMarkdownStoragePreferences(invoke, input) {
  return normalizeMarkdownStorageSnapshot(
    await invoke("set_markdown_storage_preferences", {
      mode: normalizeMarkdownStorageMode(input?.mode),
      root: normalizeMarkdownStorageRoot(input?.root),
    }),
  );
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function exportCurrentNotesToMarkdown(invoke) {
  const raw = await invoke("export_current_notes_to_markdown");
  return {
    root: typeof raw?.root === "string" ? raw.root : "",
    notesDir: typeof raw?.notesDir === "string" ? raw.notesDir : "",
    reviewDir: typeof raw?.reviewDir === "string" ? raw.reviewDir : "",
    attachmentsDir: typeof raw?.attachmentsDir === "string" ? raw.attachmentsDir : "",
    filesWritten: Number.isFinite(raw?.filesWritten) ? raw.filesWritten : 0,
    noteFiles: Number.isFinite(raw?.noteFiles) ? raw.noteFiles : 0,
    reviewFiles: Number.isFinite(raw?.reviewFiles) ? raw.reviewFiles : 0,
    attachmentsCopied: Number.isFinite(raw?.attachmentsCopied) ? raw.attachmentsCopied : 0,
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function previewMarkdownImportFromStorageRoot(invoke) {
  const raw = await invoke("preview_markdown_import_from_storage_root");
  return {
    root: typeof raw?.root === "string" ? raw.root : "",
    filesScanned: Number.isFinite(raw?.filesScanned) ? raw.filesScanned : 0,
    filesToImport: Number.isFinite(raw?.filesToImport) ? raw.filesToImport : 0,
    filesToUpdate: Number.isFinite(raw?.filesToUpdate) ? raw.filesToUpdate : 0,
    filesWithoutNoteId: Number.isFinite(raw?.filesWithoutNoteId) ? raw.filesWithoutNoteId : 0,
    attachmentsToImport: Number.isFinite(raw?.attachmentsToImport)
      ? raw.attachmentsToImport
      : 0,
  };
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function importMarkdownFromStorageRoot(invoke) {
  const raw = await invoke("import_markdown_from_storage_root");
  return {
    root: typeof raw?.root === "string" ? raw.root : "",
    filesScanned: Number.isFinite(raw?.filesScanned) ? raw.filesScanned : 0,
    filesImported: Number.isFinite(raw?.filesImported) ? raw.filesImported : 0,
    filesUpdated: Number.isFinite(raw?.filesUpdated) ? raw.filesUpdated : 0,
    attachmentsImported: Number.isFinite(raw?.attachmentsImported)
      ? raw.attachmentsImported
      : 0,
  };
}
