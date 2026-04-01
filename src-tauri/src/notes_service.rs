use crate::note_compat::flutter_legacy;
use crate::notes::Note;
use base64::Engine;
use serde_json;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const LEGACY_MIGRATION_BATCH_SIZE: usize = 12;

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

fn read_notes_from_path(path: &Path) -> Result<Vec<Note>, String> {
    flutter_legacy::load_notes_best_effort(path)
}

fn write_notes_to_path(path: &Path, notes: &[Note]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(notes).map_err(|e| e.to_string())?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    if let Err(rename_err) = fs::rename(&temp_path, path) {
        if path.exists() {
            fs::remove_file(path).map_err(|remove_err| {
                format!(
                    "failed to replace notes file after rename error (rename: {}, remove: {})",
                    rename_err, remove_err
                )
            })?;
            fs::rename(&temp_path, path).map_err(|retry_err| {
                format!(
                    "failed to replace notes file after removing target (initial rename: {}, retry: {})",
                    rename_err, retry_err
                )
            })?;
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err(rename_err.to_string());
        }
    }
    Ok(())
}

fn load_notes_from_file() -> Result<Vec<Note>, String> {
    let mut context = load_notes_context()?;
    let merged_notes = merged_notes_from_context(&context);
    if let Err(err) = migrate_legacy_batch(&mut context, LEGACY_MIGRATION_BATCH_SIZE) {
        eprintln!("[note_compat] incremental legacy migration failed: {}", err);
    }
    Ok(merged_notes)
}

fn save_notes_to_file(notes: &[Note]) -> Result<(), String> {
    let path = notes_file()?;
    write_notes_to_path(&path, notes)
}

#[derive(Debug, Clone)]
struct LegacyNotesFile {
    path: PathBuf,
    notes: Vec<Note>,
}

#[derive(Debug, Clone)]
struct NotesContext {
    current_path: PathBuf,
    current_notes: Vec<Note>,
    legacy_files: Vec<LegacyNotesFile>,
}

fn load_current_notes(path: &Path) -> Vec<Note> {
    if !path.exists() {
        return vec![];
    }
    match read_notes_from_path(path) {
        Ok(notes) => notes,
        Err(err) => {
            eprintln!(
                "[note_compat] failed to read current notes from {}: {}",
                path.display(),
                err
            );
            vec![]
        }
    }
}

fn load_notes_context() -> Result<NotesContext, String> {
    let current_path = notes_file()?;
    let current_notes = load_current_notes(&current_path);
    let legacy_paths = flutter_legacy::existing_legacy_notes_files(&current_path);
    let mut legacy_files = Vec::new();

    for legacy_path in legacy_paths {
        match flutter_legacy::load_legacy_notes(&legacy_path) {
            Ok(notes) => legacy_files.push(LegacyNotesFile {
                path: legacy_path,
                notes,
            }),
            Err(err) => {
                eprintln!(
                    "[note_compat] failed to load legacy notes from {}: {}",
                    legacy_path.display(),
                    err
                );
            }
        }
    }

    Ok(NotesContext {
        current_path,
        current_notes,
        legacy_files,
    })
}

fn merged_notes_from_context(context: &NotesContext) -> Vec<Note> {
    let mut merged_notes = context.current_notes.clone();
    for legacy_file in &context.legacy_files {
        merged_notes = flutter_legacy::merge_with_current(&merged_notes, &legacy_file.notes);
    }
    let (deduped_notes, _) = flutter_legacy::dedupe_notes(merged_notes);
    deduped_notes
}

fn persist_current_and_verify(context: &NotesContext) -> Result<(), String> {
    write_notes_to_path(&context.current_path, &context.current_notes)?;
    let reloaded = read_notes_from_path(&context.current_path)?;
    let expected_ids: std::collections::HashSet<&str> =
        context.current_notes.iter().map(|note| note.id.as_str()).collect();
    let reloaded_ids: std::collections::HashSet<&str> =
        reloaded.iter().map(|note| note.id.as_str()).collect();
    if expected_ids != reloaded_ids {
        return Err("reloaded tauri notes mismatch after migration".to_string());
    }
    Ok(())
}

fn persist_legacy_file(legacy: &LegacyNotesFile) -> Result<(), String> {
    if legacy.notes.is_empty() {
        if legacy.path.exists() {
            fs::remove_file(&legacy.path).map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    flutter_legacy::save_legacy_notes(&legacy.path, &legacy.notes)
}

fn migrate_legacy_note_to_current(
    context: &mut NotesContext,
    legacy_file_index: usize,
    legacy_note_index: usize,
) -> Result<(), String> {
    let note = context.legacy_files[legacy_file_index]
        .notes
        .get(legacy_note_index)
        .cloned()
        .ok_or_else(|| "legacy note not found during migration".to_string())?;

    if !context.current_notes.iter().any(|current| current.id == note.id) {
        context.current_notes.push(note);
        let (deduped, _) = flutter_legacy::dedupe_notes(context.current_notes.clone());
        context.current_notes = deduped;
        persist_current_and_verify(context)?;
    }

    context.legacy_files[legacy_file_index]
        .notes
        .remove(legacy_note_index);
    persist_legacy_file(&context.legacy_files[legacy_file_index])?;
    Ok(())
}

fn migrate_legacy_batch(context: &mut NotesContext, limit: usize) -> Result<(), String> {
    if limit == 0 {
        return Ok(());
    }
    let mut remaining = limit;
    let mut file_index = 0;
    while file_index < context.legacy_files.len() && remaining > 0 {
        while !context.legacy_files[file_index].notes.is_empty() && remaining > 0 {
            migrate_legacy_note_to_current(context, file_index, 0)?;
            remaining -= 1;
        }
        file_index += 1;
    }
    Ok(())
}

fn upsert_current_note(context: &mut NotesContext, note: Note) {
    if let Some(existing) = context.current_notes.iter_mut().find(|current| current.id == note.id) {
        *existing = note;
        return;
    }
    context.current_notes.push(note);
}

fn mutate_note<F>(
    id: &str,
    sort_mode: Option<NoteSortMode>,
    mutate: F,
) -> Result<Vec<Note>, String>
where
    F: FnOnce(&mut Note),
{
    let mut context = load_notes_context()?;

    if let Some(note) = context.current_notes.iter_mut().find(|note| note.id == id) {
        mutate(note);
    } else {
        let mut migrated_note = None;
        let mut legacy_hit = None;
        'outer: for (file_index, legacy_file) in context.legacy_files.iter().enumerate() {
            for (note_index, note) in legacy_file.notes.iter().enumerate() {
                if note.id == id {
                    migrated_note = Some(note.clone());
                    legacy_hit = Some((file_index, note_index));
                    break 'outer;
                }
            }
        }

        if let Some((file_index, note_index)) = legacy_hit {
            let mut note = migrated_note.ok_or_else(|| "legacy note lookup failed".to_string())?;
            mutate(&mut note);
            upsert_current_note(&mut context, note);
            let (deduped, _) = flutter_legacy::dedupe_notes(context.current_notes.clone());
            context.current_notes = deduped;
            persist_current_and_verify(&context)?;
            context.legacy_files[file_index].notes.remove(note_index);
            persist_legacy_file(&context.legacy_files[file_index])?;
        }
    }

    if let Some(mode) = sort_mode {
        sort_notes(&mut context.current_notes, mode);
    }
    save_notes_to_file(&context.current_notes)?;
    Ok(merged_notes_from_context(&context))
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

fn normalize_tags(input: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for raw in input {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        let normalized = trimmed.trim_start_matches('#').trim().to_string();
        if normalized.is_empty() {
            continue;
        }
        let exists = out
            .iter()
            .any(|item| item.eq_ignore_ascii_case(normalized.as_str()));
        if exists {
            continue;
        }
        out.push(normalized);
    }
    out
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
    priority: Option<u8>,
    tags: Option<Vec<String>>,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if sort_mode == NoteSortMode::Custom {
        for n in notes.iter_mut() {
            n.custom_order = Some(n.custom_order.unwrap_or(0) + 1);
        }
    }
    let mut note = Note::new(text, is_pinned);
    note.priority = priority.map(|v| v.clamp(1, 4));
    note.tags = normalize_tags(tags.unwrap_or_default());
    note.custom_order = Some(0);
    notes.insert(0, note);
    sort_notes(&mut notes, sort_mode);
    save_notes_to_file(&notes)?;
    Ok(notes)
}

pub fn update_note_tags(
    id: &str,
    tags: Vec<String>,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let safe = normalize_tags(tags);
    mutate_note(id, Some(sort_mode), |n| {
        n.tags = safe;
        n.updated_at = chrono_now();
    })
}

pub fn update_note(mut updated: Note, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    updated.updated_at = crate::notes::chrono_now();
    let id = updated.id.clone();
    mutate_note(&id, Some(sort_mode), |n| {
        *n = updated;
    })
}

fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}

pub fn update_note_position(id: &str, x: f64, y: f64) -> Result<(), String> {
    let _ = mutate_note(id, None, |n| {
        n.x = Some(x);
        n.y = Some(y);
    })?;
    Ok(())
}

pub fn update_note_text(
    id: &str,
    text: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.text = text;
        n.updated_at = chrono_now();
    })
}

pub fn update_note_color(
    id: &str,
    color: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.bg_color = Some(color);
        n.updated_at = chrono_now();
    })
}

pub fn update_note_text_color(
    id: &str,
    color: String,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.text_color = Some(color);
        n.updated_at = chrono_now();
    })
}

pub fn update_note_opacity(
    id: &str,
    opacity: f64,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let clamped = opacity.clamp(0.35, 1.0);
    mutate_note(id, Some(sort_mode), |n| {
        n.opacity = Some(clamped);
        n.updated_at = chrono_now();
    })
}

pub fn update_note_frost(
    id: &str,
    frost: f64,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let clamped = frost.clamp(0.0, 1.0);
    mutate_note(id, Some(sort_mode), |n| {
        n.frost = Some(clamped);
        n.updated_at = chrono_now();
    })
}

pub fn update_note_priority(
    id: &str,
    priority: u8,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    let safe = priority.clamp(1, 4);
    mutate_note(id, Some(sort_mode), |n| {
        n.priority = Some(safe);
        n.updated_at = chrono_now();
    })
}

pub fn clear_note_priority(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.priority = None;
        n.updated_at = chrono_now();
    })
}

pub fn toggle_pin(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_pinned = !n.is_pinned;
    })
}

pub fn toggle_z_order(id: &str, _sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, None, |n| {
        n.is_always_on_top = !n.is_always_on_top;
        if n.is_always_on_top {
            n.is_wallpaper = false;
        }
    })
}

pub fn toggle_wallpaper_layer(id: &str, _sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, None, |n| {
        n.is_wallpaper = !n.is_wallpaper;
        if n.is_wallpaper {
            n.is_always_on_top = false;
        }
    })
}

pub fn toggle_done(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_done = !n.is_done;
    })
}

pub fn toggle_archive(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_archived = !n.is_archived;
        if n.is_archived {
            n.is_pinned = false;
        }
    })
}

pub fn delete_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_deleted = true;
        n.is_pinned = false;
    })
}

pub fn restore_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_deleted = false;
        n.is_pinned = false;
    })
}

pub fn permanently_delete_note(id: &str) -> Result<(), String> {
    let mut context = load_notes_context()?;
    context.current_notes.retain(|note| note.id != id);
    save_notes_to_file(&context.current_notes)?;
    for legacy_file in &mut context.legacy_files {
        legacy_file.notes.retain(|note| note.id != id);
        persist_legacy_file(legacy_file)?;
    }
    Ok(())
}

pub fn empty_trash() -> Result<(), String> {
    let mut context = load_notes_context()?;
    context.current_notes.retain(|note| !note.is_deleted);
    save_notes_to_file(&context.current_notes)?;
    for legacy_file in &mut context.legacy_files {
        legacy_file.notes.retain(|note| !note.is_deleted);
        persist_legacy_file(legacy_file)?;
    }
    Ok(())
}

pub fn reorder_notes(reordered: Vec<(String, i32)>, is_archived_view: bool) -> Result<(), String> {
    let mut context = load_notes_context()?;
    for (id, order) in reordered {
        if let Some(n) = context.current_notes.iter_mut().find(|x| x.id == id) {
            let in_view = if is_archived_view {
                n.is_archived && !n.is_deleted
            } else {
                !n.is_archived && !n.is_deleted
            };
            if in_view {
                n.custom_order = Some(order);
            }
            continue;
        }
        if let Some((file_index, note_index)) = context
            .legacy_files
            .iter()
            .enumerate()
            .find_map(|(file_index, legacy_file)| {
                legacy_file
                    .notes
                    .iter()
                    .enumerate()
                    .find(|(_, note)| note.id == id)
                    .map(|(note_index, _)| (file_index, note_index))
            })
        {
            let mut note = context.legacy_files[file_index].notes[note_index].clone();
            let in_view = if is_archived_view {
                note.is_archived && !note.is_deleted
            } else {
                !note.is_archived && !note.is_deleted
            };
            if in_view {
                note.custom_order = Some(order);
                upsert_current_note(&mut context, note);
                let (deduped, _) = flutter_legacy::dedupe_notes(context.current_notes.clone());
                context.current_notes = deduped;
                persist_current_and_verify(&context)?;
                context.legacy_files[file_index].notes.remove(note_index);
                persist_legacy_file(&context.legacy_files[file_index])?;
            }
        }
    }
    save_notes_to_file(&context.current_notes)?;
    Ok(())
}
