use crate::desktop::apply_note_window_frost;
use crate::notes::{assets as note_assets, service as notes_service, Note, NoteSortMode};
use tauri::{Emitter, LogicalPosition, Manager};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct NotesChangedEvent {
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    note_id: Option<String>,
    window_layer_changed: bool,
}

fn emit_notes_changed(app: &tauri::AppHandle) {
    emit_notes_changed_event(
        app,
        NotesChangedEvent {
            kind: "full",
            note_id: None,
            window_layer_changed: true,
        },
    );
}

fn emit_notes_changed_event(app: &tauri::AppHandle, payload: NotesChangedEvent) {
    let _ = app.emit("notes_changed", payload);
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
pub fn add_done_log(
    app: tauri::AppHandle,
    text: String,
    sort_mode: String,
    tags: Option<Vec<String>>,
    completed_at: Option<String>,
) -> Result<Vec<Note>, String> {
    let notes = notes_service::add_done_log(
        text,
        parse_sort_mode(sort_mode.as_str()),
        tags,
        completed_at,
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
pub fn update_note_size(
    app: tauri::AppHandle,
    id: String,
    width: f64,
    height: f64,
    emit_event: Option<bool>,
) -> Result<(), String> {
    notes_service::update_note_size(&id, width, height)?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(())
}

#[tauri::command]
pub fn persist_note_window_size(
    app: tauri::AppHandle,
    id: String,
    emit_event: Option<bool>,
) -> Result<(), String> {
    let label = format!("note-{}", id);
    let Some(window) = app.get_webview_window(label.as_str()) else {
        return Ok(());
    };
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let raw_scale = window.scale_factor().map_err(|e| e.to_string())?;
    let scale = if raw_scale.is_finite() && raw_scale > 0.0 {
        raw_scale
    } else {
        1.0
    };
    let width = (size.width as f64 / scale).max(220.0);
    let height = (size.height as f64 / scale).max(220.0);
    notes_service::update_note_size(&id, width, height)?;
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
    emit_notes_changed_event(
        &app,
        NotesChangedEvent {
            kind: "text",
            note_id: Some(id),
            window_layer_changed: false,
        },
    );
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
    let _ = apply_note_window_frost(app.clone(), format!("note-{}", id), frost);
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

fn resolve_primary_monitor_bounds(app: &tauri::AppHandle) -> Result<(f64, f64, f64, f64), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .or_else(|| {
            app.available_monitors()
                .ok()
                .and_then(|mut items| items.drain(..).next())
        })
        .ok_or_else(|| "no monitor available".to_string())?;
    let scale = {
        let raw = monitor.scale_factor();
        if raw.is_finite() && raw > 0.0 {
            raw
        } else {
            1.0
        }
    };
    let position = monitor.position();
    let size = monitor.size();
    Ok((
        position.x as f64 / scale,
        position.y as f64 / scale,
        size.width as f64 / scale,
        size.height as f64 / scale,
    ))
}

#[tauri::command]
pub fn reset_pinned_note_positions(app: tauri::AppHandle) -> Result<usize, String> {
    let (screen_x, screen_y, screen_width, screen_height) = resolve_primary_monitor_bounds(&app)?;
    let margin = 36.0;
    let gap = 18.0;
    let default_width = 300.0;
    let default_height = 300.0;
    let min_size = 220.0;
    let max_width = (screen_width - margin * 2.0).max(min_size);
    let max_height = (screen_height - margin * 2.0).max(min_size);
    let mut next_x = screen_x + margin;
    let mut next_y = screen_y + margin;
    let mut row_height = 0.0;

    let notes = notes_service::reset_pinned_note_positions(|note| {
        let width = note
            .width
            .unwrap_or(default_width)
            .clamp(min_size, max_width);
        let height = note
            .height
            .unwrap_or(default_height)
            .clamp(min_size, max_height);

        if next_x + width > screen_x + screen_width - margin {
            next_x = screen_x + margin;
            next_y += row_height + gap;
            row_height = 0.0;
        }

        if next_y + height > screen_y + screen_height - margin {
            next_y = screen_y + margin;
        }

        let position = (next_x, next_y);
        next_x += width + gap;
        row_height = row_height.max(height);
        position
    })?;

    let recovered_count = notes
        .iter()
        .filter(|note| note.is_pinned && !note.is_archived && !note.is_deleted)
        .count();

    for note in notes
        .iter()
        .filter(|note| note.is_pinned && !note.is_archived && !note.is_deleted)
    {
        let Some(window) = app.get_webview_window(format!("note-{}", note.id).as_str()) else {
            continue;
        };
        let x = note.x.unwrap_or(screen_x + margin);
        let y = note.y.unwrap_or(screen_y + margin);
        let _ = window.set_position(LogicalPosition::new(x, y));
    }

    emit_notes_changed(&app);
    Ok(recovered_count)
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
