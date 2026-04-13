use crate::preferences::{model, PanelPreferences};

#[tauri::command]
pub fn get_preferences() -> Result<PanelPreferences, String> {
    let path = model::prefs_path()?;
    if !path.exists() {
        return Ok(PanelPreferences::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_preferences(prefs: PanelPreferences) -> Result<(), String> {
    let path = model::prefs_path()?;
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
