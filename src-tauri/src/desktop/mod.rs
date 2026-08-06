#[cfg(target_os = "macos")]
pub(crate) use panel::apply_macos_runtime_dock_icon;
pub(crate) use panel::PANEL_WINDOW_LABELS;
pub(crate) use panel::{
    ensure_hidden_workspace_runtime_window, hide_panel_window, minimize_panel_window,
    show_preferred_panel_window, sync_panel_window_shell_state,
};
pub(crate) use shortcuts::{
    get_shortcut_settings, initialize_shortcut_settings, update_shortcut_settings,
};
pub(crate) use sticky::{
    apply_note_window_frost, apply_note_window_layer, apply_overlay_input_state,
    apply_window_no_snap_by_label, clear_active_topmost_editing_sticky,
    configure_note_panel_window, dismiss_note_window_by_label, get_overlay_interaction,
    hide_active_topmost_editing_sticky, hide_note_to_edge, mark_active_topmost_editing_sticky,
    move_note_window_without_activation, normalize_note_window_position, pin_window_to_desktop,
    reveal_note_from_edge, set_note_auto_hide_enabled, shortcut_hide_or_reveal,
    sync_all_note_window_layers, sync_note_window_layer, toggle_hidden_stickies,
    toggle_overlay_interaction, toggle_wallpaper_layer_and_apply, toggle_z_order_and_apply,
    unpin_window_from_desktop,
};
#[cfg(target_os = "windows")]
pub(crate) use sticky::{schedule_hidden_note_recovery, StickyDisplayRecoveryState};
pub(crate) use tray::{build_tray, update_tray_texts};

mod panel;
mod shortcuts;
mod sticky;
mod tray;
