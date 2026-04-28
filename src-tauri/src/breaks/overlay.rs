#[cfg(target_os = "macos")]
use crate::desktop::{apply_macos_runtime_dock_icon, PANEL_WINDOW_LABELS};
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
#[cfg(target_os = "macos")]
use crate::runtime::BreakOverlayPresentationState;
#[cfg(target_os = "macos")]
use tauri::Manager;

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
        return Ok(());
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
        return Ok(());
    }
}
