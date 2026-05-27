use crate::runtime::paths;
use base64::Engine;
use std::fs;
use std::path::Path;
use uuid::Uuid;

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

pub(crate) fn sanitize_note_id(note_id: &str) -> String {
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

fn copy_image_into_assets(note_id: &str, source_path: &Path, ext: &str) -> Result<String, String> {
    let now = chrono::Utc::now();
    let assets_dir = paths::data_dir()?
        .join("assets")
        .join(now.format("%Y").to_string())
        .join(now.format("%m").to_string());
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let file_name = format!(
        "{}-{}-{}.{}",
        sanitize_note_id(note_id),
        now.timestamp_millis(),
        Uuid::new_v4().as_simple(),
        ext
    );
    let path = assets_dir.join(file_name);
    fs::copy(source_path, &path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
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
    let ext = image_extension_from_mime(mime_type);
    let now = chrono::Utc::now();
    let assets_dir = paths::data_dir()?
        .join("assets")
        .join(now.format("%Y").to_string())
        .join(now.format("%m").to_string());
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;
    let path = assets_dir.join(format!(
        "{}-{}-{}.{}",
        sanitize_note_id(note_id),
        now.timestamp_millis(),
        Uuid::new_v4().as_simple(),
        ext
    ));
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn import_local_image(note_id: &str, source_path: &Path) -> Result<String, String> {
    let ext = source_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().trim_start_matches('.'))
        .filter(|value| !value.is_empty())
        .unwrap_or("png");
    copy_image_into_assets(note_id, source_path, ext)
}
