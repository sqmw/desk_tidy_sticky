use crate::notes::compat::flutter_legacy;
use crate::notes::domain::{normalize_tags, sort_notes};
use crate::notes::repository::{
    self as notes_repository, merged_notes_from_context, persist_current_and_verify,
    persist_legacy_file, upsert_current_note,
};
use crate::notes::{
    Note, AUTO_HIDE_STATE_HIDDEN, AUTO_HIDE_STATE_VISIBLE, RECORD_KIND_DONE_LOG, RECORD_KIND_NOTE,
};

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

fn clear_auto_hide_runtime(note: &mut Note) {
    note.auto_hide_state = None;
    note.auto_hide_edge = None;
    note.auto_hide_reason = None;
    note.auto_hide_visible_x = None;
    note.auto_hide_visible_y = None;
    note.auto_hide_hidden_x = None;
    note.auto_hide_hidden_y = None;
}

pub fn find_note(id: &str) -> Result<Option<Note>, String> {
    Ok(load_notes_from_file()?
        .into_iter()
        .find(|note| note.id == id))
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

pub fn add_done_log(
    text: String,
    sort_mode: NoteSortMode,
    tags: Option<Vec<String>>,
    completed_at: Option<String>,
) -> Result<Vec<Note>, String> {
    let mut notes = load_notes_from_file()?;
    if sort_mode == NoteSortMode::Custom {
        for n in notes.iter_mut() {
            n.custom_order = Some(n.custom_order.unwrap_or(0) + 1);
        }
    }
    let now = chrono_now();
    let completed_at = completed_at
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| now.clone());
    let mut note = Note::new(text, false);
    note.is_done = true;
    note.record_kind = RECORD_KIND_DONE_LOG.to_string();
    note.completed_at = Some(completed_at);
    note.updated_at = now;
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

pub fn update_note_size(id: &str, width: f64, height: f64) -> Result<(), String> {
    let safe_width = width.max(220.0);
    let safe_height = height.max(220.0);
    let _ = mutate_note(id, None, |n| {
        n.width = Some(safe_width);
        n.height = Some(safe_height);
    })?;
    Ok(())
}

pub fn update_note_auto_hide_enabled(
    id: &str,
    enabled: bool,
    sort_mode: NoteSortMode,
) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.auto_hide_enabled = enabled;
        if !enabled {
            clear_auto_hide_runtime(n);
        }
        n.updated_at = chrono_now();
    })
}

pub fn update_note_auto_hide_state(
    id: &str,
    edge: &str,
    state: &str,
    reason: Option<&str>,
    visible_position: Option<(f64, f64)>,
    hidden_position: Option<(f64, f64)>,
) -> Result<Note, String> {
    let notes = mutate_note(id, None, |n| {
        let edge = edge.trim();
        n.auto_hide_edge = if edge.is_empty() {
            None
        } else {
            Some(edge.to_string())
        };
        n.auto_hide_state = if state.trim().is_empty() {
            None
        } else {
            Some(state.to_string())
        };
        n.auto_hide_reason = reason
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
        if let Some((x, y)) = visible_position {
            n.auto_hide_visible_x = Some(x);
            n.auto_hide_visible_y = Some(y);
        }
        if let Some((x, y)) = hidden_position {
            n.auto_hide_hidden_x = Some(x);
            n.auto_hide_hidden_y = Some(y);
            n.x = Some(x);
            n.y = Some(y);
        } else if state == AUTO_HIDE_STATE_VISIBLE {
            if let Some((x, y)) = visible_position {
                n.x = Some(x);
                n.y = Some(y);
            }
            n.auto_hide_hidden_x = None;
            n.auto_hide_hidden_y = None;
        }
        n.updated_at = chrono_now();
    })?;
    notes
        .into_iter()
        .find(|note| note.id == id)
        .ok_or_else(|| "note not found".to_string())
}

pub fn hidden_notes() -> Result<Vec<Note>, String> {
    Ok(load_notes_from_file()?
        .into_iter()
        .filter(|note| {
            note.is_pinned
                && note.is_always_on_top
                && !note.is_archived
                && !note.is_deleted
                && note.auto_hide_state.as_deref() == Some(AUTO_HIDE_STATE_HIDDEN)
        })
        .collect())
}

pub fn reset_pinned_note_positions<F>(mut next_position: F) -> Result<Vec<Note>, String>
where
    F: FnMut(&Note) -> (f64, f64),
{
    let mut context = notes_repository::load_notes_context()?;

    if let Err(err) = notes_repository::migrate_legacy_batch(
        &mut context,
        notes_repository::LEGACY_MIGRATION_BATCH_SIZE,
    ) {
        eprintln!("[note_compat] incremental legacy migration failed: {}", err);
    }

    for note in context
        .current_notes
        .iter_mut()
        .filter(|note| note.is_pinned && !note.is_archived && !note.is_deleted)
    {
        let (x, y) = next_position(note);
        note.x = Some(x);
        note.y = Some(y);
    }

    persist_current_and_verify(&context)?;
    Ok(merged_notes_from_context(&context))
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
    let clamped = opacity.clamp(0.0, 1.0);
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
        if !n.is_pinned {
            n.auto_hide_enabled = false;
            clear_auto_hide_runtime(n);
        }
    })
}

pub fn toggle_z_order(id: &str, _sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, None, |n| {
        n.is_always_on_top = !n.is_always_on_top;
        if n.is_always_on_top {
            n.is_wallpaper = false;
        } else {
            clear_auto_hide_runtime(n);
        }
    })
}

pub fn toggle_wallpaper_layer(id: &str, _sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, None, |n| {
        n.is_wallpaper = !n.is_wallpaper;
        if n.is_wallpaper {
            n.is_always_on_top = false;
            clear_auto_hide_runtime(n);
        }
    })
}

pub fn toggle_done(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        let now = chrono_now();
        n.is_done = !n.is_done;
        if n.is_done {
            n.completed_at = Some(now.clone());
        } else {
            n.completed_at = None;
            if n.record_kind == RECORD_KIND_DONE_LOG {
                n.record_kind = RECORD_KIND_NOTE.to_string();
            }
        }
        n.updated_at = now;
    })
}

pub fn toggle_archive(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_archived = !n.is_archived;
        if n.is_archived {
            n.is_pinned = false;
            n.auto_hide_enabled = false;
            clear_auto_hide_runtime(n);
        }
    })
}

pub fn delete_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_deleted = true;
        n.is_pinned = false;
        n.auto_hide_enabled = false;
        clear_auto_hide_runtime(n);
    })
}

pub fn restore_note(id: &str, sort_mode: NoteSortMode) -> Result<Vec<Note>, String> {
    mutate_note(id, Some(sort_mode), |n| {
        n.is_deleted = false;
        n.is_pinned = false;
        n.auto_hide_enabled = false;
        clear_auto_hide_runtime(n);
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
