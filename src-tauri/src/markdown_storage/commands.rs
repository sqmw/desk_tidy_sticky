use crate::markdown_storage::export::{
    export_current_notes_to_markdown as export_service, MarkdownExportSummary,
};
use crate::markdown_storage::import::{
    import_markdown_from_storage_root as import_service,
    preview_markdown_import_from_storage_root as preview_import_service,
    MarkdownImportPreviewSummary, MarkdownImportSummary,
};
use crate::markdown_storage::model::{
    apply_storage_preferences, snapshot_from_preferences, MarkdownStorageSnapshot,
};
use crate::notes::store as notes_store;

#[tauri::command]
pub fn get_markdown_storage_snapshot() -> Result<MarkdownStorageSnapshot, String> {
    snapshot_from_preferences()
}

#[tauri::command]
pub fn set_markdown_storage_preferences(
    mode: String,
    root: Option<String>,
) -> Result<MarkdownStorageSnapshot, String> {
    apply_storage_preferences(&mode, root.unwrap_or_default().as_str())
}

#[tauri::command]
pub fn export_current_notes_to_markdown(
    app: tauri::AppHandle,
) -> Result<MarkdownExportSummary, String> {
    notes_store::with_notes_store(&app, export_service)
}

#[tauri::command]
pub fn import_markdown_from_storage_root(
    app: tauri::AppHandle,
) -> Result<MarkdownImportSummary, String> {
    notes_store::with_notes_store(&app, import_service)
}

#[tauri::command]
pub fn preview_markdown_import_from_storage_root(
    app: tauri::AppHandle,
) -> Result<MarkdownImportPreviewSummary, String> {
    notes_store::with_notes_store(&app, preview_import_service)
}
