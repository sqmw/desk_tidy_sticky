use crate::notes::Note;
use base64::Engine;
use serde_json;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NoteSortMode {
    Custom,
    Newest,
    Oldest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NoteViewMode {
    Active,
    Archived,
    Trash,
}

fn storage_dir() -> Result<PathBuf, String> {
    directories::ProjectDirs::from("com", "desk_tidy", "desk_tidy_sticky")
        .map(|d| d.data_dir().to_path_buf())
        .ok_or_else(|| "Could not determine data directory".to_string())
}

fn image_extension_from_mime(mime: &str) -> &'static str {
    match mime.trim().to_ascii_lowercase().as_str() {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/bmp" => "bmp",
        "image/svg+xml" => "svg",
        _ => "png",
    }
}

fn sanitize_note_id(note_id: &str) -> String {
    let mut out = String::new();
    for c in note_id.chars() {
        if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
            out.push(c);
        }
    }
    if out.is_empty() {
        "note".to_string()
    } else {
        out
    }
}

pub fn save_clipboard_image(
    note_id: &str,
    mime_type: &str,
    data_base64: &str,
) -> Result<String, String> {
    let cleaned = data_base64.trim();
    let payload = if cleaned.starts_with("data:") {
        cleaned
            .split_once(',')
            .map(|(_, right)| right)
            .ok_or_else(|| "invalid data url payload".to_string())?
    } else {
        cleaned
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|e| e.to_string())?;
    let now = chrono::Utc::now();
    let assets_dir = storage_dir()?
        .join("assets")
        .join(now.format("%Y").to_string())
        .join(now.format("%m").to_string());
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let ext = image_extension_from_mime(mime_type);
    let file_name = format!(
        "{}-{}-{}.{}",
        sanitize_note_id(note_id),
        now.timestamp_millis(),
        Uuid::new_v4().as_simple(),
        ext
    );
    let path = assets_dir.join(file_name);
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn notes_file() -> Result<PathBuf, String> {
    let dir = storage_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("notes.json"))
}

fn load_notes_from_file() -> Result<Vec<Note>, String> {
    let path = notes_file()?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let notes: Vec<Note> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(notes)
}

fn save_notes_to_file(notes: &[Note]) -> Result<(), String> {
    let path = notes_file()?;
    let content = serde_json::to_string_pretty(notes).map_err(|e| e.to_string())?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;
    Ok(())
}

fn sort_notes(notes: &mut [Note], mode: NoteSortMode) {
    notes.sort_by(|a, b| {
        if a.is_deleted != b.is_deleted {
            return if a.is_deleted {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Less
            };
        }
        if a.is_archived != b.is_archived {
            return if a.is_archived {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Less
            };
        }
        if a.is_pinned != b.is_pinned {
            return if b.is_pinned {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Less
            };
        }
        match mode {
            NoteSortMode::Custom => {
                let ao = a.custom_order.unwrap_or(0);
                let bo = b.custom_order.unwrap_or(0);
                ao.cmp(&bo)
            }
            NoteSortMode::Newest => b.updated_at.cmp(&a.updated_at),
            NoteSortMode::Oldest => a.updated_at.cmp(&b.updated_at),
        }
    });
}

pub fn load_notes(sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    sort_notes(&mut notes, sort_mode);
    Ok(notes)
}

pub fn add_note(
    text: String,
    is_pinned: bool,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if sort_mode == NoteSortMode::Custom {
        for n in notes.iter_mut() {
            n.custom_order = Some(n.custom_order.unwrap_or(0) + 1);
        }
    }
    let mut note = Note::new(text, is_pinned);
    note.custom_order = Some(0);
    notes.insert(0, note);
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note(mut updated: Note, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    updated.updated_at = crate::notes::chrono_now();
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == updated.id) {
        *n = updated;
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn update_note_position(id: &str, x: f64, y: f64) -> Result<(), String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.x = Some(x);
        n.y = Some(y);
    }
    save_notes_to_file(&notes)?;
    Ok(())
}

pub fn update_note_text(
    id: &str,
    text: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.text = text;
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_color(
    id: &str,
    color: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.bg_color = Some(color);
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_text_color(
    id: &str,
    color: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.text_color = Some(color);
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_opacity(
    id: &str,
    opacity: f64,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    let clamped = opacity.clamp(0.35, 1.0);
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.opacity = Some(clamped);
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_frost(
    id: &str,
    frost: f64,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    let clamped = frost.clamp(0.0, 1.0);
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.frost = Some(clamped);
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_priority(
    id: &str,
    priority: u8,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    let safe = priority.clamp(1, 4);
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.priority = Some(safe);
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn clear_note_priority(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.priority = None;
        n.updated_at = chrono_now();
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn toggle_pin(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_pinned = !n.is_pinned;
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn toggle_z_order(id: &str, _sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_always_on_top = !n.is_always_on_top;
    }
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn toggle_done(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_done = !n.is_done;
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn toggle_archive(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_archived = !n.is_archived;
        if n.is_archived {
            n.is_pinned = false;
        }
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn delete_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_deleted = true;
        n.is_pinned = false;
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn restore_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
        n.is_deleted = false;
        n.is_pinned = false;
    }
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn permanently_delete_note(id: &str) -> Result<(), String> {
    let mut notes = load_notes_from_file()?;
    notes.retain(|n| n.id != id);
    save_notes_to_file(&notes)?;
    Ok(())
}

pub fn empty_trash() -> Result<(), String> {
    let mut notes = load_notes_from_file()?;
    notes.retain(|n| !n.is_deleted);
    save_notes_to_file(&notes)?;
    Ok(())
}

pub fn reorder_notes(reordered: Vec<(String, i32)>, is_archived_view: bool) -> Result<(), String> {
    let mut notes = load_notes_from_file()?;
    for (id, order) in reordered {
        if let Some(n) = notes.iter_mut().find(|x| x.id == id) {
            let in_view = if is_archived_view {
                n.is_archived && !n.is_deleted
            } else {
                !n.is_archived && !n.is_deleted
            };
            if in_view {
                n.custom_order = Some(order);
            }
        }
    }
    save_notes_to_file(&notes)?;
    Ok(())
}
