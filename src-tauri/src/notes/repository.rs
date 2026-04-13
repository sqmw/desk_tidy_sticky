use crate::notes::{compat::flutter_legacy, Note};
use crate::runtime::paths;
use std::fs;
use std::path::{Path, PathBuf};

pub(crate) const LEGACY_MIGRATION_BATCH_SIZE: usize = 12;

#[derive(Debug, Clone)]
pub(crate) struct LegacyNotesFile {
    pub(crate) path: PathBuf,
    pub(crate) notes: Vec<Note>,
}

#[derive(Debug, Clone)]
pub(crate) struct NotesContext {
    pub(crate) current_path: PathBuf,
    pub(crate) current_notes: Vec<Note>,
    pub(crate) legacy_files: Vec<LegacyNotesFile>,
}

fn notes_file() -> Result<PathBuf, String> {
    let dir = paths::data_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
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

pub(crate) fn save_current_notes(notes: &[Note]) -> Result<(), String> {
    let path = notes_file()?;
    write_notes_to_path(&path, notes)
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

pub(crate) fn load_notes_context() -> Result<NotesContext, String> {
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

pub(crate) fn merged_notes_from_context(context: &NotesContext) -> Vec<Note> {
    let mut merged_notes = context.current_notes.clone();
    for legacy_file in &context.legacy_files {
        merged_notes = flutter_legacy::merge_with_current(&merged_notes, &legacy_file.notes);
    }
    let (deduped_notes, _) = flutter_legacy::dedupe_notes(merged_notes);
    deduped_notes
}

pub(crate) fn persist_current_and_verify(context: &NotesContext) -> Result<(), String> {
    write_notes_to_path(&context.current_path, &context.current_notes)?;
    let reloaded = read_notes_from_path(&context.current_path)?;
    let expected_ids: std::collections::HashSet<&str> = context
        .current_notes
        .iter()
        .map(|note| note.id.as_str())
        .collect();
    let reloaded_ids: std::collections::HashSet<&str> =
        reloaded.iter().map(|note| note.id.as_str()).collect();
    if expected_ids != reloaded_ids {
        return Err("reloaded tauri notes mismatch after migration".to_string());
    }
    Ok(())
}

pub(crate) fn persist_legacy_file(legacy: &LegacyNotesFile) -> Result<(), String> {
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

    if !context
        .current_notes
        .iter()
        .any(|current| current.id == note.id)
    {
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

pub(crate) fn migrate_legacy_batch(context: &mut NotesContext, limit: usize) -> Result<(), String> {
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

pub(crate) fn upsert_current_note(context: &mut NotesContext, note: Note) {
    if let Some(existing) = context
        .current_notes
        .iter_mut()
        .find(|current| current.id == note.id)
    {
        *existing = note;
        return;
    }
    context.current_notes.push(note);
}
