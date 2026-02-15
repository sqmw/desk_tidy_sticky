use crate::notes_service::{NoteSortMode, NoteViewMode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AppLocale {
    #[serde(rename = "en")]
    En,
    #[serde(rename = "zh")]
    Zh,
}

impl AppLocale {
    pub fn from_str(s: &str) -> Self {
        if s == "zh" {
            AppLocale::Zh
        } else {
            AppLocale::En
        }
    }
    pub fn as_str(&self) -> &'static str {
        match self {
            AppLocale::En => "en",
            AppLocale::Zh => "zh",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PanelPreferences {
    #[serde(default = "default_true")]
    pub hide_after_save: bool,
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
    #[serde(default = "default_workspace_theme")]
    pub workspace_theme: String,
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
    #[serde(default = "default_pomodoro_mini_break_postpone_minutes")]
    pub pomodoro_mini_break_postpone_minutes: i32,
    #[serde(default = "default_pomodoro_long_break_postpone_minutes")]
    pub pomodoro_long_break_postpone_minutes: i32,
    #[serde(default = "default_pomodoro_break_postpone_limit")]
    pub pomodoro_break_postpone_limit: i32,
    #[serde(default = "default_false")]
    pub pomodoro_break_strict_mode: bool,
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
fn default_glass() -> f64 {
    0.18
}
fn default_workspace_theme() -> String {
    "light".to_string()
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
fn default_pomodoro_mini_break_postpone_minutes() -> i32 {
    5
}
fn default_pomodoro_long_break_postpone_minutes() -> i32 {
    10
}
fn default_pomodoro_break_postpone_limit() -> i32 {
    3
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

pub fn read_show_panel_on_startup() -> bool {
    let path = match prefs_path() {
        Ok(p) => p,
        Err(_) => return false,
    };
    if !path.exists() {
        return false;
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return false,
    };
    let prefs: PanelPreferences = match serde_json::from_str(&content) {
        Ok(p) => p,
        Err(_) => return false,
    };
    prefs.show_panel_on_startup
}

pub fn read_last_panel_window() -> String {
    let path = match prefs_path() {
        Ok(p) => p,
        Err(_) => return "main".to_string(),
    };
    if !path.exists() {
        return "main".to_string();
    }
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return "main".to_string(),
    };
    let prefs: PanelPreferences = match serde_json::from_str(&content) {
        Ok(p) => p,
        Err(_) => return "main".to_string(),
    };
    match prefs.last_panel_window.as_str() {
        "workspace" => "workspace".to_string(),
        _ => "main".to_string(),
    }
}

pub fn prefs_path() -> Result<std::path::PathBuf, String> {
    let dir = directories::ProjectDirs::from("com", "desk_tidy", "desk_tidy_sticky")
        .map(|d| d.data_dir().to_path_buf())
        .ok_or_else(|| "Could not determine data directory".to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("preferences.json"))
}

impl PanelPreferences {
    pub fn get_view_mode(&self) -> NoteViewMode {
        match self.view_mode.as_str() {
            "archived" => NoteViewMode::Archived,
            "trash" => NoteViewMode::Trash,
            _ => NoteViewMode::Active,
        }
    }
    pub fn set_view_mode(&mut self, mode: NoteViewMode) {
        self.view_mode = match mode {
            NoteViewMode::Active => "active".to_string(),
            NoteViewMode::Archived => "archived".to_string(),
            NoteViewMode::Trash => "trash".to_string(),
        };
    }
    pub fn get_sort_mode(&self) -> NoteSortMode {
        match self.sort_mode.as_str() {
            "newest" => NoteSortMode::Newest,
            "oldest" => NoteSortMode::Oldest,
            _ => NoteSortMode::Custom,
        }
    }
    pub fn set_sort_mode(&mut self, mode: NoteSortMode) {
        self.sort_mode = match mode {
            NoteSortMode::Custom => "custom".to_string(),
            NoteSortMode::Newest => "newest".to_string(),
            NoteSortMode::Oldest => "oldest".to_string(),
        };
    }
    pub fn get_locale(&self) -> AppLocale {
        AppLocale::from_str(&self.language)
    }
    pub fn set_locale(&mut self, locale: AppLocale) {
        self.language = locale.as_str().to_string();
    }
}
