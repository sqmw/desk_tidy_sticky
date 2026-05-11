use std::str::FromStr;

use crate::{
    desktop::{show_preferred_panel_window, sync_panel_window_shell_state, PANEL_WINDOW_LABELS},
    preferences::{read_preferences, write_preferences},
    runtime::{
        GlobalControlState, ShortcutBindingSnapshot, ShortcutRuntimeState, ShortcutSettingsSnapshot,
    },
};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub const SHORTCUT_SETTINGS_CHANGED_EVENT: &str = "shortcut_settings_changed";

const STATUS_REGISTERED: &str = "registered";
const STATUS_CONFLICT: &str = "conflict";
const STATUS_INVALID: &str = "invalid";
const STATUS_DISABLED: &str = "disabled";
const STATUS_ERROR: &str = "error";

#[derive(Copy, Clone)]
enum ShortcutAction {
    TogglePanel,
    ToggleOverlay,
}

#[derive(Clone)]
struct DesiredShortcutBinding {
    action: ShortcutAction,
    parsed: Option<Shortcut>,
    snapshot: ShortcutBindingSnapshot,
}

#[tauri::command]
pub fn get_shortcut_settings(app: tauri::AppHandle) -> Result<ShortcutSettingsSnapshot, String> {
    if let Some(state) = app.try_state::<ShortcutRuntimeState>() {
        let snapshot = state.snapshot()?;
        if !snapshot.panel_binding.status.is_empty() || !snapshot.overlay_binding.status.is_empty()
        {
            return Ok(snapshot);
        }
    }
    apply_shortcut_preferences(&app)
}

#[tauri::command]
pub fn update_shortcut_settings(
    app: tauri::AppHandle,
    panel_shortcut: String,
    overlay_shortcut: String,
) -> Result<ShortcutSettingsSnapshot, String> {
    let mut prefs = read_preferences()?;
    prefs.panel_shortcut = panel_shortcut.trim().to_string();
    prefs.overlay_shortcut = overlay_shortcut.trim().to_string();
    write_preferences(&prefs)?;
    apply_shortcut_preferences(&app)
}

pub fn initialize_shortcut_settings(
    app: &tauri::AppHandle,
) -> Result<ShortcutSettingsSnapshot, String> {
    apply_shortcut_preferences(app)
}

fn apply_shortcut_preferences(app: &tauri::AppHandle) -> Result<ShortcutSettingsSnapshot, String> {
    let prefs = read_preferences()?;
    let mut panel_binding = build_binding(ShortcutAction::TogglePanel, prefs.panel_shortcut);
    let mut overlay_binding = build_binding(ShortcutAction::ToggleOverlay, prefs.overlay_shortcut);

    if let (Some(panel_shortcut), Some(overlay_shortcut)) =
        (panel_binding.parsed, overlay_binding.parsed)
    {
        if panel_shortcut.id() == overlay_shortcut.id() {
            let message = "Shortcut is already assigned to another action.".to_string();
            panel_binding.snapshot.status = STATUS_CONFLICT.to_string();
            panel_binding.snapshot.message = message.clone();
            overlay_binding.snapshot.status = STATUS_CONFLICT.to_string();
            overlay_binding.snapshot.message = message;
            panel_binding.parsed = None;
            overlay_binding.parsed = None;
        }
    }

    if let Err(error) = app.global_shortcut().unregister_all() {
        eprintln!("unregister shortcuts failed: {}", error);
    }

    register_binding(app, &mut panel_binding);
    register_binding(app, &mut overlay_binding);

    let snapshot = ShortcutSettingsSnapshot {
        panel_binding: panel_binding.snapshot.clone(),
        overlay_binding: overlay_binding.snapshot.clone(),
    };

    if let Some(state) = app.try_state::<ShortcutRuntimeState>() {
        let _ = state.update(snapshot.clone());
    }
    let _ = app.emit(SHORTCUT_SETTINGS_CHANGED_EVENT, snapshot.clone());

    Ok(snapshot)
}

fn build_binding(action: ShortcutAction, value: String) -> DesiredShortcutBinding {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return DesiredShortcutBinding {
            action,
            parsed: None,
            snapshot: ShortcutBindingSnapshot {
                value: String::new(),
                status: STATUS_DISABLED.to_string(),
                message: String::new(),
            },
        };
    }

    match Shortcut::from_str(&trimmed) {
        Ok(parsed) => DesiredShortcutBinding {
            action,
            parsed: Some(parsed),
            snapshot: ShortcutBindingSnapshot {
                value: trimmed,
                status: String::new(),
                message: String::new(),
            },
        },
        Err(error) => DesiredShortcutBinding {
            action,
            parsed: None,
            snapshot: ShortcutBindingSnapshot {
                value: trimmed,
                status: STATUS_INVALID.to_string(),
                message: error.to_string(),
            },
        },
    }
}

fn register_binding(app: &tauri::AppHandle, binding: &mut DesiredShortcutBinding) {
    let shortcut = match binding.parsed {
        Some(shortcut) => shortcut,
        None => {
            if binding.snapshot.status.is_empty() {
                binding.snapshot.status = STATUS_DISABLED.to_string();
            }
            return;
        }
    };

    let register_result = match binding.action {
        ShortcutAction::TogglePanel => {
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _, event| {
                    if event.state == ShortcutState::Pressed {
                        handle_panel_shortcut(app);
                    }
                })
        }
        ShortcutAction::ToggleOverlay => {
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _, event| {
                    if event.state == ShortcutState::Pressed {
                        handle_overlay_shortcut(app);
                    }
                })
        }
    };

    match register_result {
        Ok(_) => {
            binding.snapshot.status = STATUS_REGISTERED.to_string();
            binding.snapshot.message = String::new();
        }
        Err(error) => {
            let message = error.to_string();
            binding.snapshot.status = classify_registration_error(&message).to_string();
            binding.snapshot.message = message;
            let _ = app.global_shortcut().unregister(shortcut);
        }
    }
}

fn classify_registration_error(message: &str) -> &'static str {
    let lower = message.to_ascii_lowercase();
    if lower.contains("already registered") || lower.contains("already been registered") {
        STATUS_CONFLICT
    } else if lower.contains("parse") || lower.contains("invalid") {
        STATUS_INVALID
    } else {
        STATUS_ERROR
    }
}

fn handle_panel_shortcut(app: &tauri::AppHandle) {
    let any_visible = PANEL_WINDOW_LABELS.iter().any(|label| {
        app.get_webview_window(label)
            .and_then(|window| window.is_visible().ok())
            .unwrap_or(false)
    });

    if any_visible {
        for label in PANEL_WINDOW_LABELS {
            if let Some(window) = app.get_webview_window(label) {
                let _ = window.hide();
                let _ = window.set_skip_taskbar(true);
            }
        }
        sync_panel_window_shell_state(app);
        return;
    }

    show_preferred_panel_window(app);
}

fn handle_overlay_shortcut(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<GlobalControlState>() else {
        return;
    };
    let interaction_disabled = state.toggle();
    crate::desktop::apply_overlay_input_state(app, interaction_disabled);
    let _ = app.emit("global_control_changed", interaction_disabled);
}
