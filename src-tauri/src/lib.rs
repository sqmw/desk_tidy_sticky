mod notes;
mod notes_service;
mod preferences;
mod windows;

use notes_service::NoteSortMode;
use preferences::PanelPreferences;
use tauri::Emitter;
use tauri::Manager;
use std::sync::{Arc, Mutex};

#[derive(Default, Clone)]
struct OverlayInputState(Arc<Mutex<bool>>);

impl OverlayInputState {
    fn toggle(&self) -> bool {
        let mut guard = self.0.lock().expect("overlay input mutex poisoned");
        *guard = !*guard;
        *guard
    }
}

fn apply_overlay_input_state(app: &tauri::AppHandle, click_through: bool) {
    // Apply to all note windows. Ignore errors (window might be closing).
    for (label, w) in app.webview_windows() {
        if label.starts_with("note-") {
            let _ = w.set_ignore_cursor_events(click_through);
        }
    }
}

fn close_all_note_windows(app: &tauri::AppHandle) {
    for (label, w) in app.webview_windows() {
        if label.starts_with("note-") {
            let _ = w.close();
        }
    }
}

#[tauri::command]
fn load_notes(sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::load_notes(mode)
}

#[tauri::command]
fn add_note(text: String, is_pinned: bool, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::add_note(text, is_pinned, mode)
}

#[tauri::command]
fn update_note(note: notes::Note, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::update_note(note, mode)
}

#[tauri::command]
fn update_note_position(id: String, x: f64, y: f64) -> Result<(), String> {
    notes_service::update_note_position(&id, x, y)
}

#[tauri::command]
fn update_note_text(
    id: String,
    text: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::update_note_text(&id, text, mode)
}

#[tauri::command]
fn toggle_pin(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::toggle_pin(&id, mode)
}

#[tauri::command]
fn toggle_z_order(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::toggle_z_order(&id, mode)
}

#[tauri::command]
fn toggle_done(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::toggle_done(&id, mode)
}

#[tauri::command]
fn toggle_archive(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::toggle_archive(&id, mode)
}

#[tauri::command]
fn delete_note(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::delete_note(&id, mode)
}

#[tauri::command]
fn restore_note(id: String, sort_mode: String) -> Result<Vec<notes::Note>, String> {
    let mode = match sort_mode.as_str() {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    };
    notes_service::restore_note(&id, mode)
}

#[tauri::command]
fn permanently_delete_note(id: String) -> Result<(), String> {
    notes_service::permanently_delete_note(&id)
}

#[tauri::command]
fn empty_trash() -> Result<(), String> {
    notes_service::empty_trash()
}

#[tauri::command]
fn reorder_notes(reordered: Vec<ReorderItem>, is_archived_view: bool) -> Result<(), String> {
    let items: Vec<(String, i32)> = reordered.into_iter().map(|r| (r.id, r.order)).collect();
    notes_service::reorder_notes(items, is_archived_view)
}

#[derive(serde::Deserialize)]
struct ReorderItem {
    id: String,
    order: i32,
}

#[tauri::command]
fn get_preferences() -> Result<PanelPreferences, String> {
    let path = preferences::prefs_path()?;
    if !path.exists() {
        return Ok(PanelPreferences::default());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_preferences(prefs: PanelPreferences) -> Result<(), String> {
    let path = preferences::prefs_path()?;
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn pin_window_to_desktop(window: tauri::WebviewWindow) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    windows::attach_to_worker_w(hwnd.0 as isize).map_err(|e| e.to_string())
}

#[tauri::command]
fn unpin_window_from_desktop(window: tauri::WebviewWindow) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    windows::detach_from_worker_w(hwnd.0 as isize).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OverlayInputState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec![]),
                ));
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;
                use tauri::image::Image;

                let show_i = MenuItem::with_id(app, "show", "Show notes", true, None::<&str>)?;
                let overlay_i =
                    MenuItem::with_id(app, "overlay", "Desktop overlay", true, None::<&str>)?;
                let new_note_i =
                    MenuItem::with_id(app, "new_note", "New note", true, None::<&str>)?;
                let overlay_input_i = MenuItem::with_id(
                    app,
                    "overlay_input",
                    "Overlay: Toggle mouse interaction",
                    true,
                    None::<&str>,
                )?;
                let overlay_close_i = MenuItem::with_id(
                    app,
                    "overlay_close",
                    "Overlay: Close",
                    true,
                    None::<&str>,
                )?;
                let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
                let menu = Menu::with_items(
                    app,
                    &[
                        &show_i,
                        &new_note_i,
                        &overlay_i,
                        &overlay_input_i,
                        &overlay_close_i,
                        &quit_i,
                    ],
                )?;

                let _tray = TrayIconBuilder::new()
                    .icon(Image::from_bytes(include_bytes!("../icons/icon.ico"))?)
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .on_menu_event(|app, event| {
                        if event.id.as_ref() == "show" {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        } else if event.id.as_ref() == "new_note" {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                                let _ = app.emit("tray_new_note", ());
                            }
                        } else if event.id.as_ref() == "overlay_input" {
                            if let Some(state) = app.try_state::<OverlayInputState>() {
                                let click_through = state.toggle();
                                apply_overlay_input_state(app, click_through);
                                let _ = app.emit("overlay_input_changed", click_through);
                            }
                        } else if event.id.as_ref() == "overlay" {
                            let _ = app.emit("tray_overlay_toggle", ());
                        } else if event.id.as_ref() == "overlay_close" {
                            close_all_note_windows(app);
                            let _ = app.emit("overlay_closed", ());
                        } else if event.id.as_ref() == "quit" {
                            app.exit(0);
                        }
                    })
                    .build(app)?;

                // Apply show panel on startup preference (defer to ensure window exists)
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    if !preferences::read_show_panel_on_startup() {
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                });
            }
            Ok(())
        })
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Ctrl+Shift+N", "Ctrl+Shift+O"])
                .expect("Failed to register shortcut")
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::{Code, Modifiers};
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyN) {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.set_focus();
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                }
                            }
                        } else if shortcut
                            .matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyO)
                        {
                            if let Some(state) = app.try_state::<OverlayInputState>() {
                                let click_through = state.toggle();
                                apply_overlay_input_state(app, click_through);
                                let _ = app.emit("overlay_input_changed", click_through);
                            }
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            load_notes,
            add_note,
            update_note,
            update_note_position,
            update_note_text,
            toggle_pin,
            toggle_z_order,
            toggle_done,
            toggle_archive,
            delete_note,
            restore_note,
            permanently_delete_note,
            empty_trash,
            reorder_notes,
            get_preferences,
            set_preferences,
            pin_window_to_desktop,
            unpin_window_from_desktop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
