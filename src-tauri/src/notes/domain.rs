use crate::notes::{Note, RECORD_KIND_DONE_LOG, RECORD_KIND_NOTE};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NoteSortMode {
    Custom,
    Newest,
    Oldest,
}

pub(crate) fn sort_notes(notes: &mut [Note], mode: NoteSortMode) {
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

pub(crate) fn normalize_tags(input: Vec<String>) -> Vec<String> {
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

pub(crate) fn normalize_note_review_semantics(note: &mut Note) -> bool {
    let mut changed = false;

    let normalized_kind = if note.record_kind == RECORD_KIND_DONE_LOG {
        RECORD_KIND_DONE_LOG
    } else {
        RECORD_KIND_NOTE
    };
    if note.record_kind != normalized_kind {
        note.record_kind = normalized_kind.to_string();
        changed = true;
    }

    if note.is_done {
        if note
            .completed_at
            .as_deref()
            .map(|value| value.trim().is_empty())
            .unwrap_or(true)
        {
            let fallback = if !note.updated_at.trim().is_empty() {
                note.updated_at.clone()
            } else {
                note.created_at.clone()
            };
            note.completed_at = Some(fallback);
            changed = true;
        }
    } else {
        if note.completed_at.is_some() {
            note.completed_at = None;
            changed = true;
        }
        if note.record_kind == RECORD_KIND_DONE_LOG {
            note.record_kind = RECORD_KIND_NOTE.to_string();
            changed = true;
        }
    }

    changed
}
