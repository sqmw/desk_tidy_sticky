use crate::notes::Note;
use chrono::Utc;
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub mod flutter_legacy {
    use super::*;

    fn pick_value<'a>(obj: &'a Map<String, Value>, keys: &[&str]) -> Option<&'a Value> {
        for key in keys {
            if let Some(value) = obj.get(*key) {
                return Some(value);
            }
        }
        None
    }

    fn pick_string(obj: &Map<String, Value>, keys: &[&str]) -> Option<String> {
        let value = pick_value(obj, keys)?;
        if let Some(s) = value.as_str() {
            let text = s.trim();
            return if text.is_empty() {
                None
            } else {
                Some(text.to_string())
            };
        }
        if let Some(n) = value.as_i64() {
            return Some(n.to_string());
        }
        if let Some(n) = value.as_u64() {
            return Some(n.to_string());
        }
        if let Some(n) = value.as_f64() {
            return Some(n.to_string());
        }
        None
    }

    fn pick_bool(obj: &Map<String, Value>, keys: &[&str], fallback: bool) -> bool {
        pick_value(obj, keys)
            .and_then(Value::as_bool)
            .unwrap_or(fallback)
    }

    fn value_to_i32(value: &Value) -> Option<i32> {
        if let Some(v) = value.as_i64() {
            return i32::try_from(v).ok();
        }
        if let Some(v) = value.as_u64() {
            return i32::try_from(v).ok();
        }
        if let Some(v) = value.as_f64() {
            if v.is_finite() {
                return i32::try_from(v.round() as i64).ok();
            }
        }
        if let Some(v) = value.as_str() {
            return v.trim().parse::<i32>().ok();
        }
        None
    }

    fn pick_i32(obj: &Map<String, Value>, keys: &[&str]) -> Option<i32> {
        pick_value(obj, keys).and_then(value_to_i32)
    }

    fn value_to_u8(value: &Value) -> Option<u8> {
        if let Some(v) = value.as_u64() {
            return u8::try_from(v).ok();
        }
        if let Some(v) = value.as_i64() {
            return u8::try_from(v).ok();
        }
        if let Some(v) = value.as_f64() {
            if v.is_finite() {
                return u8::try_from(v.round() as i64).ok();
            }
        }
        if let Some(v) = value.as_str() {
            return v.trim().parse::<u8>().ok();
        }
        None
    }

    fn pick_u8(obj: &Map<String, Value>, keys: &[&str]) -> Option<u8> {
        pick_value(obj, keys).and_then(value_to_u8)
    }

    fn value_to_f64(value: &Value) -> Option<f64> {
        if let Some(v) = value.as_f64() {
            return Some(v);
        }
        if let Some(v) = value.as_i64() {
            return Some(v as f64);
        }
        if let Some(v) = value.as_u64() {
            return Some(v as f64);
        }
        if let Some(v) = value.as_str() {
            return v.trim().parse::<f64>().ok();
        }
        None
    }

    fn pick_f64(obj: &Map<String, Value>, keys: &[&str]) -> Option<f64> {
        pick_value(obj, keys).and_then(value_to_f64)
    }

    fn normalize_tags(value: Option<&Value>) -> Vec<String> {
        let Some(Value::Array(items)) = value else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for item in items {
            let Some(raw) = item.as_str() else {
                continue;
            };
            let cleaned = raw.trim().trim_start_matches('#').trim();
            if cleaned.is_empty() {
                continue;
            }
            if out
                .iter()
                .any(|existing: &String| existing.eq_ignore_ascii_case(cleaned))
            {
                continue;
            }
            out.push(cleaned.to_string());
        }
        out
    }

    fn normalize_note_tags(tags: &[String]) -> String {
        let mut items: Vec<String> = tags
            .iter()
            .map(|raw| raw.trim().trim_start_matches('#').to_ascii_lowercase())
            .filter(|s| !s.is_empty())
            .collect();
        items.sort();
        items.dedup();
        items.join("|")
    }

    fn fmt_opt_str(value: &Option<String>) -> String {
        value.as_deref().unwrap_or("").to_string()
    }

    fn fmt_opt_f64(value: Option<f64>) -> String {
        value
            .map(|v| format!("{:.6}", v))
            .unwrap_or_else(String::new)
    }

    fn fmt_opt_i32(value: Option<i32>) -> String {
        value.map(|v| v.to_string()).unwrap_or_else(String::new)
    }

    fn fmt_opt_u8(value: Option<u8>) -> String {
        value.map(|v| v.to_string()).unwrap_or_else(String::new)
    }

    fn dedupe_key(note: &Note) -> String {
        format!(
            "text={}|createdAt={}|updatedAt={}|pinned={}|archived={}|done={}|deleted={}|alwaysTop={}|wallpaper={}|priority={}|tags={}|bg={}|textColor={}|opacity={}|frost={}|customOrder={}|x={}|y={}|w={}|h={}",
            note.text,
            note.created_at,
            note.updated_at,
            note.is_pinned,
            note.is_archived,
            note.is_done,
            note.is_deleted,
            note.is_always_on_top,
            note.is_wallpaper,
            fmt_opt_u8(note.priority),
            normalize_note_tags(&note.tags),
            fmt_opt_str(&note.bg_color),
            fmt_opt_str(&note.text_color),
            fmt_opt_f64(note.opacity),
            fmt_opt_f64(note.frost),
            fmt_opt_i32(note.custom_order),
            fmt_opt_f64(note.x),
            fmt_opt_f64(note.y),
            fmt_opt_f64(note.width),
            fmt_opt_f64(note.height)
        )
    }

    pub fn dedupe_notes(notes: Vec<Note>) -> (Vec<Note>, usize) {
        use std::collections::HashSet;

        let original_len = notes.len();
        let mut seen = HashSet::new();
        let mut out = Vec::with_capacity(original_len);
        for note in notes {
            let key = dedupe_key(&note);
            if seen.insert(key) {
                out.push(note);
            }
        }
        let removed = original_len.saturating_sub(out.len());
        (out, removed)
    }

    fn stable_legacy_id_seed(
        obj: &Map<String, Value>,
        created_at: Option<&str>,
        updated_at: Option<&str>,
    ) -> String {
        let text = pick_string(obj, &["text", "content"]).unwrap_or_default();
        let x = pick_f64(obj, &["x"]).map(|v| v.to_string()).unwrap_or_default();
        let y = pick_f64(obj, &["y"]).map(|v| v.to_string()).unwrap_or_default();
        let width = pick_f64(obj, &["width"]).map(|v| v.to_string()).unwrap_or_default();
        let height = pick_f64(obj, &["height"]).map(|v| v.to_string()).unwrap_or_default();
        let custom_order = pick_i32(obj, &["customOrder", "custom_order"])
            .map(|v| v.to_string())
            .unwrap_or_default();

        format!(
            "text={}|createdAt={}|updatedAt={}|x={}|y={}|w={}|h={}|order={}|pinned={}|archived={}|done={}|deleted={}|alwaysTop={}|wallpaper={}",
            text,
            created_at.unwrap_or(""),
            updated_at.unwrap_or(""),
            x,
            y,
            width,
            height,
            custom_order,
            pick_bool(obj, &["isPinned", "is_pinned"], false),
            pick_bool(obj, &["isArchived", "is_archived"], false),
            pick_bool(obj, &["isDone", "is_done"], false),
            pick_bool(obj, &["isDeleted", "is_deleted"], false),
            pick_bool(obj, &["isAlwaysOnTop", "is_always_on_top"], false),
            pick_bool(obj, &["isWallpaper", "is_wallpaper"], false)
        )
    }

    fn stable_uuid_from_seed(seed: &str) -> Uuid {
        const FNV_OFFSET_BASIS: u64 = 14695981039346656037;
        const FNV_PRIME: u64 = 1099511628211;

        let mut hash_lo = FNV_OFFSET_BASIS;
        let mut hash_hi = FNV_OFFSET_BASIS ^ 0x9e3779b97f4a7c15;

        for byte in seed.as_bytes() {
            hash_lo ^= u64::from(*byte);
            hash_lo = hash_lo.wrapping_mul(FNV_PRIME);
            hash_hi ^= u64::from(*byte);
            hash_hi = hash_hi.wrapping_mul(FNV_PRIME);
        }

        let mut bytes = [0u8; 16];
        bytes[..8].copy_from_slice(&hash_hi.to_be_bytes());
        bytes[8..].copy_from_slice(&hash_lo.to_be_bytes());

        // Set UUID variant + version bits to keep a stable, UUID-like format.
        bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5 (name-based)
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

        Uuid::from_bytes(bytes)
    }

    fn note_from_value(value: &Value) -> Option<Note> {
        if let Ok(note) = serde_json::from_value::<Note>(value.clone()) {
            return Some(note);
        }

        let obj = value.as_object()?;
        let now = Utc::now().to_rfc3339();
        let created_at_raw = pick_string(obj, &["createdAt", "created_at", "created"]);
        let updated_at_raw = pick_string(obj, &["updatedAt", "updated_at", "updated"]);
        let created_at = created_at_raw.clone().unwrap_or_else(|| now.clone());
        let updated_at = updated_at_raw
            .clone()
            .unwrap_or_else(|| created_at.clone());

        Some(Note {
            id: pick_string(obj, &["id"]).unwrap_or_else(|| {
                let seed = stable_legacy_id_seed(
                    obj,
                    created_at_raw.as_deref(),
                    updated_at_raw.as_deref(),
                );
                stable_uuid_from_seed(&seed).to_string()
            }),
            text: pick_string(obj, &["text", "content"]).unwrap_or_default(),
            created_at,
            updated_at,
            is_pinned: pick_bool(obj, &["isPinned", "is_pinned"], false),
            is_archived: pick_bool(obj, &["isArchived", "is_archived"], false),
            is_done: pick_bool(obj, &["isDone", "is_done"], false),
            is_deleted: pick_bool(obj, &["isDeleted", "is_deleted"], false),
            is_always_on_top: pick_bool(obj, &["isAlwaysOnTop", "is_always_on_top"], false),
            is_wallpaper: pick_bool(obj, &["isWallpaper", "is_wallpaper"], false),
            priority: pick_u8(obj, &["priority"]).map(|v| v.clamp(1, 4)),
            tags: normalize_tags(pick_value(obj, &["tags", "tagList", "tag_list"])),
            bg_color: pick_string(obj, &["bgColor", "bg_color"]),
            text_color: pick_string(obj, &["textColor", "text_color"]),
            opacity: pick_f64(obj, &["opacity"]),
            frost: pick_f64(obj, &["frost"]),
            custom_order: pick_i32(obj, &["customOrder", "custom_order"]),
            x: pick_f64(obj, &["x"]),
            y: pick_f64(obj, &["y"]),
            width: pick_f64(obj, &["width"]),
            height: pick_f64(obj, &["height"]),
        })
    }

    #[cfg(target_os = "windows")]
    fn push_candidate(candidates: &mut Vec<PathBuf>, base_dir: &Path) {
        candidates.push(base_dir.join("notes.json"));
    }

    #[cfg(target_os = "windows")]
    fn candidate_legacy_notes_files() -> Vec<PathBuf> {
        use std::sync::OnceLock;

        static CACHED_CANDIDATES: OnceLock<Vec<PathBuf>> = OnceLock::new();
        CACHED_CANDIDATES
            .get_or_init(|| {
                let mut candidates = Vec::new();

                let mut extend_windows_roots = |root: &Path| {
                    push_candidate(&mut candidates, &root.join("desk_tidy_sticky"));
                    push_candidate(
                        &mut candidates,
                        &root.join("com.example").join("desk_tidy_sticky"),
                    );
                    push_candidate(&mut candidates, &root.join("com.sqmw").join("desk_tidy_sticky"));
                    push_candidate(&mut candidates, &root.join("sqmw").join("desk_tidy_sticky"));

                    if let Ok(entries) = fs::read_dir(root) {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if !path.is_dir() {
                                continue;
                            }
                            push_candidate(&mut candidates, &path.join("desk_tidy_sticky"));
                        }
                    }
                };

                if let Ok(appdata) = std::env::var("APPDATA") {
                    let appdata_path = PathBuf::from(appdata);
                    extend_windows_roots(&appdata_path);
                    if let Some(parent) = appdata_path.parent() {
                        extend_windows_roots(parent);
                    }
                }
                if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                    let local_appdata_path = PathBuf::from(local_appdata);
                    extend_windows_roots(&local_appdata_path);
                }
                candidates.sort();
                candidates.dedup();
                candidates
            })
            .clone()
    }

    #[cfg(not(target_os = "windows"))]
    fn candidate_legacy_notes_files() -> Vec<PathBuf> {
        Vec::new()
    }

    pub fn existing_legacy_notes_files(current_path: &Path) -> Vec<PathBuf> {
        let current = current_path.canonicalize().ok();
        candidate_legacy_notes_files()
            .into_iter()
            .filter(|candidate| {
                if !candidate.exists() {
                    return false;
                }
                let resolved = candidate.canonicalize().ok();
                match (&current, &resolved) {
                    (Some(current), Some(resolved)) => current != resolved,
                    _ => candidate != current_path,
                }
            })
            .collect()
    }

    pub fn load_notes_best_effort(path: &Path) -> Result<Vec<Note>, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let raw = serde_json::from_str::<serde_json::Value>(&content).map_err(|e| e.to_string())?;
        let items = if let Some(items) = raw.as_array() {
            items
        } else if let Some(obj) = raw.as_object() {
            obj.get("notes")
                .and_then(Value::as_array)
                .ok_or_else(|| "notes json is neither array nor object.notes array".to_string())?
        } else {
            return Err("notes json is neither array nor object.notes array".to_string());
        };

        let mut notes = Vec::with_capacity(items.len());
        for item in items {
            if let Some(note) = note_from_value(item) {
                notes.push(note);
            } else {
                eprintln!(
                    "[note_compat] skip malformed note from {}: unable to map item to Note",
                    path.display()
                );
            }
        }
        Ok(notes)
    }

    pub fn load_legacy_notes(path: &Path) -> Result<Vec<Note>, String> {
        load_notes_best_effort(path)
    }

    pub fn merge_with_current(current_notes: &[Note], legacy_notes: &[Note]) -> Vec<Note> {
        let mut merged = current_notes.to_vec();
        for legacy in legacy_notes {
            if merged.iter().any(|current| current.id == legacy.id) {
                continue;
            }
            merged.push(legacy.clone());
        }
        merged
    }
}
