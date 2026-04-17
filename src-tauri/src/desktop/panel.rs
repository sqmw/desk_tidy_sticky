use crate::preferences;
#[cfg(target_os = "macos")]
use crate::platform::{macos, run_macos_window_op};
#[cfg(target_os = "windows")]
use crate::platform::{window_hwnd_isize, windows};
use tauri::Manager;
use tauri::utils::config::BackgroundThrottlingPolicy;

pub const PANEL_WINDOW_LABELS: [&str; 2] = ["main", "workspace"];

#[cfg(target_os = "macos")]
pub fn apply_macos_runtime_dock_icon(app: &tauri::AppHandle) {
    let Some(window) = app
        .get_webview_window("workspace")
        .or_else(|| app.get_webview_window("main"))
    else {
        return;
    };

    if let Err(error) = window.run_on_main_thread(|| {
        if let Err(error) = crate::platform::macos::set_application_icon_from_png(include_bytes!(
            "../../icons/dock-icon.png"
        )) {
            eprintln!("set macOS app icon failed: {}", error);
        }
    }) {
        eprintln!("schedule macOS app icon update failed: {}", error);
    }
}

pub fn sync_panel_window_shell_state(app: &tauri::AppHandle) {
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

pub fn show_and_focus_window(window: &tauri::WebviewWindow) {
    let _ = window.set_skip_taskbar(false);
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

pub fn ensure_workspace_panel_window(app: &tauri::AppHandle) -> Option<tauri::WebviewWindow> {
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
    .transparent(true)
    .visible(false)
    .decorations(false)
    .skip_taskbar(false)
    .resizable(true)
    .maximizable(true)
    .background_throttling(BackgroundThrottlingPolicy::Disabled)
    .devtools(true);
    match builder.build() {
        Ok(window) => Some(window),
        Err(err) => {
            eprintln!("ensure_workspace_panel_window build failed: {}", err);
            None
        }
    }
}

pub fn ensure_hidden_workspace_runtime_window(app: &tauri::AppHandle) {
    if let Some(existing) = app.get_webview_window("workspace") {
        if !existing.is_visible().unwrap_or(false) {
            let _ = existing.set_skip_taskbar(true);
        }
        return;
    }
    let Some(window) = ensure_workspace_panel_window(app) else {
        return;
    };
    let _ = window.hide();
    let _ = window.set_skip_taskbar(true);
}

pub fn show_preferred_panel_window(app: &tauri::AppHandle) {
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
pub fn set_panel_window_pinned(
    app: tauri::AppHandle,
    label: String,
    pinned: bool,
) -> Result<(), String> {
    let target = if label == "workspace" {
        "workspace"
    } else {
        "main"
    };
    let Some(window) = app.get_webview_window(target) else {
        return Ok(());
    };

    #[cfg(target_os = "windows")]
    {
        let Some(hwnd_isize) = window_hwnd_isize(&window)? else {
            return Ok(());
        };
        let _ = window.set_always_on_top(pinned);
        windows::set_topmost_no_activate(hwnd_isize, pinned)?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let _ = window.set_always_on_top(pinned);
        let _ = window.set_visible_on_all_workspaces(pinned);
        return run_macos_window_op(&window, "macos_set_panel_window_pinned", move |ptr| {
            macos::set_topmost_no_activate(ptr, pinned)
        });
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        let _ = app;
        window
            .set_always_on_top(pinned)
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub fn hide_panel_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
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

#[tauri::command]
pub fn minimize_panel_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    let target = if label == "workspace" {
        "workspace"
    } else {
        "main"
    };
    let Some(window) = app.get_webview_window(target) else {
        return Ok(());
    };
    let _ = window.set_skip_taskbar(false);
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
        apply_macos_runtime_dock_icon(&app);
    }
    let _ = window.show();
    let _ = window.unminimize();
    window.minimize().map_err(|error| error.to_string())?;
    sync_panel_window_shell_state(&app);
    Ok(())
}
