#[cfg(target_os = "macos")]
mod macos_windows;
mod notes;
mod notes_service;
mod preferences;
#[cfg(target_os = "windows")]
mod windows;

use notes_service::NoteSortMode;
use preferences::PanelPreferences;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::Manager;

use std::collections::HashMap;
use tauri::menu::MenuItem;

struct TrayMenuState {
    show: MenuItem<tauri::Wry>,
    github: MenuItem<tauri::Wry>,
    toggle_stickies: MenuItem<tauri::Wry>,
    toggle_interaction: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

#[derive(Clone)]
struct OverlayInputState(Arc<Mutex<bool>>);

impl OverlayInputState {
    fn toggle(&self) -> bool {
        let mut guard = self.0.lock().expect("overlay input mutex poisoned");
        *guard = !*guard;
        *guard
    }
}

impl Default for OverlayInputState {
    fn default() -> Self {
        // Start in click-through mode so newly pinned notes follow their own z-order policy
        // and default to desktop-bottom unless explicitly set always-on-top.
        Self(Arc::new(Mutex::new(true)))
    }
}

#[tauri::command]
fn update_tray_texts(app: tauri::AppHandle, texts: HashMap<String, String>) -> Result<(), String> {
    if let Some(state) = app.try_state::<TrayMenuState>() {
        if let Some(t) = texts
            .get("trayShowMain")
            .or_else(|| texts.get("trayShowNotes"))
        {
            let _ = state.show.set_text(t);
        }
        if let Some(t) = texts.get("trayGithub") {
            let _ = state.github.set_text(t);
        }
        if let Some(t) = texts.get("trayStickiesClose") {
            let _ = state.toggle_stickies.set_text(t);
        }
        if let Some(t) = texts.get("trayStickiesShow") {
            let _ = state.toggle_stickies.set_text(t);
        }
        if let Some(t) = texts.get("trayInteraction") {
            let _ = state.toggle_interaction.set_text(t);
        }
        if let Some(t) = texts.get("trayQuit") {
            let _ = state.quit.set_text(t);
        }
    }
    Ok(())
}

fn apply_overlay_input_state(app: &tauri::AppHandle, click_through: bool) {
    let notes = notes_service::load_notes(NoteSortMode::Custom).unwrap_or_default();
    for (label, w) in app.webview_windows() {
        if label.starts_with("note-") {
            let note_id = label.trim_start_matches("note-");
            if let Some(n) = notes.iter().find(|x| x.id == note_id) {
                let _ = w.set_ignore_cursor_events(click_through);
                let _ = apply_note_window_layer_with_interaction_by_label(
                    app,
                    &label,
                    n.is_always_on_top,
                    click_through,
                );
            } else {
                let _ = w.set_ignore_cursor_events(click_through);
            }
        }
    }
}

fn emit_notes_changed(app: &tauri::AppHandle) {
    let _ = app.emit("notes_changed", ());
}

const PANEL_WINDOW_LABELS: [&str; 2] = ["main", "workspace"];

#[cfg(target_os = "macos")]
fn apply_macos_runtime_dock_icon(app: &tauri::AppHandle) {
    let Some(window) = app
        .get_webview_window("workspace")
        .or_else(|| app.get_webview_window("main"))
    else {
        return;
    };

    if let Err(error) = window.run_on_main_thread(|| {
        if let Err(error) =
            macos_windows::set_application_icon_from_png(include_bytes!("../icons/dock-icon.png"))
        {
            eprintln!("set macOS app icon failed: {}", error);
        }
    }) {
        eprintln!("schedule macOS app icon update failed: {}", error);
    }
}

fn sync_panel_window_shell_state(app: &tauri::AppHandle) {
    let mut any_visible_panel = false;
    for label in PANEL_WINDOW_LABELS {
        if let Some(window) = app.get_webview_window(label) {
            let visible = window.is_visible().unwrap_or(false);
            if visible {
                any_visible_panel = true;
            }
            let _ = window.set_skip_taskbar(!visible);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let policy = if any_visible_panel {
            tauri::ActivationPolicy::Regular
        } else {
            tauri::ActivationPolicy::Accessory
        };
        let _ = app.set_activation_policy(policy);
        if any_visible_panel {
            apply_macos_runtime_dock_icon(app);
        }
    }
}

fn show_and_focus_window(window: &tauri::WebviewWindow) {
    let _ = window.set_skip_taskbar(false);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn ensure_workspace_panel_window(app: &tauri::AppHandle) -> Option<tauri::WebviewWindow> {
    if let Some(existing) = app.get_webview_window("workspace") {
        return Some(existing);
    }
    let builder = tauri::WebviewWindowBuilder::new(
        app,
        "workspace",
        tauri::WebviewUrl::App("/workspace".into()),
    )
    .title("Desk Tidy Workspace")
    .inner_size(1024.0, 720.0)
    .center()
    .decorations(false)
    .skip_taskbar(false)
    .resizable(true)
    .maximizable(true);
    match builder.build() {
        Ok(window) => Some(window),
        Err(err) => {
            eprintln!("ensure_workspace_panel_window build failed: {}", err);
            None
        }
    }
}

fn show_preferred_panel_window(app: &tauri::AppHandle) {
    let preferred = preferences::read_last_panel_window();
    let mut shown_workspace = false;
    if preferred == "workspace" {
        if let Some(w) = ensure_workspace_panel_window(app) {
            show_and_focus_window(&w);
            shown_workspace = true;
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.hide();
            }
        }
    }

    if !shown_workspace {
        if let Some(ws) = app.get_webview_window("workspace") {
            let _ = ws.hide();
        }
        if let Some(main) = app.get_webview_window("main") {
            show_and_focus_window(&main);
        }
    }

    sync_panel_window_shell_state(app);
}

#[tauri::command]
fn hide_panel_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    let target = if label == "workspace" {
        "workspace"
    } else {
        "main"
    };
    if let Some(window) = app.get_webview_window(target) {
        let _ = window.hide();
        let _ = window.set_skip_taskbar(true);
    }
    sync_panel_window_shell_state(&app);
    Ok(())
}

fn parse_sort_mode(sort_mode: &str) -> NoteSortMode {
    match sort_mode {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    }
}

#[cfg(target_os = "windows")]
fn window_hwnd_isize(window: &tauri::WebviewWindow) -> Result<Option<isize>, String> {
    match window.hwnd() {
        Ok(v) => Ok(Some(v.0 as isize)),
        Err(e) => {
            let msg = e.to_string();
            if msg
                .to_lowercase()
                .contains("underlying handle is not available")
            {
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn window_ns_window_ptr(
    window: &tauri::WebviewWindow,
) -> Result<Option<*mut std::ffi::c_void>, String> {
    match window.ns_window() {
        Ok(v) => Ok(Some(v)),
        Err(e) => {
            let msg = e.to_string();
            let normalized = msg.to_lowercase();
            if normalized.contains("underlying handle is not available")
                || normalized.contains("invalid window handle")
            {
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn run_macos_window_op(
    window: &tauri::WebviewWindow,
    op_name: &'static str,
    op: impl FnOnce(*mut std::ffi::c_void) -> Result<(), String> + Send + 'static,
) -> Result<(), String> {
    let Some(ns_window_ptr) = window_ns_window_ptr(window)? else {
        return Ok(());
    };
    let ns_window_addr = ns_window_ptr as usize;
    window
        .run_on_main_thread(move || {
            let ptr = ns_window_addr as *mut std::ffi::c_void;
            if let Err(error) = op(ptr) {
                eprintln!("{op_name} failed: {error}");
            }
        })
        .map_err(|e| e.to_string())
}

fn apply_note_window_layer_with_interaction_by_label(
    app: &tauri::AppHandle,
    label: &str,
    is_always_on_top: bool,
    click_through: bool,
) -> Result<(), String> {
    let Some(w) = app.get_webview_window(label) else {
        return Ok(());
    };

    #[cfg(any(
        target_os = "windows",
        all(not(target_os = "windows"), not(target_os = "macos"))
    ))]
    let should_be_top = !click_through || is_always_on_top;

    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&w)? else {
            return Ok(());
        };
        if should_be_top {
            let _ = w.set_always_on_top(true);
            windows::detach_from_worker_w(hwnd_isize)?;
            windows::set_topmost_no_activate(hwnd_isize, true)?;
        } else {
            let _ = w.set_always_on_top(false);
            windows::set_topmost_no_activate(hwnd_isize, false)?;
            windows::attach_to_worker_w(hwnd_isize)?;
        }
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        // Keep macOS behavior aligned with Windows:
        // interaction ON => all stickies temporarily go to topmost interactive layer.
        let should_be_top = !click_through || is_always_on_top;
        if should_be_top {
            run_macos_window_op(
                &w,
                "macos_detach_from_desktop",
                macos_windows::detach_from_worker_w,
            )?;
            run_macos_window_op(&w, "macos_set_topmost_true", |ptr| {
                macos_windows::set_topmost_no_activate(ptr, true)
            })?;
        } else {
            run_macos_window_op(&w, "macos_set_topmost_false", |ptr| {
                macos_windows::set_topmost_no_activate(ptr, false)
            })?;
            run_macos_window_op(
                &w,
                "macos_attach_to_wallpaper_layer",
                move |ptr| {
                    macos_windows::attach_to_wallpaper_layer_with_interaction(ptr, click_through)
                },
            )?;
        }
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = w.set_always_on_top(should_be_top);
        Ok(())
    }
}

fn get_overlay_click_through(app: &tauri::AppHandle) -> bool {
    if let Some(state) = app.try_state::<OverlayInputState>() {
        if let Ok(guard) = state.0.lock() {
            return *guard;
        }
    }
    true
}

#[tauri::command]
fn load_notes(sort_mode: String) -> Result<Vec<notes::Note>, String> {
    notes_service::load_notes(parse_sort_mode(sort_mode.as_str()))
}

#[tauri::command]
fn add_note(
    app: tauri::AppHandle,
    text: String,
    is_pinned: bool,
    sort_mode: String,
    priority: Option<u8>,
    tags: Option<Vec<String>>,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::add_note(
        text,
        is_pinned,
        parse_sort_mode(sort_mode.as_str()),
        priority,
        tags,
    )?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn update_note(
    app: tauri::AppHandle,
    note: notes::Note,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::update_note(note, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn update_note_position(app: tauri::AppHandle, id: String, x: f64, y: f64) -> Result<(), String> {
    notes_service::update_note_position(&id, x, y)?;
    emit_notes_changed(&app);
    Ok(())
}

#[tauri::command]
fn update_note_text(
    app: tauri::AppHandle,
    id: String,
    text: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::update_note_text(&id, text, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn save_clipboard_image(
    note_id: String,
    mime_type: String,
    data_base64: String,
) -> Result<String, String> {
    notes_service::save_clipboard_image(&note_id, &mime_type, &data_base64)
}

#[tauri::command]
fn update_note_color(
    app: tauri::AppHandle,
    id: String,
    color: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::update_note_color(&id, color, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn update_note_text_color(
    app: tauri::AppHandle,
    id: String,
    color: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes =
        notes_service::update_note_text_color(&id, color, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn update_note_opacity(
    app: tauri::AppHandle,
    id: String,
    opacity: f64,
    sort_mode: String,
    emit_event: Option<bool>,
) -> Result<Vec<notes::Note>, String> {
    let notes =
        notes_service::update_note_opacity(&id, opacity, parse_sort_mode(sort_mode.as_str()))?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(notes)
}

#[tauri::command]
fn update_note_frost(
    app: tauri::AppHandle,
    id: String,
    frost: f64,
    sort_mode: String,
    emit_event: Option<bool>,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::update_note_frost(&id, frost, parse_sort_mode(sort_mode.as_str()))?;
    if emit_event.unwrap_or(true) {
        emit_notes_changed(&app);
    }
    Ok(notes)
}

#[tauri::command]
fn update_note_priority(
    app: tauri::AppHandle,
    id: String,
    priority: u8,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes =
        notes_service::update_note_priority(&id, priority, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn clear_note_priority(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::clear_note_priority(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn update_note_tags(
    app: tauri::AppHandle,
    id: String,
    tags: Vec<String>,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::update_note_tags(&id, tags, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn toggle_pin(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::toggle_pin(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn toggle_done(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::toggle_done(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn toggle_archive(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::toggle_archive(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn delete_note(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::delete_note(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn restore_note(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::restore_note(&id, parse_sort_mode(sort_mode.as_str()))?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn permanently_delete_note(app: tauri::AppHandle, id: String) -> Result<(), String> {
    notes_service::permanently_delete_note(&id)?;
    emit_notes_changed(&app);
    Ok(())
}

#[tauri::command]
fn empty_trash(app: tauri::AppHandle) -> Result<(), String> {
    notes_service::empty_trash()?;
    emit_notes_changed(&app);
    Ok(())
}

#[tauri::command]
fn reorder_notes(
    app: tauri::AppHandle,
    reordered: Vec<ReorderItem>,
    is_archived_view: bool,
) -> Result<(), String> {
    let items: Vec<(String, i32)> = reordered.into_iter().map(|r| (r.id, r.order)).collect();
    notes_service::reorder_notes(items, is_archived_view)?;
    emit_notes_changed(&app);
    Ok(())
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
fn pin_window_to_desktop(app: tauri::AppHandle, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&window)? else {
            return Ok(());
        };
        windows::set_topmost_no_activate(hwnd_isize, false)?;
        return windows::attach_to_worker_w(hwnd_isize).map_err(|e| e.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let click_through = get_overlay_click_through(&app);
        run_macos_window_op(
            &window,
            "macos_pin_attach_to_wallpaper_layer",
            move |ptr| {
                macos_windows::attach_to_wallpaper_layer_with_interaction(ptr, click_through)
            },
        )?;
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = window.set_always_on_top(false);
        Ok(())
    }
}

#[tauri::command]
fn unpin_window_from_desktop(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&window)? else {
            return Ok(());
        };
        windows::detach_from_worker_w(hwnd_isize).map_err(|e| e.to_string())?;
        windows::set_topmost_no_activate(hwnd_isize, true)?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        run_macos_window_op(
            &window,
            "macos_unpin_detach_from_desktop",
            macos_windows::detach_from_worker_w,
        )?;
        run_macos_window_op(&window, "macos_unpin_set_topmost_true", |ptr| {
            macos_windows::set_topmost_no_activate(ptr, true)
        })?;
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = window.set_always_on_top(true);
        Ok(())
    }
}

#[tauri::command]
fn apply_note_window_layer(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    is_always_on_top: bool,
) -> Result<(), String> {
    apply_note_window_layer_with_interaction_by_label(
        &app,
        window.label(),
        is_always_on_top,
        get_overlay_click_through(&app),
    )
}

#[tauri::command]
fn sync_all_note_window_layers(app: tauri::AppHandle) -> Result<(), String> {
    let notes = notes_service::load_notes(NoteSortMode::Custom)?;
    let click_through = get_overlay_click_through(&app);
    for n in notes {
        if !n.is_pinned || n.is_archived || n.is_deleted {
            continue;
        }
        let label = format!("note-{}", n.id);
        let _ = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            n.is_always_on_top,
            click_through,
        );
    }
    Ok(())
}

#[tauri::command]
fn apply_window_no_snap_by_label(app: tauri::AppHandle, label: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let Some(w) = app.get_webview_window(label.as_str()) else {
            return Ok(());
        };
        let Some(hwnd_isize) = window_hwnd_isize(&w)? else {
            return Ok(());
        };
        if label == "main" {
            return windows::disable_aero_snap(hwnd_isize);
        }
        return windows::disable_aero_snap_keep_resizable(hwnd_isize);
    }

    #[cfg(target_os = "macos")]
    {
        let Some(w) = app.get_webview_window(label.as_str()) else {
            return Ok(());
        };
        if label == "main" {
            return run_macos_window_op(
                &w,
                "macos_disable_no_snap",
                macos_windows::disable_aero_snap,
            );
        }
        return run_macos_window_op(
            &w,
            "macos_disable_no_snap_keep_resizable",
            macos_windows::disable_aero_snap_keep_resizable,
        );
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = (app, label);
        Ok(())
    }
}

#[tauri::command]
fn toggle_z_order_and_apply(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::toggle_z_order(&id, parse_sort_mode(sort_mode.as_str()))?;
    if let Some(updated) = notes.iter().find(|n| n.id == id) {
        let label = format!("note-{}", updated.id);
        if let Err(e) = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            updated.is_always_on_top,
            get_overlay_click_through(&app),
        ) {
            eprintln!(
                "toggle_z_order_and_apply layer switch failed for {}: {}",
                label, e
            );
        }
    }
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
fn toggle_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<OverlayInputState>() {
        let click_through = state.toggle();
        apply_overlay_input_state(&app, click_through);
        let _ = app.emit("overlay_input_changed", click_through);
        Ok(click_through)
    } else {
        Err("OverlayInputState not found".to_string())
    }
}

#[tauri::command]
fn get_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<OverlayInputState>() {
        let guard = state.0.lock().map_err(|_| "mutex poisoned")?;
        Ok(*guard)
    } else {
        Err("OverlayInputState not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(OverlayInputState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_preferred_panel_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                #[cfg(target_os = "windows")]
                if let Some(main_window) = app.get_webview_window("main") {
                    if let Ok(Some(hwnd_isize)) = window_hwnd_isize(&main_window) {
                        let _ = windows::disable_aero_snap(hwnd_isize);
                    }
                }

                let _ = app.handle().plugin(tauri_plugin_autostart::init(
                    tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                    Some(vec![]),
                ));
                use tauri::image::Image;
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
                use tauri::tray::TrayIconBuilder;

                let show_i =
                    MenuItem::with_id(app, "show", "Show main window", true, None::<&str>)?;
                let github_i =
                    MenuItem::with_id(app, "github", "Star on GitHub", true, None::<&str>)?;
                let sep1 = PredefinedMenuItem::separator(app)?;
                let toggle_stickies_i = MenuItem::with_id(
                    app,
                    "toggle_stickies",
                    "Stickers: Close",
                    true,
                    None::<&str>,
                )?;
                let toggle_interaction_i = MenuItem::with_id(
                    app,
                    "toggle_interaction",
                    "Stickers: Toggle Mouse Interaction",
                    true,
                    None::<&str>,
                )?;
                let sep2 = PredefinedMenuItem::separator(app)?;
                let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;

                let menu = Menu::with_items(
                    app,
                    &[
                        &show_i,
                        &github_i,
                        &sep1,
                        &toggle_stickies_i,
                        &toggle_interaction_i,
                        &sep2,
                        &quit_i,
                    ],
                )?;

                app.manage(TrayMenuState {
                    show: show_i,
                    github: github_i,
                    toggle_stickies: toggle_stickies_i,
                    toggle_interaction: toggle_interaction_i,
                    quit: quit_i,
                });

                #[cfg(target_os = "macos")]
                let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-template.png"))?;
                #[cfg(not(target_os = "macos"))]
                let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-color.png"))?;

                let tray_builder = TrayIconBuilder::new()
                    .icon(tray_icon)
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .on_menu_event(|app, event| {
                        if event.id.as_ref() == "show" {
                            show_preferred_panel_window(app);
                        } else if event.id.as_ref() == "github" {
                            let _ = open::that("https://github.com/sqmw/desk_tidy_sticky");
                        } else if event.id.as_ref() == "toggle_stickies" {
                            let _ = app.emit("tray_overlay_toggle", ());
                        } else if event.id.as_ref() == "toggle_interaction" {
                            if let Some(state) = app.try_state::<OverlayInputState>() {
                                let click_through = state.toggle();
                                apply_overlay_input_state(app, click_through);
                                let _ = app.emit("overlay_input_changed", click_through);
                            }
                        } else if event.id.as_ref() == "quit" {
                            app.exit(0);
                        }
                    });

                #[cfg(target_os = "macos")]
                let tray_builder = tray_builder.icon_as_template(true);
                #[cfg(not(target_os = "macos"))]
                let tray_builder = tray_builder.icon_as_template(false);

                let _tray = tray_builder.build(app)?;

                #[cfg(target_os = "macos")]
                apply_macos_runtime_dock_icon(&app.handle());

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
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Ctrl+Shift+N", "Ctrl+Shift+O"])
                .expect("Failed to register shortcut")
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::{Code, Modifiers};
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyN) {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                    let _ = window.set_skip_taskbar(true);
                                } else {
                                    show_and_focus_window(&window);
                                }
                                sync_panel_window_shell_state(app);
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
            apply_note_window_layer,
            sync_all_note_window_layers,
            apply_window_no_snap_by_label,
            update_tray_texts,
            toggle_overlay_interaction,
            get_overlay_interaction,
            hide_panel_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            show_preferred_panel_window(app_handle);
            return;
        }

        #[cfg(not(target_os = "macos"))]
        let _ = (app_handle, event);
    });
}
