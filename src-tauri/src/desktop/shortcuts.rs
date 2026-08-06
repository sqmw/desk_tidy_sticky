use std::str::FromStr;
#[cfg(target_os = "windows")]
use std::sync::{Arc, Mutex};
#[cfg(any(target_os = "windows", test))]
use std::time::{Duration, Instant};

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
#[cfg(any(target_os = "windows", test))]
const STICKY_SHORTCUT_MIN_PRESS_DURATION: Duration = Duration::from_millis(30);
#[cfg(any(target_os = "windows", test))]
const STICKY_SHORTCUT_MAX_PRESS_DURATION: Duration = Duration::from_secs(2);

#[cfg(any(target_os = "windows", test))]
#[derive(Default)]
struct StickyShortcutIntent {
    pressed_at: Option<Instant>,
}

#[cfg(any(target_os = "windows", test))]
impl StickyShortcutIntent {
    fn handle(&mut self, state: ShortcutState, now: Instant) -> bool {
        match state {
            ShortcutState::Pressed => {
                self.pressed_at = Some(now);
                false
            }
            ShortcutState::Released => self
                .pressed_at
                .take()
                .map(|pressed_at| {
                    let duration = now.saturating_duration_since(pressed_at);
                    (STICKY_SHORTCUT_MIN_PRESS_DURATION..=STICKY_SHORTCUT_MAX_PRESS_DURATION)
                        .contains(&duration)
                })
                .unwrap_or(false),
        }
    }
}

#[derive(Copy, Clone)]
enum ShortcutAction {
    TogglePanel,
    ToggleOverlay,
    ToggleStickyHide,
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
    sticky_hide_shortcut: String,
) -> Result<ShortcutSettingsSnapshot, String> {
    let mut prefs = read_preferences()?;
    prefs.panel_shortcut = panel_shortcut.trim().to_string();
    prefs.overlay_shortcut = overlay_shortcut.trim().to_string();
    prefs.sticky_hide_shortcut = sticky_hide_shortcut.trim().to_string();
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
    let mut bindings = vec![
        build_binding(ShortcutAction::TogglePanel, prefs.panel_shortcut),
        build_binding(ShortcutAction::ToggleOverlay, prefs.overlay_shortcut),
        build_binding(ShortcutAction::ToggleStickyHide, prefs.sticky_hide_shortcut),
    ];

    for index in 0..bindings.len() {
        let Some(shortcut) = bindings[index].parsed else {
            continue;
        };
        let has_conflict = bindings.iter().enumerate().any(|(other_index, other)| {
            other_index != index
                && other
                    .parsed
                    .map(|other_shortcut| other_shortcut.id() == shortcut.id())
                    .unwrap_or(false)
        });
        if has_conflict {
            bindings[index].snapshot.status = STATUS_CONFLICT.to_string();
            bindings[index].snapshot.message =
                "Shortcut is already assigned to another action.".to_string();
            bindings[index].parsed = None;
        }
    }

    if let Err(error) = app.global_shortcut().unregister_all() {
        eprintln!("unregister shortcuts failed: {}", error);
    }

    for binding in bindings.iter_mut() {
        register_binding(app, binding);
    }

    let snapshot = ShortcutSettingsSnapshot {
        panel_binding: bindings[0].snapshot.clone(),
        overlay_binding: bindings[1].snapshot.clone(),
        sticky_hide_binding: bindings[2].snapshot.clone(),
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
        ShortcutAction::ToggleStickyHide => {
            #[cfg(target_os = "windows")]
            let intent = Arc::new(Mutex::new(StickyShortcutIntent::default()));
            app.global_shortcut()
                .on_shortcut(shortcut, move |app, _, event| {
                    #[cfg(target_os = "windows")]
                    {
                        let accepted = intent
                            .lock()
                            .map(|mut intent| intent.handle(event.state, Instant::now()))
                            .unwrap_or(false);
                        if accepted {
                            crate::desktop::shortcut_hide_or_reveal(app);
                        }
                    }

                    #[cfg(not(target_os = "windows"))]
                    if event.state == ShortcutState::Pressed {
                        crate::desktop::shortcut_hide_or_reveal(app);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sticky_shortcut_rejects_instantaneous_wake_pair() {
        let start = Instant::now();
        let mut intent = StickyShortcutIntent::default();

        assert!(!intent.handle(ShortcutState::Pressed, start));
        assert!(!intent.handle(ShortcutState::Released, start + Duration::from_millis(5)));
    }

    #[test]
    fn sticky_shortcut_accepts_deliberate_press_and_release() {
        let start = Instant::now();
        let mut intent = StickyShortcutIntent::default();

        assert!(!intent.handle(ShortcutState::Pressed, start));
        assert!(intent.handle(ShortcutState::Released, start + Duration::from_millis(80)));
    }

    #[test]
    fn sticky_shortcut_rejects_stale_press_across_sleep() {
        let start = Instant::now();
        let mut intent = StickyShortcutIntent::default();

        assert!(!intent.handle(ShortcutState::Pressed, start));
        assert!(!intent.handle(ShortcutState::Released, start + Duration::from_secs(3)));
    }
}
