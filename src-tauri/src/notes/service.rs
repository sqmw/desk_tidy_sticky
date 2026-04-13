use crate::notes::compat::flutter_legacy;
use crate::notes::domain::{normalize_tags, sort_notes};
use crate::notes::repository::{
    self as notes_repository, merged_notes_from_context, persist_current_and_verify,
    persist_legacy_file, upsert_current_note,
};
use crate::notes::Note;

pub use crate::notes::domain::NoteSortMode;

fn load_notes_from_file() -> Result<Vec<Note>, String> {
    let mut context = notes_repository::load_notes_context()?;
    let merged_notes = merged_notes_from_context(&context);
    if let Err(err) = notes_repository::migrate_legacy_batch(
        &mut context,
        notes_repository::LEGACY_MIGRATION_BATCH_SIZE,
    ) {
        eprintln!("[note_compat] incremental legacy migration failed: {}", err);
    }
    Ok(merged_notes)
}

fn save_notes_to_file(notes: &[Note]) -> Result<(), String> {
    notes_repository::save_current_notes(notes)
}

fn mutate_note<F>(id: &str, sort_mode: Option<NoteSortMode>, mutate: F) -> Result<Vec<Note>, String>
where
    F: FnOnce(&mut Note),
{
    let mut context = notes_repository::load_notes_context()?;

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
    let mut context = notes_repository::load_notes_context()?;
    context.current_notes.retain(|note| note.id != id);
    save_notes_to_file(&context.current_notes)?;
    for legacy_file in &mut context.legacy_files {
        legacy_file.notes.retain(|note| note.id != id);
        persist_legacy_file(legacy_file)?;
    }
    Ok(())
}

pub fn empty_trash() -> Result<(), String> {
    let mut context = notes_repository::load_notes_context()?;
    context.current_notes.retain(|note| !note.is_deleted);
    save_notes_to_file(&context.current_notes)?;
    for legacy_file in &mut context.legacy_files {
        legacy_file.notes.retain(|note| !note.is_deleted);
        persist_legacy_file(legacy_file)?;
    }
    Ok(())
}

pub fn reorder_notes(reordered: Vec<(String, i32)>, is_archived_view: bool) -> Result<(), String> {
    let mut context = notes_repository::load_notes_context()?;
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
        if let Some((file_index, note_index)) =
            context
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
