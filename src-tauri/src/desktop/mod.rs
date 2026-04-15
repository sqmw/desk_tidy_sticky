#[cfg(target_os = "macos")]
pub(crate) use panel::apply_macos_runtime_dock_icon;
#[cfg(target_os = "macos")]
pub(crate) use panel::PANEL_WINDOW_LABELS;
pub(crate) use panel::{
    ensure_hidden_workspace_runtime_window, hide_panel_window, minimize_panel_window,
    show_and_focus_window, show_preferred_panel_window, sync_panel_window_shell_state,
};
pub(crate) use sticky::{
    apply_note_window_layer, apply_overlay_input_state, apply_window_no_snap_by_label,
    get_overlay_interaction, move_note_window_without_activation, pin_window_to_desktop,
    sync_all_note_window_layers, sync_note_window_layer, toggle_overlay_interaction,
    toggle_wallpaper_layer_and_apply, toggle_z_order_and_apply, unpin_window_from_desktop,
};
pub(crate) use tray::{build_tray, update_tray_texts};

mod panel;
mod sticky;
mod tray;
