use crate::notes::{service as notes_service, NoteSortMode};
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
#[cfg(target_os = "windows")]
use crate::platform::{window_hwnd_isize, windows};
use crate::runtime::OverlayInputState;
use tauri::Manager;

pub fn apply_overlay_input_state(app: &tauri::AppHandle, click_through: bool) {
    let notes = notes_service::load_notes(NoteSortMode::Custom).unwrap_or_default();
    for (label, w) in app.webview_windows() {
        if label.starts_with("note-") {
            let note_id = label.trim_start_matches("note-");
            if let Some(n) = notes.iter().find(|x| x.id == note_id) {
                let ignore_cursor =
                    resolve_note_ignore_cursor(n.is_always_on_top, n.is_wallpaper, click_through);
                let _ = w.set_ignore_cursor_events(ignore_cursor);
                let _ = apply_note_window_layer_with_interaction_by_label(
                    app,
                    &label,
                    n.is_always_on_top,
                    click_through,
                    n.is_wallpaper,
                );
            } else {
                let _ = w.set_ignore_cursor_events(click_through);
            }
        }
    }
}

pub(super) fn apply_note_window_layer_with_interaction_by_label(
    app: &tauri::AppHandle,
    label: &str,
    is_always_on_top: bool,
    click_through: bool,
    is_wallpaper: bool,
) -> Result<(), String> {
    let Some(w) = app.get_webview_window(label) else {
        return Ok(());
    };

    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&w)? else {
            return Ok(());
        };
        if is_always_on_top {
            windows::detach_from_worker_w(hwnd_isize)?;
            let _ = w.set_always_on_top(true);
            windows::set_topmost_no_activate(hwnd_isize, true)?;
            return Ok(());
        }
        if is_wallpaper {
            let _ = w.set_always_on_top(false);
            windows::set_topmost_no_activate(hwnd_isize, false)?;
            windows::attach_to_wallpaper_worker_w(hwnd_isize)?;
            return Ok(());
        }
        let _ = w.set_always_on_top(false);
        windows::set_topmost_no_activate(hwnd_isize, false)?;
        windows::attach_to_worker_w(hwnd_isize)?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        if is_always_on_top {
            run_macos_window_op(&w, "macos_detach_from_desktop", macos::detach_from_worker_w)?;
            run_macos_window_op(&w, "macos_set_topmost_true", |ptr| {
                macos::set_topmost_no_activate(ptr, true)
            })?;
        } else {
            run_macos_window_op(&w, "macos_set_topmost_false", |ptr| {
                macos::set_topmost_no_activate(ptr, false)
            })?;
            if is_wallpaper {
                run_macos_window_op(&w, "macos_attach_to_wallpaper_layer", move |ptr| {
                    // Wallpaper mode should stay behind icons.
                    macos::attach_to_wallpaper_layer_with_interaction(ptr, true)
                })?;
            } else {
                let ignore_cursor =
                    resolve_note_ignore_cursor(is_always_on_top, is_wallpaper, click_through);
                run_macos_window_op(&w, "macos_attach_to_desktop_layer", move |ptr| {
                    macos::attach_to_desktop_layer_with_interaction(ptr, ignore_cursor)
                })?;
            }
        }
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = is_wallpaper;
        let _ = click_through;
        let _ = w.set_always_on_top(is_always_on_top);
        Ok(())
    }
}

fn resolve_note_ignore_cursor(
    is_always_on_top: bool,
    is_wallpaper: bool,
    overlay_click_through: bool,
) -> bool {
    if is_always_on_top {
        return false;
    }
    if is_wallpaper {
        return true;
    }
    overlay_click_through
}

pub(super) fn get_overlay_click_through(app: &tauri::AppHandle) -> bool {
    if let Some(state) = app.try_state::<OverlayInputState>() {
        if let Ok(guard) = state.0.lock() {
            return *guard;
        }
    }
    true
}
