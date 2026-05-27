use crate::preferences::{read_preferences, write_preferences, PanelPreferences};
use crate::runtime::paths;
use serde::Serialize;
use std::path::{Path, PathBuf};

pub const STORAGE_MODE_APP_DEFAULT: &str = "app_default";
pub const STORAGE_MODE_CUSTOM_DIRECTORY: &str = "custom_directory";
const DEFAULT_MARKDOWN_ROOT_DIR: &str = "markdown";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownStorageDirectories {
    pub root: String,
    pub notes: String,
    pub review: String,
    pub attachments: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownStorageSnapshot {
    pub mode: String,
    pub configured_root: String,
    pub default_root: String,
    pub resolved_root: String,
    pub status: String,
    pub message: String,
    pub directories: MarkdownStorageDirectories,
}

pub fn default_storage_mode() -> String {
    STORAGE_MODE_APP_DEFAULT.to_string()
}

pub fn default_storage_root() -> String {
    String::new()
}

pub fn normalize_storage_mode(input: &str) -> String {
    match input.trim() {
        STORAGE_MODE_CUSTOM_DIRECTORY => STORAGE_MODE_CUSTOM_DIRECTORY.to_string(),
        _ => STORAGE_MODE_APP_DEFAULT.to_string(),
    }
}

pub fn normalize_storage_root(input: &str) -> String {
    input.trim().to_string()
}

fn default_root_path() -> Result<PathBuf, String> {
    Ok(paths::data_dir()?.join(DEFAULT_MARKDOWN_ROOT_DIR))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn derive_directories(root: &Path) -> MarkdownStorageDirectories {
    MarkdownStorageDirectories {
        root: path_to_string(root),
        notes: path_to_string(&root.join("notes")),
        review: path_to_string(&root.join("review")),
        attachments: path_to_string(&root.join("attachments")),
    }
}

fn resolve_root_path(mode: &str, configured_root: &str) -> Result<PathBuf, String> {
    match normalize_storage_mode(mode).as_str() {
        STORAGE_MODE_CUSTOM_DIRECTORY => {
            let trimmed = normalize_storage_root(configured_root);
            if trimmed.is_empty() {
                return Err("Custom Markdown directory cannot be empty".to_string());
            }
            Ok(PathBuf::from(trimmed))
        }
        _ => default_root_path(),
    }
}

fn validate_root_shape(root: &Path) -> Result<(String, String), String> {
    if root.exists() {
        if !root.is_dir() {
            return Err(
                "Selected Markdown storage path is an existing file, not a directory".to_string(),
            );
        }
        return Ok((
            "ready".to_string(),
            "Markdown storage directory is ready.".to_string(),
        ));
    }
    Ok((
        "missing".to_string(),
        "Markdown storage directory does not exist yet. It will be created when applied."
            .to_string(),
    ))
}

pub fn ensure_storage_directories(root: &Path) -> Result<(), String> {
    std::fs::create_dir_all(root).map_err(|e| e.to_string())?;
    for child in ["notes", "review", "attachments"] {
        std::fs::create_dir_all(root.join(child)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn snapshot_from_preferences() -> Result<MarkdownStorageSnapshot, String> {
    let prefs = read_preferences()?;
    snapshot_from_values(&prefs.markdown_storage_mode, &prefs.markdown_storage_root)
}

pub fn snapshot_from_values(
    mode: &str,
    configured_root: &str,
) -> Result<MarkdownStorageSnapshot, String> {
    let normalized_mode = normalize_storage_mode(mode);
    let normalized_root = if normalized_mode == STORAGE_MODE_CUSTOM_DIRECTORY {
        normalize_storage_root(configured_root)
    } else {
        String::new()
    };
    let resolved_root = resolve_root_path(&normalized_mode, &normalized_root)?;
    let (status, message) = validate_root_shape(&resolved_root)?;
    let default_root = default_root_path()?;
    Ok(MarkdownStorageSnapshot {
        mode: normalized_mode,
        configured_root: normalized_root,
        default_root: path_to_string(&default_root),
        resolved_root: path_to_string(&resolved_root),
        status,
        message,
        directories: derive_directories(&resolved_root),
    })
}

pub fn apply_storage_preferences(
    mode: &str,
    configured_root: &str,
) -> Result<MarkdownStorageSnapshot, String> {
    let normalized_mode = normalize_storage_mode(mode);
    let normalized_root = if normalized_mode == STORAGE_MODE_CUSTOM_DIRECTORY {
        normalize_storage_root(configured_root)
    } else {
        String::new()
    };
    let resolved_root = resolve_root_path(&normalized_mode, &normalized_root)?;
    ensure_storage_directories(&resolved_root)?;

    let mut prefs: PanelPreferences = read_preferences().unwrap_or_default();
    prefs.markdown_storage_mode = normalized_mode.clone();
    prefs.markdown_storage_root = normalized_root.clone();
    write_preferences(&prefs)?;

    snapshot_from_values(&normalized_mode, &normalized_root)
}
