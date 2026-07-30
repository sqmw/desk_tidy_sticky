use crate::notes::{service as notes_service, store as notes_store, NoteSortMode};
#[cfg(not(target_os = "macos"))]
use tauri::{
    utils::config::WindowEffectsConfig,
    window::{Effect, EffectsBuilder},
};
use tauri::{window::Color, Manager};
#[cfg(target_os = "macos")]
use window_vibrancy::{
    apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial, NSVisualEffectState,
};

const NATIVE_FROST_THRESHOLD: f64 = 0.02;
const TRANSPARENT: Color = Color(0, 0, 0, 0);

fn clamp_frost(frost: f64) -> f64 {
    frost.clamp(0.0, 1.0)
}

#[cfg(not(target_os = "macos"))]
fn clear_window_effects(window: &tauri::WebviewWindow) -> Result<(), String> {
    window
        .set_effects(Option::<WindowEffectsConfig>::None)
        .map_err(|e| e.to_string())
}

fn set_transparent_window_surface(window: &tauri::WebviewWindow) -> Result<(), String> {
    window
        .set_background_color(Some(TRANSPARENT))
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn apply_platform_note_effect(window: &tauri::WebviewWindow, frost: f64) -> Result<bool, String> {
    let frost = clamp_frost(frost);
    let should_apply = frost > NATIVE_FROST_THRESHOLD;
    let effect_window = window.clone();
    window
        .run_on_main_thread(move || {
            // Tauri 2 does not clear macOS vibrancy for set_effects(None).
            while matches!(clear_vibrancy(&effect_window), Ok(true)) {}
            if should_apply {
                let _ = apply_vibrancy(
                    &effect_window,
                    NSVisualEffectMaterial::HudWindow,
                    Some(NSVisualEffectState::Active),
                    Some(10.0 + frost * 8.0),
                );
            }
        })
        .map_err(|e| e.to_string())?;
    Ok(should_apply)
}

#[cfg(target_os = "windows")]
fn build_note_window_effects(frost: f64) -> Option<WindowEffectsConfig> {
    let frost = clamp_frost(frost);
    if frost <= NATIVE_FROST_THRESHOLD {
        return None;
    }

    let tint_alpha = (18.0 + frost * 54.0).round() as u8;
    Some(
        EffectsBuilder::new()
            .effect(Effect::Acrylic)
            .color(Color(255, 255, 255, tint_alpha))
            .build(),
    )
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn build_note_window_effects(_frost: f64) -> Option<WindowEffectsConfig> {
    None
}

#[cfg(not(target_os = "macos"))]
fn apply_platform_note_effect(window: &tauri::WebviewWindow, frost: f64) -> Result<bool, String> {
    let Some(effects) = build_note_window_effects(frost) else {
        clear_window_effects(window)?;
        return Ok(false);
    };

    clear_window_effects(window)?;
    window
        .set_effects(Some(effects))
        .map_err(|e| e.to_string())?;
    Ok(true)
}

pub(crate) fn apply_note_window_frost_to_window(
    window: &tauri::WebviewWindow,
    frost: f64,
) -> Result<bool, String> {
    let _ = set_transparent_window_surface(window);
    apply_platform_note_effect(window, frost)
}

pub(crate) fn apply_note_window_frost_by_label(
    app: &tauri::AppHandle,
    label: &str,
    frost: f64,
) -> Result<bool, String> {
    let Some(window) = app.get_webview_window(label) else {
        return Ok(false);
    };
    apply_note_window_frost_to_window(&window, frost)
}

pub(crate) fn sync_note_window_frost_by_id(
    app: &tauri::AppHandle,
    id: &str,
) -> Result<bool, String> {
    let notes =
        notes_store::with_notes_store(app, || notes_service::load_notes(NoteSortMode::Custom))?;
    let Some(note) = notes.into_iter().find(|note| note.id == id) else {
        return Ok(false);
    };
    let label = format!("note-{}", note.id);
    apply_note_window_frost_by_label(app, &label, note.frost.unwrap_or_default())
}

#[tauri::command]
pub fn apply_note_window_frost(
    app: tauri::AppHandle,
    label: String,
    frost: f64,
) -> Result<bool, String> {
    apply_note_window_frost_by_label(&app, &label, frost)
}
