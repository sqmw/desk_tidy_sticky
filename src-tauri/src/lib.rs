mod breaks;
mod desktop;
mod notes;
mod platform;
mod preferences;
mod runtime;

#[cfg(target_os = "macos")]
use breaks::process_break_reminder_due;
use breaks::{
    apply_break_overlay_window_traits, set_break_overlay_presentation,
    start_break_reminder_watchdog, sync_break_reminder_watchdog,
};
#[cfg(not(target_os = "macos"))]
use desktop::ensure_hidden_workspace_runtime_window;
#[cfg(target_os = "macos")]
use desktop::{apply_macos_runtime_dock_icon, ensure_hidden_workspace_runtime_window};
use desktop::{
    apply_note_window_frost, apply_note_window_layer, apply_window_no_snap_by_label,
    configure_note_panel_window, dismiss_note_window_by_label, get_overlay_interaction,
    get_shortcut_settings, hide_panel_window, initialize_shortcut_settings,
    minimize_panel_window, move_note_window_without_activation, pin_window_to_desktop,
    show_preferred_panel_window, sync_all_note_window_layers, sync_note_window_layer,
    sync_panel_window_shell_state, toggle_overlay_interaction,
    toggle_wallpaper_layer_and_apply, toggle_z_order_and_apply, unpin_window_from_desktop,
    update_shortcut_settings, update_tray_texts,
};
use notes::{
    add_done_log, add_note, clear_note_priority, delete_note, empty_trash, load_notes,
    permanently_delete_note, persist_note_window_size, reorder_notes, reset_pinned_note_positions,
    restore_note, save_clipboard_image, toggle_archive, toggle_done, toggle_pin, update_note,
    update_note_color, update_note_frost, update_note_opacity, update_note_position,
    update_note_priority, update_note_size, update_note_tags, update_note_text,
    update_note_text_color,
};
#[cfg(target_os = "windows")]
use platform::window_hwnd_isize;
use preferences::{get_preferences, set_preferences};
use runtime::{
    BreakOverlayPresentationState, BreakReminderWatchState, GlobalControlState,
    ShortcutRuntimeState,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(GlobalControlState::default())
        .manage(BreakReminderWatchState::default())
        .manage(BreakOverlayPresentationState::default())
        .manage(ShortcutRuntimeState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_preferred_panel_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    #[cfg(not(target_os = "macos"))]
    let builder = builder;

    let app = builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                #[cfg(target_os = "windows")]
                if let Some(main_window) = app.get_webview_window("main") {
                    if let Ok(Some(hwnd_isize)) = window_hwnd_isize(&main_window) {
                        let _ = platform::windows::disable_aero_snap(hwnd_isize);
                    }
                }

                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec![]),
                ));
                desktop::build_tray(app)?;

                #[cfg(target_os = "macos")]
                {
                    platform::macos::prevent_app_nap_for_runtime_timers();
                    apply_macos_runtime_dock_icon(&app.handle());
                }

                ensure_hidden_workspace_runtime_window(&app.handle());
                start_break_reminder_watchdog(&app.handle());

                // Apply show panel on startup preference (defer to ensure window exists)
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    if preferences::read_show_panel_on_startup() {
                        show_preferred_panel_window(&app_handle);
                    } else {
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                        if let Some(w) = app_handle.get_webview_window("workspace") {
                            let _ = w.hide();
                        }
                        sync_panel_window_shell_state(&app_handle);
                    }
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            load_notes,
            add_note,
            add_done_log,
            update_note,
            update_note_position,
            update_note_size,
            persist_note_window_size,
            update_note_text,
            save_clipboard_image,
            update_note_color,
            update_note_text_color,
            update_note_opacity,
            update_note_frost,
            update_note_priority,
            clear_note_priority,
            update_note_tags,
            toggle_pin,
            toggle_z_order_and_apply,
            toggle_wallpaper_layer_and_apply,
            toggle_done,
            toggle_archive,
            delete_note,
            restore_note,
            permanently_delete_note,
            empty_trash,
            reorder_notes,
            reset_pinned_note_positions,
            get_preferences,
            set_preferences,
            get_shortcut_settings,
            update_shortcut_settings,
            pin_window_to_desktop,
            unpin_window_from_desktop,
            configure_note_panel_window,
            dismiss_note_window_by_label,
            apply_note_window_layer,
            apply_note_window_frost,
            sync_note_window_layer,
            sync_all_note_window_layers,
            move_note_window_without_activation,
            apply_window_no_snap_by_label,
            update_tray_texts,
            toggle_overlay_interaction,
            get_overlay_interaction,
            apply_break_overlay_window_traits,
            set_break_overlay_presentation,
            sync_break_reminder_watchdog,
            hide_panel_window,
            minimize_panel_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    if let Err(error) = initialize_shortcut_settings(&app.handle()) {
        eprintln!("initialize shortcut settings failed: {}", error);
    }

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        match event {
            tauri::RunEvent::Reopen { .. } => {
                if let Some(state) = app_handle.try_state::<BreakReminderWatchState>() {
                    let _ = process_break_reminder_due(app_handle, state.inner());
                }
                show_preferred_panel_window(app_handle);
                return;
            }
            tauri::RunEvent::Resumed => {
                if let Some(state) = app_handle.try_state::<BreakReminderWatchState>() {
                    let _ = process_break_reminder_due(app_handle, state.inner());
                }
            }
            _ => {}
        }

        #[cfg(not(target_os = "macos"))]
        let _ = (app_handle, event);
    });
}
