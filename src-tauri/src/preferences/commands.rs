use crate::preferences::{model, PanelPreferences};

#[tauri::command]
pub fn get_preferences() -> Result<PanelPreferences, String> {
    model::read_preferences()
}

#[tauri::command]
pub fn set_preferences(prefs: PanelPreferences) -> Result<(), String> {
    model::write_preferences(&prefs)
}
