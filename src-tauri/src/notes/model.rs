use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const DEFAULT_NOTE_OPACITY: f64 = 1.0;
pub const DEFAULT_NOTE_FROST: f64 = 0.22;
pub const DEFAULT_NOTE_TEXT_COLOR: &str = "#1f2937";
pub const RECORD_KIND_NOTE: &str = "note";
pub const RECORD_KIND_DONE_LOG: &str = "done_log";
pub const AUTO_HIDE_STATE_VISIBLE: &str = "visible";
pub const AUTO_HIDE_STATE_HIDDEN: &str = "hidden";
pub const AUTO_HIDE_REASON_OVERFLOW: &str = "overflow";
pub const AUTO_HIDE_REASON_SHORTCUT: &str = "shortcut";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub text: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub is_done: bool,
    pub is_deleted: bool,
    pub is_always_on_top: bool,
    #[serde(default)]
    pub is_wallpaper: bool,
    #[serde(default = "default_record_kind")]
    pub record_kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<u8>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bg_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opacity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_order: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f64>,
    #[serde(default)]
    pub auto_hide_enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_edge: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_state: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_visible_x: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_visible_y: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_hidden_x: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auto_hide_hidden_y: Option<f64>,
}

impl Note {
    pub fn new(text: String, is_pinned: bool) -> Self {
        let now = chrono_now();
        Self {
            id: Uuid::new_v4().to_string(),
            text,
            created_at: now.clone(),
            updated_at: now,
            is_pinned,
            is_archived: false,
            is_done: false,
            is_deleted: false,
            // New notes start at desktop-bottom layer by default.
            is_always_on_top: false,
            is_wallpaper: false,
            record_kind: default_record_kind(),
            completed_at: None,
            priority: None,
            tags: vec![],
            bg_color: None,
            text_color: Some(DEFAULT_NOTE_TEXT_COLOR.to_string()),
            opacity: Some(DEFAULT_NOTE_OPACITY),
            frost: Some(DEFAULT_NOTE_FROST),
            custom_order: None,
            x: None,
            y: None,
            width: None,
            height: None,
            auto_hide_enabled: false,
            auto_hide_edge: None,
            auto_hide_state: None,
            auto_hide_reason: None,
            auto_hide_visible_x: None,
            auto_hide_visible_y: None,
            auto_hide_hidden_x: None,
            auto_hide_hidden_y: None,
        }
    }
}

pub fn default_record_kind() -> String {
    RECORD_KIND_NOTE.to_string()
}

pub fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}
