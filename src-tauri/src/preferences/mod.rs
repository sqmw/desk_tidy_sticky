mod commands;
pub(crate) mod model;

pub(crate) use commands::{get_preferences, set_preferences};
pub(crate) use model::{
    read_last_panel_window, read_preferences, read_show_panel_on_startup, write_preferences,
    PanelPreferences,
};
