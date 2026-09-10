use crate::preferences::{model, PanelPreferences};

#[tauri::command]
pub fn get_preferences() -> Result<PanelPreferences, String> {
    model::read_preferences()
}

#[tauri::command]
pub fn set_preferences(updates: serde_json::Value) -> Result<PanelPreferences, String> {
    model::patch_preferences(updates)
}
