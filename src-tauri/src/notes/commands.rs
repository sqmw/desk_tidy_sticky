use crate::notes::{assets as note_assets, service as notes_service, Note, NoteSortMode};
use tauri::Emitter;

fn emit_notes_changed(app: &tauri::AppHandle) {
    let _ = app.emit("notes_changed", ());
}

fn parse_sort_mode(sort_mode: &str) -> NoteSortMode {
    match sort_mode {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    }
}

#[tauri::command]
pub fn load_notes(sort_mode: String) -> Result<Vec<Note>, String> {
    notes_service::load_notes(parse_sort_mode(sort_mode.as_str()))
}

#[tauri::command]
pub fn add_note(
    app: tauri::AppHandle,
    text: String,
    is_pinned: bool,
    sort_mode: String,
    priority: Option<u8>,
    tags: Option<Vec<String>>,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::add_note(
        text,
        is_pinned,
        parse_sort_mode(sort_mode.as_str()),
        priority,
        tags,
    )?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn update_note(
    app: tauri::AppHandle,
    note: Note,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::update_note(note, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn update_note_position(
    app: tauri::AppHandle,
    id: String,
    x: f64,
    y: f64,
    emit_event: Option<bool>,
) -> Result<(), String> {
    notes_service::update_note_position(&id, x, y)?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(())
}

#[tauri::command]
pub fn update_note_text(
    app: tauri::AppHandle,
    id: String,
    text: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::update_note_text(&id, text, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn save_clipboard_image(
    note_id: String,
    mime_type: String,
    data_base64: String,
) -> Result<String, String> {
    note_assets::save_clipboard_image(&note_id, &mime_type, &data_base64)
}

#[tauri::command]
pub fn update_note_color(
    app: tauri::AppHandle,
    id: String,
    color: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::update_note_color(&id, color, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn update_note_text_color(
    app: tauri::AppHandle,
    id: String,
    color: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes =
        notes_service::update_note_text_color(&id, color, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn update_note_opacity(
    app: tauri::AppHandle,
    id: String,
    opacity: f64,
    sort_mode: String,
    emit_event: Option<bool>,
) -> Result<Vec<Note>, String> {
    let notes =
        notes_service::update_note_opacity(&id, opacity, parse_sort_mode(sort_mode.as_str()))?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(notes)
}

#[tauri::command]
pub fn update_note_frost(
    app: tauri::AppHandle,
    id: String,
    frost: f64,
    sort_mode: String,
    emit_event: Option<bool>,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::update_note_frost(&id, frost, parse_sort_mode(sort_mode.as_str()))?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(notes)
}

#[tauri::command]
pub fn update_note_priority(
    app: tauri::AppHandle,
    id: String,
    priority: u8,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes =
        notes_service::update_note_priority(&id, priority, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn clear_note_priority(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::clear_note_priority(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn update_note_tags(
    app: tauri::AppHandle,
    id: String,
    tags: Vec<String>,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::update_note_tags(&id, tags, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn toggle_pin(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::toggle_pin(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn toggle_done(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::toggle_done(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn toggle_archive(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::toggle_archive(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn delete_note(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::delete_note(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn restore_note(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::restore_note(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn permanently_delete_note(app: tauri::AppHandle, id: String) -> Result<(), String> {
    notes_service::permanently_delete_note(&id)?;
    emit_notes_changed(&app);
    Ok(())
}

#[tauri::command]
pub fn empty_trash(app: tauri::AppHandle) -> Result<(), String> {
    notes_service::empty_trash()?;
    emit_notes_changed(&app);
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct ReorderItem {
    id: String,
    order: i32,
}

#[tauri::command]
pub fn reorder_notes(
    app: tauri::AppHandle,
    reordered: Vec<ReorderItem>,
    is_archived_view: bool,
) -> Result<(), String> {
    let items: Vec<(String, i32)> = reordered.into_iter().map(|r| (r.id, r.order)).collect();
    notes_service::reorder_notes(items, is_archived_view)?;
    emit_notes_changed(&app);
    Ok(())
}
