use super::model::PanelPreferences;
use crate::runtime::atomic_file::write_bytes_atomically;
use serde_json::Value;
use std::fs;
use std::path::Path;
use std::sync::Mutex;

// Every preference writer, including native shortcut/storage commands, shares this lock.
static PREFERENCES_LOCK: Mutex<()> = Mutex::new(());

fn read_unlocked(path: &Path) -> Result<(PanelPreferences, Option<Vec<u8>>), String> {
    let content = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok((PanelPreferences::default(), None)),
        Err(e) => return Err(format!("preferences_recovery_required: {e}")),
    };
    let prefs = serde_json::from_slice(&content)
        .map_err(|e| format!("preferences_recovery_required: {e}"))?;
    Ok((prefs, Some(content)))
}

pub(super) fn read(path: &Path) -> Result<PanelPreferences, String> {
    let _guard = PREFERENCES_LOCK.lock().map_err(|_| "preferences_lock_unavailable")?;
    Ok(read_unlocked(path)?.0)
}

pub(super) fn patch(path: &Path, updates: Value) -> Result<PanelPreferences, String> {
    let _guard = PREFERENCES_LOCK.lock().map_err(|_| "preferences_lock_unavailable")?;
    let (current, previous) = read_unlocked(path)?;
    let mut value = serde_json::to_value(current).map_err(|e| e.to_string())?;
    let patch = updates.as_object().ok_or("preferences patch must be an object")?;
    for (key, item) in patch {
        if value.get(key).is_none() { return Err(format!("unknown preference: {key}")); }
        value[key] = item.clone();
    }
    let next: PanelPreferences = serde_json::from_value(value).map_err(|e| e.to_string())?;
    let content = serde_json::to_vec_pretty(&next).map_err(|e| e.to_string())?;
    if let Some(bytes) = previous {
        write_bytes_atomically(&path.with_extension("json.bak"), &bytes)?;
    }
    write_bytes_atomically(path, &content)?;
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn location() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("desk-tidy-prefs-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap(); dir.join("preferences.json")
    }

    #[test]
    fn independent_writers_preserve_both_fields() {
        let path = location();
        let a = path.clone(); let b = path.clone();
        let one = std::thread::spawn(move || patch(&a, serde_json::json!({"language":"en"})).unwrap());
        let two = std::thread::spawn(move || patch(&b, serde_json::json!({"focusTasksJson":"[\"new task\"]"})).unwrap());
        one.join().unwrap(); two.join().unwrap();
        let prefs = read(&path).unwrap();
        assert_eq!(prefs.language, "en"); assert_eq!(prefs.focus_tasks_json, "[\"new task\"]");
        assert!(path.with_extension("json.bak").exists());
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn corrupt_preferences_and_invalid_patches_never_overwrite_data() {
        let path = location(); fs::write(&path, b"{broken").unwrap();
        assert!(patch(&path, serde_json::json!({"markdownStorageMode":"app_default"})).unwrap_err().starts_with("preferences_recovery_required"));
        assert_eq!(fs::read(&path).unwrap(), b"{broken");
        fs::write(&path, b"{}").unwrap();
        assert!(patch(&path, serde_json::json!({"language":33})).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"{}");
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn missing_file_uses_schema_defaults() {
        let path = location(); let prefs = read(&path).unwrap();
        assert_eq!(prefs.focus_tasks_json, "[]"); assert_eq!(prefs.workspace_zoom, 1.0);
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }
}
