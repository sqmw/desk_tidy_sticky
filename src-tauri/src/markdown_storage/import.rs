use crate::markdown_storage::attachments::{
    count_markdown_attachments_for_import, rewrite_markdown_attachments_for_import,
};
use crate::markdown_storage::model::{ensure_storage_directories, snapshot_from_preferences};
use crate::notes::repository::save_current_notes;
use crate::notes::{
    chrono_now, normalize_note_review_semantics, normalize_tags, Note, DEFAULT_NOTE_FROST,
    DEFAULT_NOTE_OPACITY, DEFAULT_NOTE_TEXT_COLOR, RECORD_KIND_DONE_LOG, RECORD_KIND_NOTE,
};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const IMPORT_KIND_NOTE: &str = "note";
const IMPORT_KIND_REVIEW: &str = "review";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownImportSummary {
    pub root: String,
    pub files_scanned: usize,
    pub files_imported: usize,
    pub files_updated: usize,
    pub attachments_imported: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownImportPreviewSummary {
    pub root: String,
    pub files_scanned: usize,
    pub files_to_import: usize,
    pub files_to_update: usize,
    pub files_without_note_id: usize,
    pub attachments_to_import: usize,
}

#[derive(Debug, Default)]
struct ParsedMarkdownDocument {
    note_id: Option<String>,
    title: Option<String>,
    tags: Vec<String>,
    created_at: Option<String>,
    updated_at: Option<String>,
    completed_at: Option<String>,
    record_kind: Option<String>,
    body: String,
}

pub fn import_markdown_from_storage_root() -> Result<MarkdownImportSummary, String> {
    let snapshot = snapshot_from_preferences()?;
    let root = PathBuf::from(snapshot.resolved_root.clone());
    ensure_storage_directories(&root)?;

    let mut notes = crate::notes::service::load_notes(crate::notes::service::NoteSortMode::Custom)?;
    let mut files_scanned = 0usize;
    let mut files_imported = 0usize;
    let mut files_updated = 0usize;
    let mut attachments_imported = 0usize;

    for (import_kind, dir) in [
        (IMPORT_KIND_NOTE, root.join("notes")),
        (IMPORT_KIND_REVIEW, root.join("review")),
    ] {
        let mut files = Vec::new();
        collect_markdown_files(&dir, &mut files)?;
        for path in files {
            files_scanned += 1;
            let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let parsed = parse_markdown_document(&raw);
            let (imported, imported_attachments) = build_imported_note(&path, import_kind, parsed)?;
            match notes.iter_mut().find(|note| note.id == imported.id) {
                Some(existing) => {
                    merge_imported_note(existing, imported);
                    files_updated += 1;
                }
                None => {
                    notes.push(imported);
                    files_imported += 1;
                }
            }
            attachments_imported += imported_attachments;
        }
    }

    save_current_notes(&notes)?;

    Ok(MarkdownImportSummary {
        root: snapshot.resolved_root,
        files_scanned,
        files_imported,
        files_updated,
        attachments_imported,
    })
}

pub fn preview_markdown_import_from_storage_root() -> Result<MarkdownImportPreviewSummary, String> {
    let snapshot = snapshot_from_preferences()?;
    let root = PathBuf::from(snapshot.resolved_root.clone());
    ensure_storage_directories(&root)?;

    let notes = crate::notes::service::load_notes(crate::notes::service::NoteSortMode::Custom)?;
    let mut files_scanned = 0usize;
    let mut files_to_import = 0usize;
    let mut files_to_update = 0usize;
    let mut files_without_note_id = 0usize;
    let mut attachments_to_import = 0usize;

    for dir in [root.join("notes"), root.join("review")] {
        let mut files = Vec::new();
        collect_markdown_files(&dir, &mut files)?;
        for path in files {
            files_scanned += 1;
            let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let parsed = parse_markdown_document(&raw);
            if parsed.note_id.is_none() {
                files_without_note_id += 1;
            }
            attachments_to_import += count_markdown_attachments_for_import(
                &parsed.body,
                path.parent().unwrap_or(Path::new(".")),
            );
            let will_update = parsed
                .note_id
                .as_ref()
                .map(|id| notes.iter().any(|note| note.id == *id))
                .unwrap_or(false);
            if will_update {
                files_to_update += 1;
            } else {
                files_to_import += 1;
            }
        }
    }

    Ok(MarkdownImportPreviewSummary {
        root: snapshot.resolved_root,
        files_scanned,
        files_to_import,
        files_to_update,
        files_without_note_id,
        attachments_to_import,
    })
}

fn collect_markdown_files(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_markdown_files(&path, out)?;
            continue;
        }
        let is_markdown = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("md"))
            .unwrap_or(false);
        if is_markdown {
            out.push(path);
        }
    }
    Ok(())
}

fn parse_markdown_document(input: &str) -> ParsedMarkdownDocument {
    let normalized = input.replace("\r\n", "\n");
    let Some(rest) = normalized.strip_prefix("---\n") else {
        return ParsedMarkdownDocument {
            body: normalized.trim().to_string(),
            ..Default::default()
        };
    };
    let Some((front_matter, body)) = rest.split_once("\n---\n") else {
        return ParsedMarkdownDocument {
            body: normalized.trim().to_string(),
            ..Default::default()
        };
    };

    let mut parsed = ParsedMarkdownDocument {
        body: body.trim().to_string(),
        ..Default::default()
    };

    let lines: Vec<&str> = front_matter.lines().collect();
    let mut index = 0usize;
    while index < lines.len() {
        let line = lines[index].trim_end();
        if let Some(value) = line.strip_prefix("note_id:") {
            parsed.note_id = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("title:") {
            parsed.title = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("created_at:") {
            parsed.created_at = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("updated_at:") {
            parsed.updated_at = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("completed_at:") {
            parsed.completed_at = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("record_kind:") {
            parsed.record_kind = normalize_optional_string(value);
            index += 1;
            continue;
        }
        if let Some(value) = line.strip_prefix("tags:") {
            let inline = value.trim();
            if inline == "[]" {
                parsed.tags = Vec::new();
                index += 1;
                continue;
            }
            let mut tags = Vec::new();
            index += 1;
            while index < lines.len() {
                let tag_line = lines[index].trim_end();
                let trimmed = tag_line.trim_start();
                if let Some(tag_value) = trimmed.strip_prefix("- ") {
                    if let Some(tag) = normalize_optional_string(tag_value) {
                        tags.push(tag);
                    }
                    index += 1;
                    continue;
                }
                break;
            }
            parsed.tags = tags;
            continue;
        }
        index += 1;
    }

    parsed
}

fn normalize_optional_string(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let unquoted = if trimmed.starts_with('\'') && trimmed.ends_with('\'') && trimmed.len() >= 2 {
        trimmed[1..trimmed.len() - 1].replace("''", "'")
    } else {
        trimmed.to_string()
    };
    let cleaned = unquoted.trim().to_string();
    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

fn build_imported_note(
    path: &Path,
    default_kind: &str,
    parsed: ParsedMarkdownDocument,
) -> Result<(Note, usize), String> {
    let ParsedMarkdownDocument {
        note_id,
        title,
        tags,
        created_at,
        updated_at,
        completed_at,
        record_kind,
        body,
    } = parsed;

    let now = chrono_now();
    let note_kind = match record_kind.as_deref().unwrap_or(default_kind) {
        IMPORT_KIND_REVIEW | RECORD_KIND_DONE_LOG => RECORD_KIND_DONE_LOG,
        _ => RECORD_KIND_NOTE,
    };
    let normalized_created_at = created_at.unwrap_or_else(|| now.clone());
    let normalized_updated_at = updated_at.unwrap_or_else(|| normalized_created_at.clone());
    let resolved_note_id = note_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let (mut text, attachments_imported) = rewrite_markdown_attachments_for_import(
        &resolved_note_id,
        &body,
        path.parent().unwrap_or(Path::new(".")),
    )?;
    if text.trim().is_empty() {
        text = title
            .clone()
            .unwrap_or_else(|| fallback_title_for_path(path, note_kind));
    }

    if let Some(title_value) = title.as_ref() {
        let body_first_line = text
            .lines()
            .map(str::trim)
            .find(|line| !line.is_empty())
            .unwrap_or("");
        if !body_first_line.eq(title_value.trim())
            && !body_first_line.eq(format!("# {}", title_value).as_str())
        {
            text = format!("# {}\n\n{}", title_value.trim(), text.trim());
        }
    }

    let mut note = Note {
        id: resolved_note_id,
        text: text.trim().to_string(),
        created_at: normalized_created_at,
        updated_at: normalized_updated_at,
        is_pinned: false,
        is_archived: false,
        is_done: note_kind == RECORD_KIND_DONE_LOG,
        is_deleted: false,
        is_always_on_top: false,
        is_wallpaper: false,
        record_kind: note_kind.to_string(),
        completed_at: if note_kind == RECORD_KIND_DONE_LOG {
            completed_at.or_else(|| Some(now.clone()))
        } else {
            None
        },
        priority: None,
        tags: normalize_tags(tags),
        bg_color: None,
        text_color: Some(DEFAULT_NOTE_TEXT_COLOR.to_string()),
        opacity: Some(DEFAULT_NOTE_OPACITY),
        frost: Some(DEFAULT_NOTE_FROST),
        custom_order: None,
        x: None,
        y: None,
        width: None,
        height: None,
    };
    normalize_note_review_semantics(&mut note);
    Ok((note, attachments_imported))
}

fn merge_imported_note(existing: &mut Note, imported: Note) {
    existing.text = imported.text;
    existing.created_at = imported.created_at;
    existing.updated_at = imported.updated_at;
    existing.is_done = imported.is_done;
    existing.record_kind = imported.record_kind;
    existing.completed_at = imported.completed_at;
    existing.tags = imported.tags;
    normalize_note_review_semantics(existing);
}

fn fallback_title_for_path(path: &Path, note_kind: &str) -> String {
    path.file_stem()
        .and_then(|value| value.to_str())
        .map(|value| value.replace('-', " "))
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| {
            if note_kind == RECORD_KIND_DONE_LOG {
                "Imported review".to_string()
            } else {
                "Imported note".to_string()
            }
        })
}
