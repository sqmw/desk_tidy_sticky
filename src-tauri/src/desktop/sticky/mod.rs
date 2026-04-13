use crate::notes::{self, service as notes_service, NoteSortMode};
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
#[cfg(target_os = "windows")]
use crate::platform::{window_hwnd_isize, windows};
use crate::runtime::OverlayInputState;
use tauri::{Emitter, Manager};

mod layer;

pub use layer::apply_overlay_input_state;
use layer::{apply_note_window_layer_with_interaction_by_label, get_overlay_click_through};

fn parse_sort_mode(sort_mode: &str) -> NoteSortMode {
    match sort_mode {
        "newest" => NoteSortMode::Newest,
        "oldest" => NoteSortMode::Oldest,
        _ => NoteSortMode::Custom,
    }
}

fn emit_notes_changed(app: &tauri::AppHandle) {
    let _ = app.emit("notes_changed", ());
}

#[tauri::command]
pub fn pin_window_to_desktop(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<(), String> {
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
        run_macos_window_op(&window, "macos_pin_attach_to_wallpaper_layer", move |ptr| {
            macos::attach_to_wallpaper_layer_with_interaction(ptr, click_through)
        })?;
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = app;
        let _ = window.set_always_on_top(false);
        Ok(())
    }
}

#[tauri::command]
pub fn unpin_window_from_desktop(window: tauri::WebviewWindow) -> Result<(), String> {
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
            macos::detach_from_worker_w,
        )?;
        run_macos_window_op(&window, "macos_unpin_set_topmost_true", |ptr| {
            macos::set_topmost_no_activate(ptr, true)
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
pub fn apply_note_window_layer(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    is_always_on_top: bool,
    is_wallpaper: bool,
) -> Result<(), String> {
    apply_note_window_layer_with_interaction_by_label(
        &app,
        window.label(),
        is_always_on_top,
        get_overlay_click_through(&app),
        is_wallpaper,
    )
}

#[tauri::command]
pub fn sync_all_note_window_layers(app: tauri::AppHandle) -> Result<(), String> {
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
            n.is_wallpaper,
        );
    }
    Ok(())
}

#[tauri::command]
pub fn apply_window_no_snap_by_label(app: tauri::AppHandle, label: String) -> Result<(), String> {
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
            return run_macos_window_op(&w, "macos_disable_no_snap", macos::disable_aero_snap);
        }
        return run_macos_window_op(
            &w,
            "macos_disable_no_snap_keep_resizable",
            macos::disable_aero_snap_keep_resizable,
        );
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = (app, label);
        Ok(())
    }
}

#[tauri::command]
pub fn toggle_z_order_and_apply(
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
            updated.is_wallpaper,
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
pub fn toggle_wallpaper_layer_and_apply(
    app: tauri::AppHandle,
    id: String,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let notes = notes_service::toggle_wallpaper_layer(&id, parse_sort_mode(sort_mode.as_str()))?;
    if let Some(updated) = notes.iter().find(|n| n.id == id) {
        let label = format!("note-{}", updated.id);
        if let Err(e) = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            updated.is_always_on_top,
            get_overlay_click_through(&app),
            updated.is_wallpaper,
        ) {
            eprintln!(
                "toggle_wallpaper_layer_and_apply layer switch failed for {}: {}",
                label, e
            );
        }
    }
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn toggle_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
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
pub fn get_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<OverlayInputState>() {
        let guard = state.0.lock().map_err(|_| "mutex poisoned")?;
        Ok(*guard)
    } else {
        Err("OverlayInputState not found".to_string())
    }
}
