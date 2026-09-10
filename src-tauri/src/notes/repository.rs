use crate::notes::{compat::flutter_legacy, domain::normalize_note_review_semantics, Note};
use crate::runtime::paths;
use std::fs;
#[cfg(test)]
use std::io;
use crate::runtime::atomic_file::write_bytes_atomically;
#[cfg(test)]
use crate::runtime::atomic_file::write_bytes_atomically_with;
use std::path::{Path, PathBuf};
#[cfg(test)]
use uuid::Uuid;

pub(crate) const LEGACY_MIGRATION_BATCH_SIZE: usize = 12;
pub(crate) const RECOVERY_REQUIRED_ERROR_CODE: &str = "recovery_required";

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

pub(crate) fn notes_data_directory() -> Result<PathBuf, String> {
    let dir = paths::data_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn notes_file() -> Result<PathBuf, String> {
    Ok(notes_data_directory()?.join("notes.json"))
}

pub(crate) fn read_notes_from_path(path: &Path) -> Result<Vec<Note>, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let raw: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    // Accept the historical envelope, but never repair or skip current records.
    let items = if raw.is_array() { raw } else {
        raw.get("notes").filter(|v| v.is_array()).cloned()
            .ok_or_else(|| "notes json must contain an array".to_string())?
    };
    let notes: Vec<Note> = serde_json::from_value(items).map_err(|e| e.to_string())?;
    let mut ids = std::collections::HashSet::new();
    if notes.iter().any(|note| note.id.trim().is_empty() || !ids.insert(note.id.clone())) {
        return Err("notes contain an empty or duplicate id".into());
    }
    Ok(notes)
}

fn backup_path(path: &Path) -> PathBuf {
    path.with_extension("json.bak")
}


fn recovery_required_error(path: &Path, error: impl std::fmt::Display) -> String {
    eprintln!(
        "[notes_storage] unable to read {}: {}",
        path.display(),
        error
    );
    format!(
        "{}: notes storage could not be read; writing is disabled until it is recovered",
        RECOVERY_REQUIRED_ERROR_CODE
    )
}

fn backup_current_notes(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    read_notes_from_path(path).map_err(|error| recovery_required_error(path, error))?;
    let previous_content = fs::read(path).map_err(|e| e.to_string())?;
    write_bytes_atomically(&backup_path(path), &previous_content)
}

pub(crate) fn write_notes_to_path(path: &Path, notes: &[Note]) -> Result<(), String> {
    backup_current_notes(path)?;
    let content = serde_json::to_vec_pretty(notes).map_err(|e| e.to_string())?;
    write_bytes_atomically(path, &content)
}

pub(crate) fn save_current_notes(notes: &[Note]) -> Result<(), String> {
    let path = notes_file()?;
    write_notes_to_path(&path, notes)
}

fn load_current_notes(path: &Path) -> Result<Vec<Note>, String> {
    if !path.exists() {
        return Ok(vec![]);
    }
    match read_notes_from_path(path) {
        Ok(mut notes) => {
            let mut changed = false;
            for note in &mut notes {
                changed |= normalize_note_review_semantics(note);
            }
            if changed {
                write_notes_to_path(path, &notes)?;
            }
            Ok(notes)
        }
        Err(error) => Err(recovery_required_error(path, error)),
    }
}

pub(crate) fn load_notes_context() -> Result<NotesContext, String> {
    let current_path = notes_file()?;
    let current_notes = load_current_notes(&current_path)?;
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
    let mut note = context.legacy_files[legacy_file_index]
        .notes
        .get(legacy_note_index)
        .cloned()
        .ok_or_else(|| "legacy note not found during migration".to_string())?;
    normalize_note_review_semantics(&mut note);

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partially_malformed_current_notes_block_rewrites() {
        let dir = std::env::temp_dir().join(format!("desk-tidy-strict-{}", Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("notes.json");
        let valid = Note::new("keep me".into(), false);
        for bad in [serde_json::json!("bad record"), serde_json::json!({"id":"broken", "text":77})] {
            let raw = serde_json::to_vec(&serde_json::json!([valid, bad])).unwrap();
            fs::write(&path, &raw).unwrap();
            assert!(load_current_notes(&path).unwrap_err().starts_with(RECOVERY_REQUIRED_ERROR_CODE));
            assert!(write_notes_to_path(&path, &[]).is_err());
            assert_eq!(fs::read(&path).unwrap(), raw);
        }
        let envelope = serde_json::to_vec(&serde_json::json!({"notes":[valid]})).unwrap();
        fs::write(&path, envelope).unwrap();
        assert_eq!(read_notes_from_path(&path).unwrap().len(), 1);
        fs::remove_dir_all(dir).unwrap();
    }

    fn test_directory() -> PathBuf {
        let path =
            std::env::temp_dir().join(format!("desk-tidy-notes-repository-{}", Uuid::new_v4()));
        fs::create_dir_all(&path).expect("create test directory");
        path
    }

    #[test]
    fn unreadable_current_json_is_not_replaced() {
        let directory = test_directory();
        let path = directory.join("notes.json");
        let original = b"{ this is not valid json";
        fs::write(&path, original).expect("write invalid fixture");

        let error = load_current_notes(&path).expect_err("invalid json must require recovery");
        assert!(error.starts_with(RECOVERY_REQUIRED_ERROR_CODE));
        assert_eq!(fs::read(&path).expect("read invalid fixture"), original);
        assert!(!backup_path(&path).exists());
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn failed_replacement_keeps_existing_file() {
        let directory = test_directory();
        let path = directory.join("notes.json");
        let original = b"existing content";
        fs::write(&path, original).expect("write existing fixture");

        let error = write_bytes_atomically_with(&path, b"next content", |_, _| {
            Err(io::Error::other("replace failed"))
        })
        .expect_err("replace failure should be surfaced");

        assert!(error.contains("replace failed"));
        assert_eq!(fs::read(&path).expect("read existing fixture"), original);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn successful_write_keeps_last_valid_backup() {
        let directory = test_directory();
        let path = directory.join("notes.json");
        let first = Note::new("first".to_string(), false);
        let second = Note::new("second".to_string(), false);

        write_notes_to_path(&path, std::slice::from_ref(&first)).expect("write first note");
        write_notes_to_path(&path, std::slice::from_ref(&second)).expect("write second note");

        let backup = read_notes_from_path(&backup_path(&path)).expect("read backup");
        assert_eq!(backup.len(), 1);
        assert_eq!(backup[0].id, first.id);
        let current = read_notes_from_path(&path).expect("read current notes");
        assert_eq!(current.len(), 1);
        assert_eq!(current[0].id, second.id);
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn legacy_migration_persists_the_note_before_removing_legacy_copy() {
        let directory = test_directory();
        let current_path = directory.join("notes.json");
        let legacy_path = directory.join("legacy-notes.json");
        let legacy_note = Note::new("legacy note".to_string(), false);
        let mut context = NotesContext {
            current_path: current_path.clone(),
            current_notes: Vec::new(),
            legacy_files: vec![LegacyNotesFile {
                path: legacy_path,
                notes: vec![legacy_note.clone()],
            }],
        };

        migrate_legacy_batch(&mut context, 1).expect("migrate legacy note");

        let current = read_notes_from_path(&current_path).expect("read migrated notes");
        assert_eq!(current.len(), 1);
        assert_eq!(current[0].id, legacy_note.id);
        assert!(context.legacy_files[0].notes.is_empty());
        let _ = fs::remove_dir_all(directory);
    }
}
