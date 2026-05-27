use crate::notes::assets::{import_local_image, sanitize_note_id};
use regex::Regex;
use std::borrow::Cow;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use url::Url;

fn image_regex() -> &'static Regex {
    static IMAGE_RE: OnceLock<Regex> = OnceLock::new();
    IMAGE_RE.get_or_init(|| {
        Regex::new(r#"!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?"#)
            .expect("valid markdown image regex")
    })
}

fn is_remote_or_embedded_image(src: &str) -> bool {
    let lower = src.trim().to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("data:image/")
}

fn decode_asset_path(raw: &str) -> Option<PathBuf> {
    let value = raw.trim();
    let path_like = value
        .strip_prefix("asset://localhost/")
        .or_else(|| value.strip_prefix("asset://localhost"))
        .or_else(|| value.strip_prefix("asset://"))?;
    let decoded = urlencoding::decode(path_like).ok()?;
    let normalized = decoded.trim_start_matches('/');
    if normalized.contains(":\\") || normalized.contains(":/") {
        Some(PathBuf::from(normalized))
    } else {
        Some(PathBuf::from(format!("/{}", normalized)))
    }
}

fn decode_file_url(raw: &str) -> Option<PathBuf> {
    let parsed = Url::parse(raw.trim()).ok()?;
    parsed.to_file_path().ok()
}

fn resolve_local_image_path(src: &str, base_dir: Option<&Path>) -> Option<PathBuf> {
    let value = src.trim();
    if value.is_empty() || is_remote_or_embedded_image(value) {
        return None;
    }
    if let Some(path) = decode_asset_path(value) {
        return Some(path);
    }
    if value.to_ascii_lowercase().starts_with("file://") {
        return decode_file_url(value);
    }

    let direct = PathBuf::from(value);
    if direct.is_absolute() {
        return Some(direct);
    }

    base_dir.map(|dir| dir.join(value))
}

fn attachment_file_name(source_path: &Path) -> String {
    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(|value| {
            value
                .chars()
                .map(|ch| {
                    if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                        ch
                    } else {
                        '-'
                    }
                })
                .collect::<String>()
        })
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "attachment".to_string());
    let ext = source_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim_start_matches('.'))
        .filter(|value| !value.is_empty())
        .unwrap_or("bin");
    let mut hasher = DefaultHasher::new();
    source_path.to_string_lossy().hash(&mut hasher);
    let hash = hasher.finish();
    format!("{}-{:08x}.{}", stem, (hash & 0xffff_ffff) as u32, ext)
}

fn copy_into_export_attachments(
    note_id: &str,
    source_path: &Path,
    attachments_root: &Path,
) -> Result<Option<String>, String> {
    if !source_path.exists() || !source_path.is_file() {
        return Ok(None);
    }
    let note_dir_name = sanitize_note_id(note_id);
    let target_dir = attachments_root.join(&note_dir_name);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let target_name = attachment_file_name(source_path);
    let target_path = target_dir.join(&target_name);
    fs::copy(source_path, &target_path).map_err(|e| e.to_string())?;
    Ok(Some(format!(
        "../attachments/{}/{}",
        note_dir_name, target_name
    )))
}

fn path_to_file_url(path: &Path) -> Result<String, String> {
    Url::from_file_path(path)
        .map(|url| url.to_string())
        .map_err(|_| {
            format!(
                "Failed to convert path to file URL: {}",
                path.to_string_lossy()
            )
        })
}

fn rewrite_markdown_images<F>(body: &str, mut transform: F) -> Result<(String, usize), String>
where
    F: FnMut(&str) -> Result<Option<String>, String>,
{
    let regex = image_regex();
    let mut out = String::with_capacity(body.len());
    let mut last = 0usize;
    let mut rewrites = 0usize;

    for caps in regex.captures_iter(body) {
        let Some(m) = caps.get(0) else {
            continue;
        };
        out.push_str(&body[last..m.start()]);
        let alt = caps.get(1).map(|value| value.as_str()).unwrap_or("");
        let src = caps.get(2).map(|value| value.as_str()).unwrap_or("");
        let title = caps.get(3).map(|value| value.as_str());
        let meta = caps.get(4).map(|value| value.as_str());

        let next_src = match transform(src)? {
            Some(value) => {
                rewrites += 1;
                Cow::Owned(value)
            }
            None => Cow::Borrowed(src),
        };

        out.push_str("![");
        out.push_str(alt);
        out.push_str("](");
        out.push_str(&next_src);
        if let Some(title) = title {
            out.push_str(" \"");
            out.push_str(title);
            out.push('"');
        }
        out.push(')');
        if let Some(meta) = meta {
            out.push('{');
            out.push_str(meta);
            out.push('}');
        }

        last = m.end();
    }

    out.push_str(&body[last..]);
    Ok((out, rewrites))
}

fn count_markdown_images<F>(body: &str, mut predicate: F) -> usize
where
    F: FnMut(&str) -> bool,
{
    image_regex()
        .captures_iter(body)
        .filter_map(|caps| caps.get(2).map(|value| value.as_str()))
        .filter(|src| predicate(src))
        .count()
}

pub fn rewrite_markdown_attachments_for_export(
    note_id: &str,
    body: &str,
    attachments_root: &Path,
) -> Result<(String, usize), String> {
    rewrite_markdown_images(body, |src| {
        let Some(source_path) = resolve_local_image_path(src, None) else {
            return Ok(None);
        };
        copy_into_export_attachments(note_id, &source_path, attachments_root)
    })
}

pub fn rewrite_markdown_attachments_for_import(
    note_id: &str,
    body: &str,
    markdown_parent: &Path,
) -> Result<(String, usize), String> {
    rewrite_markdown_images(body, |src| {
        let Some(source_path) = resolve_local_image_path(src, Some(markdown_parent)) else {
            return Ok(None);
        };
        if !source_path.exists() || !source_path.is_file() {
            return Ok(None);
        }
        let imported_path = import_local_image(note_id, &source_path)?;
        let url = path_to_file_url(Path::new(&imported_path))?;
        Ok(Some(url))
    })
}

pub fn count_markdown_attachments_for_import(body: &str, markdown_parent: &Path) -> usize {
    count_markdown_images(body, |src| {
        resolve_local_image_path(src, Some(markdown_parent))
            .map(|path| path.exists() && path.is_file())
            .unwrap_or(false)
    })
}
