use crate::runtime::paths;
use serde::{Deserialize, Serialize};

pub const DEFAULT_PANEL_SHORTCUT: &str = "Ctrl+Shift+N";
pub const DEFAULT_OVERLAY_SHORTCUT: &str = "Ctrl+Shift+O";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PanelPreferences {
    #[serde(default = "default_true")]
    pub hide_after_save: bool,
    #[serde(default)]
    pub pro_mode: bool,
    #[serde(default = "default_true")]
    pub show_sticky_toggle_on_home: bool,
    #[serde(default)]
    pub view_mode: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub sort_mode: String,
    #[serde(default = "default_glass")]
    pub glass_opacity: f64,
    #[serde(default)]
    pub overlay_enabled: bool,
    #[serde(default)]
    pub show_panel_on_startup: bool,
    #[serde(default = "default_panel_shortcut")]
    pub panel_shortcut: String,
    #[serde(default = "default_overlay_shortcut")]
    pub overlay_shortcut: String,
    #[serde(default = "default_workspace_theme")]
    pub workspace_theme: String,
    #[serde(default = "default_workspace_custom_css")]
    pub workspace_custom_css: String,
    #[serde(default = "default_workspace_theme_transition_shape")]
    pub workspace_theme_transition_shape: String,
    #[serde(default = "default_workspace_zoom")]
    pub workspace_zoom: f64,
    #[serde(default = "default_workspace_zoom_mode")]
    pub workspace_zoom_mode: String,
    #[serde(default = "default_workspace_font_size")]
    pub workspace_font_size: String,
    #[serde(default = "default_workspace_sidebar_layout_mode")]
    pub workspace_sidebar_layout_mode: String,
    #[serde(default = "default_workspace_sidebar_manual_split_ratio")]
    pub workspace_sidebar_manual_split_ratio: f64,
    #[serde(default = "default_workspace_main_tab")]
    pub workspace_main_tab: String,
    #[serde(default = "default_workspace_initial_view_mode")]
    pub workspace_initial_view_mode: String,
    #[serde(default)]
    pub workspace_sidebar_collapsed: bool,
    #[serde(default = "default_last_panel_window")]
    pub last_panel_window: String,
    #[serde(default = "default_pomodoro_focus_minutes")]
    pub pomodoro_focus_minutes: i32,
    #[serde(default = "default_pomodoro_short_break_minutes")]
    pub pomodoro_short_break_minutes: i32,
    #[serde(default = "default_pomodoro_long_break_minutes")]
    pub pomodoro_long_break_minutes: i32,
    #[serde(default = "default_pomodoro_long_break_every")]
    pub pomodoro_long_break_every: i32,
    #[serde(default = "default_pomodoro_mini_break_every_minutes")]
    pub pomodoro_mini_break_every_minutes: i32,
    #[serde(default = "default_pomodoro_mini_break_duration_seconds")]
    pub pomodoro_mini_break_duration_seconds: i32,
    #[serde(default = "default_pomodoro_long_break_every_minutes")]
    pub pomodoro_long_break_every_minutes: i32,
    #[serde(default = "default_pomodoro_long_break_duration_minutes")]
    pub pomodoro_long_break_duration_minutes: i32,
    #[serde(default = "default_pomodoro_break_notify_before_seconds")]
    pub pomodoro_break_notify_before_seconds: i32,
    #[serde(default = "default_false")]
    pub pomodoro_task_start_reminder_enabled: bool,
    #[serde(default = "default_pomodoro_task_start_reminder_lead_minutes")]
    pub pomodoro_task_start_reminder_lead_minutes: i32,
    #[serde(default = "default_true")]
    pub pomodoro_break_reminder_enabled: bool,
    #[serde(default = "default_pomodoro_mini_break_postpone_minutes")]
    pub pomodoro_mini_break_postpone_minutes: i32,
    #[serde(default = "default_pomodoro_long_break_postpone_minutes")]
    pub pomodoro_long_break_postpone_minutes: i32,
    #[serde(default = "default_pomodoro_break_postpone_limit")]
    pub pomodoro_break_postpone_limit: i32,
    #[serde(default = "default_false")]
    pub pomodoro_break_strict_mode: bool,
    #[serde(default = "default_pomodoro_break_reminder_mode")]
    pub pomodoro_break_reminder_mode: String,
    #[serde(default = "default_pomodoro_break_schedule_mode")]
    pub pomodoro_break_schedule_mode: String,
    #[serde(default = "default_pomodoro_independent_mini_break_every_minutes")]
    pub pomodoro_independent_mini_break_every_minutes: i32,
    #[serde(default = "default_pomodoro_independent_long_break_every_minutes")]
    pub pomodoro_independent_long_break_every_minutes: i32,
    #[serde(default = "default_focus_tasks_json")]
    pub focus_tasks_json: String,
    #[serde(default = "default_focus_stats_json")]
    pub focus_stats_json: String,
    #[serde(default = "default_focus_break_session_json")]
    pub focus_break_session_json: String,
}

fn default_true() -> bool {
    true
}
fn default_false() -> bool {
    false
}
fn default_panel_shortcut() -> String {
    DEFAULT_PANEL_SHORTCUT.to_string()
}
fn default_overlay_shortcut() -> String {
    DEFAULT_OVERLAY_SHORTCUT.to_string()
}
fn default_glass() -> f64 {
    0.18
}
fn default_workspace_theme() -> String {
    "light".to_string()
}
fn default_workspace_custom_css() -> String {
    "".to_string()
}
fn default_workspace_theme_transition_shape() -> String {
    "circle".to_string()
}
fn default_workspace_zoom() -> f64 {
    1.0
}
fn default_workspace_zoom_mode() -> String {
    "manual".to_string()
}
fn default_workspace_font_size() -> String {
    "medium".to_string()
}
fn default_workspace_sidebar_layout_mode() -> String {
    "auto".to_string()
}
fn default_workspace_sidebar_manual_split_ratio() -> f64 {
    0.42
}
fn default_workspace_main_tab() -> String {
    "notes".to_string()
}
fn default_workspace_initial_view_mode() -> String {
    "last".to_string()
}
fn default_last_panel_window() -> String {
    "main".to_string()
}
fn default_pomodoro_focus_minutes() -> i32 {
    25
}
fn default_pomodoro_short_break_minutes() -> i32 {
    5
}
fn default_pomodoro_long_break_minutes() -> i32 {
    15
}
fn default_pomodoro_long_break_every() -> i32 {
    4
}
fn default_pomodoro_mini_break_every_minutes() -> i32 {
    10
}
fn default_pomodoro_mini_break_duration_seconds() -> i32 {
    20
}
fn default_pomodoro_long_break_every_minutes() -> i32 {
    30
}
fn default_pomodoro_long_break_duration_minutes() -> i32 {
    5
}
fn default_pomodoro_break_notify_before_seconds() -> i32 {
    10
}
fn default_pomodoro_task_start_reminder_lead_minutes() -> i32 {
    10
}
fn default_pomodoro_mini_break_postpone_minutes() -> i32 {
    5
}
fn default_pomodoro_long_break_postpone_minutes() -> i32 {
    10
}
fn default_pomodoro_break_postpone_limit() -> i32 {
    3
}
fn default_pomodoro_break_reminder_mode() -> String {
    "panel".to_string()
}
fn default_pomodoro_break_schedule_mode() -> String {
    "task".to_string()
}
fn default_pomodoro_independent_mini_break_every_minutes() -> i32 {
    10
}
fn default_pomodoro_independent_long_break_every_minutes() -> i32 {
    30
}
fn default_focus_tasks_json() -> String {
    "[]".to_string()
}
fn default_focus_stats_json() -> String {
    "{}".to_string()
}
fn default_focus_break_session_json() -> String {
    "{\"mode\":\"none\",\"untilTs\":0}".to_string()
}

pub fn read_preferences() -> Result<PanelPreferences, String> {
    let path = prefs_path()?;
    if !path.exists() {
        return Ok(PanelPreferences::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn write_preferences(prefs: &PanelPreferences) -> Result<(), String> {
    let path = prefs_path()?;
    let content = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

pub fn read_show_panel_on_startup() -> bool {
    read_preferences()
        .map(|prefs| prefs.show_panel_on_startup)
        .unwrap_or(false)
}

pub fn read_last_panel_window() -> String {
    let prefs = match read_preferences() {
        Ok(prefs) => prefs,
        Err(_) => return "main".to_string(),
    };
    match prefs.last_panel_window.as_str() {
        "workspace" => "workspace".to_string(),
        _ => "main".to_string(),
    }
}

pub fn prefs_path() -> Result<std::path::PathBuf, String> {
    let dir = paths::data_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("preferences.json"))
}
