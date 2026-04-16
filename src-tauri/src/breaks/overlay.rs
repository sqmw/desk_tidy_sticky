#[cfg(target_os = "macos")]
use crate::desktop::{apply_macos_runtime_dock_icon, PANEL_WINDOW_LABELS};
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
use crate::runtime::BreakOverlayPresentationState;
#[cfg(target_os = "macos")]
use tauri::Manager;

const BREAK_OVERLAY_LABEL_PREFIX: &str = "focus-break-overlay-";

#[cfg(target_os = "macos")]
fn break_overlay_label(index: usize) -> String {
    format!("{BREAK_OVERLAY_LABEL_PREFIX}{index}")
}

#[cfg(target_os = "macos")]
fn monitor_to_logical_bounds(monitor: &tauri::Monitor) -> (f64, f64, f64, f64) {
    let scale = {
        let raw = monitor.scale_factor();
        if raw.is_finite() && raw > 0.0 {
            raw
        } else {
            1.0
        }
    };
    let position = monitor.position();
    let size = monitor.size();
    let x = (position.x as f64 / scale).floor();
    let y = (position.y as f64 / scale).floor();
    let width = ((size.width as f64) / scale).ceil().max(320.0);
    let height = ((size.height as f64) / scale).ceil().max(240.0);
    (x, y, width, height)
}

#[cfg(target_os = "macos")]
fn apply_break_overlay_window_runtime_state(window: &tauri::WebviewWindow) -> Result<(), String> {
    let _ = window.set_always_on_top(true);
    let _ = window.set_shadow(false);
    let _ = window.set_ignore_cursor_events(false);
    run_macos_window_op(
        window,
        "macos_apply_break_overlay_window_traits",
        macos::apply_break_overlay_window_traits,
    )?;
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn ensure_break_overlay_windows_native(app: &tauri::AppHandle) -> Result<(), String> {
    let anchor = app
        .get_webview_window("workspace")
        .or_else(|| app.get_webview_window("main"))
        .or_else(|| app.webview_windows().values().next().cloned())
        .ok_or_else(|| "no anchor window available for break overlay".to_string())?;
    let monitors = anchor.available_monitors().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Ok(());
    }

    set_break_overlay_presentation(app.clone(), true)?;

    for (index, monitor) in monitors.iter().enumerate() {
        let label = break_overlay_label(index);
        let (x, y, width, height) = monitor_to_logical_bounds(monitor);
        let window = if let Some(existing) = app.get_webview_window(label.as_str()) {
            let _ =
                existing.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
            let _ = existing.set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)));
            existing
        } else {
            tauri::WebviewWindowBuilder::new(
                app,
                label.as_str(),
                tauri::WebviewUrl::App("/break-overlay".into()),
            )
            .title("Break reminder")
            .position(x, y)
            .inner_size(width, height)
            .visible(false)
            .decorations(false)
            .transparent(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .focused(true)
            .shadow(false)
            .devtools(true)
            .build()
            .map_err(|e| e.to_string())?
        };
        apply_break_overlay_window_runtime_state(&window)?;
    }

    set_break_overlay_presentation(app.clone(), true)?;
    Ok(())
}

#[tauri::command]
pub fn apply_break_overlay_window_traits(
    app: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let Some(window) = app.get_webview_window(label.as_str()) else {
            return Ok(());
        };
        return run_macos_window_op(
            &window,
            "macos_apply_break_overlay_window_traits",
            macos::apply_break_overlay_window_traits,
        );
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, label);
        Ok(())
    }
}

#[tauri::command]
pub fn set_break_overlay_presentation(app: tauri::AppHandle, active: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if active {
            if let Some(state) = app.try_state::<BreakOverlayPresentationState>() {
                let restore_regular_policy = PANEL_WINDOW_LABELS.iter().any(|label| {
                    app.get_webview_window(label)
                        .and_then(|window| window.is_visible().ok())
                        .unwrap_or(false)
                });
                let _ = state.capture(restore_regular_policy);
            }
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
        }
        let Some(window) = app
            .get_webview_window("workspace")
            .or_else(|| app.get_webview_window("main"))
            .or_else(|| app.webview_windows().values().next().cloned())
        else {
            return Ok(());
        };
        let result = window
            .run_on_main_thread(move || {
                if let Err(error) = macos::set_break_overlay_presentation(active) {
                    eprintln!("macos_set_break_overlay_presentation failed: {}", error);
                }
            })
            .map_err(|e| e.to_string());
        if result.is_ok() && !active {
            let restore_regular_policy = app
                .try_state::<BreakOverlayPresentationState>()
                .and_then(|state| state.take_restore_regular_policy().ok())
                .flatten();
            match restore_regular_policy {
                Some(true) => {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                    apply_macos_runtime_dock_icon(&app);
                }
                Some(false) => {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
                None => {}
            }
        }
        return result;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, active);
        Ok(())
    }
}
