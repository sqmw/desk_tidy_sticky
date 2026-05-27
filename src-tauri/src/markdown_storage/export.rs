use crate::markdown_storage::attachments::rewrite_markdown_attachments_for_export;
use crate::markdown_storage::model::{ensure_storage_directories, snapshot_from_preferences};
use crate::notes::{self as notes_domain, Note, RECORD_KIND_DONE_LOG};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

const EXPORT_SOURCE: &str = "desk_tidy_sticky";
const EXPORT_KIND_NOTE: &str = "note";
const EXPORT_KIND_REVIEW: &str = "review";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownExportSummary {
    pub root: String,
    pub notes_dir: String,
    pub review_dir: String,
    pub attachments_dir: String,
    pub files_written: usize,
    pub note_files: usize,
    pub review_files: usize,
    pub attachments_copied: usize,
}

pub fn export_current_notes_to_markdown() -> Result<MarkdownExportSummary, String> {
    let snapshot = snapshot_from_preferences()?;
    let root = PathBuf::from(snapshot.resolved_root.clone());
    ensure_storage_directories(&root)?;

    let notes = notes_domain::service::load_notes(notes_domain::service::NoteSortMode::Custom)?;
    let exportable_notes = notes.into_iter().filter(|note| !note.is_deleted);

    let mut files_written = 0usize;
    let mut note_files = 0usize;
    let mut review_files = 0usize;
    let mut attachments_copied = 0usize;

    for note in exportable_notes {
        let export_kind = export_kind(&note);
        let target_dir = match export_kind {
            EXPORT_KIND_REVIEW => root.join("review"),
            _ => root.join("notes"),
        };
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

        let file_name = export_file_name(&note);
        let file_path = target_dir.join(file_name);
        let (content, copied) = render_markdown_document(&note, &root.join("attachments"))?;
        fs::write(&file_path, content).map_err(|e| e.to_string())?;

        files_written += 1;
        attachments_copied += copied;
        if export_kind == EXPORT_KIND_REVIEW {
            review_files += 1;
        } else {
            note_files += 1;
        }
    }

    Ok(MarkdownExportSummary {
        root: snapshot.resolved_root,
        notes_dir: snapshot.directories.notes,
        review_dir: snapshot.directories.review,
        attachments_dir: snapshot.directories.attachments,
        files_written,
        note_files,
        review_files,
        attachments_copied,
    })
}

fn render_markdown_document(
    note: &Note,
    attachments_root: &PathBuf,
) -> Result<(String, usize), String> {
    let title = derive_title(note);
    let (rewritten_body, attachments_copied) =
        rewrite_markdown_attachments_for_export(&note.id, note.text.trim_end(), attachments_root)?;
    let mut out = String::new();
    out.push_str("---\n");
    out.push_str("title: ");
    out.push_str(&yaml_scalar(&title));
    out.push('\n');
    out.push_str("note_id: ");
    out.push_str(&yaml_scalar(&note.id));
    out.push('\n');
    if note.tags.is_empty() {
        out.push_str("tags: []\n");
    } else {
        out.push_str("tags:\n");
        for tag in &note.tags {
            out.push_str("  - ");
            out.push_str(&yaml_scalar(tag));
            out.push('\n');
        }
    }
    out.push_str("created_at: ");
    out.push_str(&yaml_scalar(&note.created_at));
    out.push('\n');
    out.push_str("updated_at: ");
    out.push_str(&yaml_scalar(&note.updated_at));
    out.push('\n');
    if let Some(completed_at) = note
        .completed_at
        .as_ref()
        .filter(|value| !value.trim().is_empty())
    {
        out.push_str("completed_at: ");
        out.push_str(&yaml_scalar(completed_at));
        out.push('\n');
    }
    out.push_str("record_kind: ");
    out.push_str(&yaml_scalar(export_kind(note)));
    out.push('\n');
    out.push_str("source: ");
    out.push_str(&yaml_scalar(EXPORT_SOURCE));
    out.push('\n');
    out.push_str("---\n\n");
    out.push_str(&rewritten_body);
    out.push('\n');
    Ok((out, attachments_copied))
}

fn derive_title(note: &Note) -> String {
    note.text
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(strip_markdown_heading)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| {
            if export_kind(note) == EXPORT_KIND_REVIEW {
                "Untitled review".to_string()
            } else {
                "Untitled note".to_string()
            }
        })
}

fn strip_markdown_heading(line: &str) -> &str {
    line.trim_start_matches('#').trim()
}

fn export_kind(note: &Note) -> &'static str {
    if note.record_kind == RECORD_KIND_DONE_LOG {
        EXPORT_KIND_REVIEW
    } else {
        EXPORT_KIND_NOTE
    }
}

fn export_file_name(note: &Note) -> String {
    let timestamp = export_timestamp(&note.created_at);
    let short_id = note.id.split('-').next().unwrap_or("note");
    format!("{timestamp}-{short_id}.md")
}

fn export_timestamp(value: &str) -> String {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|ts| ts.format("%Y-%m-%d-%H%M%S").to_string())
        .unwrap_or_else(|_| "1970-01-01-000000".to_string())
}

fn yaml_scalar(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}
