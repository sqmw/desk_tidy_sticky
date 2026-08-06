use crate::notes::{self, service as notes_service, store as notes_store, NoteSortMode};
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
#[cfg(target_os = "windows")]
use crate::platform::{window_hwnd_isize, windows};
use crate::runtime::GlobalControlState;
use tauri::{Emitter, Manager};

mod auto_hide;
#[cfg(any(target_os = "windows", test))]
mod display_recovery;
mod effects;
mod layer;
mod panel_window;

pub use auto_hide::{
    clear_active_topmost_editing_sticky, hide_active_topmost_editing_sticky, hide_note_to_edge,
    mark_active_topmost_editing_sticky, normalize_note_window_position, reveal_note_from_edge,
    set_note_auto_hide_enabled, shortcut_hide_or_reveal, toggle_hidden_stickies,
};
#[cfg(target_os = "windows")]
pub use display_recovery::{schedule_hidden_note_recovery, StickyDisplayRecoveryState};
pub use effects::apply_note_window_frost;
use effects::{apply_note_window_frost_by_label, sync_note_window_frost_by_id};
pub use layer::apply_overlay_input_state;
use layer::{apply_note_window_layer_with_interaction_by_label, get_overlay_interaction_disabled};
pub use panel_window::{configure_note_panel_window, dismiss_note_window_by_label};

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
        let _ = app;
        let Some(hwnd_isize) = window_hwnd_isize(&window)? else {
            return Ok(());
        };
        windows::set_topmost_no_activate(hwnd_isize, false)?;
        return windows::attach_to_worker_w(hwnd_isize).map_err(|e| e.to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let interaction_disabled = get_overlay_interaction_disabled(&app);
        run_macos_window_op(&window, "macos_pin_attach_to_desktop_layer", move |ptr| {
            macos::attach_to_desktop_layer_with_interaction(ptr, interaction_disabled)
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
        get_overlay_interaction_disabled(&app),
        is_wallpaper,
    )?;
    let note_id = window.label().trim_start_matches("note-");
    let _ = sync_note_window_frost_by_id(&app, note_id);
    Ok(())
}

fn sync_note_layer_by_id(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let notes =
        notes_store::with_notes_store(app, || notes_service::load_notes(NoteSortMode::Custom))?;
    let Some(note) = notes.into_iter().find(|n| n.id == id) else {
        return Ok(());
    };
    if !note.is_pinned || note.is_archived || note.is_deleted {
        return Ok(());
    }
    let label = format!("note-{}", note.id);
    apply_note_window_layer_with_interaction_by_label(
        app,
        &label,
        note.is_always_on_top,
        get_overlay_interaction_disabled(app),
        note.is_wallpaper,
    )?;
    let _ = apply_note_window_frost_by_label(app, &label, note.frost.unwrap_or_default());
    Ok(())
}

#[tauri::command]
pub fn sync_note_window_layer(app: tauri::AppHandle, id: String) -> Result<(), String> {
    sync_note_layer_by_id(&app, &id)
}

#[tauri::command]
pub fn sync_all_note_window_layers(app: tauri::AppHandle) -> Result<(), String> {
    let notes =
        notes_store::with_notes_store(&app, || notes_service::load_notes(NoteSortMode::Custom))?;
    let interaction_disabled = get_overlay_interaction_disabled(&app);
    for n in notes {
        if !n.is_pinned || n.is_archived || n.is_deleted {
            continue;
        }
        let label = format!("note-{}", n.id);
        let _ = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            n.is_always_on_top,
            interaction_disabled,
            n.is_wallpaper,
        );
        let _ = apply_note_window_frost_by_label(&app, &label, n.frost.unwrap_or_default());
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
    let notes = notes_store::with_notes_store(&app, || {
        notes_service::toggle_z_order(&id, parse_sort_mode(sort_mode.as_str()))
    })?;
    if let Some(updated) = notes.iter().find(|n| n.id == id) {
        let label = format!("note-{}", updated.id);
        if let Err(e) = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            updated.is_always_on_top,
            get_overlay_interaction_disabled(&app),
            updated.is_wallpaper,
        ) {
            eprintln!(
                "toggle_z_order_and_apply layer switch failed for {}: {}",
                label, e
            );
        }
        let _ = apply_note_window_frost_by_label(&app, &label, updated.frost.unwrap_or_default());
        #[cfg(target_os = "windows")]
        if !updated.is_always_on_top {
            if let Some(w) = app.get_webview_window(&label) {
                if let Ok(Some(hwnd_isize)) = window_hwnd_isize(&w) {
                    // One-shot: ensure the "pin to bottom" click takes effect immediately.
                    let _ = windows::send_window_to_bottom_if_top_level(hwnd_isize);
                }
            }
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
    let notes = notes_store::with_notes_store(&app, || {
        notes_service::toggle_wallpaper_layer(&id, parse_sort_mode(sort_mode.as_str()))
    })?;
    if let Some(updated) = notes.iter().find(|n| n.id == id) {
        let label = format!("note-{}", updated.id);
        if let Err(e) = apply_note_window_layer_with_interaction_by_label(
            &app,
            &label,
            updated.is_always_on_top,
            get_overlay_interaction_disabled(&app),
            updated.is_wallpaper,
        ) {
            eprintln!(
                "toggle_wallpaper_layer_and_apply layer switch failed for {}: {}",
                label, e
            );
        }
        let _ = apply_note_window_frost_by_label(&app, &label, updated.frost.unwrap_or_default());
    }
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn toggle_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<GlobalControlState>() {
        let interaction_disabled = state.toggle();
        apply_overlay_input_state(&app, interaction_disabled);
        let _ = app.emit("global_control_changed", interaction_disabled);
        Ok(interaction_disabled)
    } else {
        Err("GlobalControlState not found".to_string())
    }
}

#[tauri::command]
pub fn get_overlay_interaction(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(state) = app.try_state::<GlobalControlState>() {
        let guard = state.0.lock().map_err(|_| "mutex poisoned")?;
        Ok(*guard)
    } else {
        Err("GlobalControlState not found".to_string())
    }
}

#[tauri::command]
pub fn move_note_window_without_activation(
    window: tauri::WebviewWindow,
    x: f64,
    y: f64,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&window)? else {
            return Ok(());
        };
        let scale = window.scale_factor().map_err(|e| e.to_string())?;
        let physical_x = (x * scale).round() as i32;
        let physical_y = (y * scale).round() as i32;
        return windows::move_window_no_activate(hwnd_isize, physical_x, physical_y);
    }

    #[cfg(not(target_os = "windows"))]
    {
        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)))
            .map_err(|e| e.to_string())
    }
}
