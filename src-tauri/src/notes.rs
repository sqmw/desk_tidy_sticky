use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const DEFAULT_NOTE_OPACITY: f64 = 1.0;
pub const DEFAULT_NOTE_FROST: f64 = 0.22;
pub const DEFAULT_NOTE_TEXT_COLOR: &str = "#1f2937";

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
            bg_color: None,
            text_color: Some(DEFAULT_NOTE_TEXT_COLOR.to_string()),
            opacity: Some(DEFAULT_NOTE_OPACITY),
            frost: Some(DEFAULT_NOTE_FROST),
            custom_order: None,
            x: None,
            y: None,
            width: None,
            height: None,
        }
    }
}

pub fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}
