use std::{sync::mpsc, thread, time::Duration};

use crate::notes::{
    self, service as notes_service, store as notes_store, AUTO_HIDE_REASON_OVERFLOW,
    AUTO_HIDE_STATE_HIDDEN, AUTO_HIDE_STATE_VISIBLE,
};
use tauri::Manager;

const STICKY_AUTO_HIDE_CHECK_ENV: &str = "DESK_TIDY_STICKY_RUNTIME_CHECK";
const STICKY_AUTO_HIDE_CHECK_VALUE: &str = "sticky_auto_hide";
const RUNTIME_CHECK_NOTE_TEXT: &str =
    "# Runtime sticky auto-hide check\n\nGenerated in an isolated runtime check.";

pub(crate) fn maybe_start_sticky_auto_hide_runtime_check(app: &tauri::AppHandle) {
    if std::env::var(STICKY_AUTO_HIDE_CHECK_ENV).ok().as_deref()
        != Some(STICKY_AUTO_HIDE_CHECK_VALUE)
    {
        return;
    }

    let app = app.clone();
    thread::spawn(move || {
        let exit_code = match run_sticky_auto_hide_runtime_check(&app) {
            Ok(()) => {
                eprintln!("[runtime-check] sticky_auto_hide PASS");
                0
            }
            Err(error) => {
                eprintln!("[runtime-check] sticky_auto_hide FAIL: {}", error);
                2
            }
        };
        app.exit(exit_code);
    });
}

fn run_sticky_auto_hide_runtime_check(app: &tauri::AppHandle) -> Result<(), String> {
    eprintln!("[runtime-check] sticky_auto_hide start");
    thread::sleep(Duration::from_millis(700));
    eprintln!("[runtime-check] create note");
    let note_id = create_runtime_check_note(app)?;
    let label = format!("note-{}", note_id);
    eprintln!("[runtime-check] create window {}", label);
    create_runtime_check_note_window(app, &note_id, &label)?;
    eprintln!("[runtime-check] wait for note window");
    thread::sleep(Duration::from_millis(1200));

    eprintln!("[runtime-check] hide active note");
    crate::desktop::mark_active_topmost_editing_sticky(app.clone(), note_id.clone())?;
    let hidden = crate::desktop::hide_active_topmost_editing_sticky(app.clone())?
        .ok_or_else(|| "shortcut hide returned no target".to_string())?;
    if hidden.state != AUTO_HIDE_STATE_HIDDEN {
        return Err(format!("expected hidden state, got {}", hidden.state));
    }
    let hidden_note = notes_store::with_notes_store(app, || notes_service::find_note(&note_id))?
        .ok_or_else(|| "hidden note missing after hide".to_string())?;
    if hidden_note.auto_hide_state.as_deref() != Some(AUTO_HIDE_STATE_HIDDEN) {
        return Err("note was not persisted as hidden".to_string());
    }
    if hidden_note.auto_hide_hidden_x.is_none() || hidden_note.auto_hide_hidden_y.is_none() {
        return Err("hidden position was not persisted".to_string());
    }

    eprintln!("[runtime-check] reveal hidden note");
    let revealed = crate::desktop::toggle_hidden_stickies(app.clone())?;
    if revealed.is_empty() {
        return Err("toggle_hidden_stickies did not reveal any note".to_string());
    }
    let visible_note = notes_store::with_notes_store(app, || notes_service::find_note(&note_id))?
        .ok_or_else(|| "hidden note missing after reveal".to_string())?;
    if visible_note.auto_hide_state.as_deref() != Some(AUTO_HIDE_STATE_VISIBLE) {
        return Err("note was not persisted as visible after reveal".to_string());
    }

    eprintln!("[runtime-check] move note offscreen for overflow hide");
    move_runtime_check_window_partially_offscreen(app, &label)?;
    thread::sleep(Duration::from_millis(250));
    eprintln!("[runtime-check] hide overflowed note");
    let overflow_hidden = crate::desktop::hide_note_to_edge(
        app.clone(),
        note_id.clone(),
        AUTO_HIDE_REASON_OVERFLOW.to_string(),
    )?
    .ok_or_else(|| "overflow hide returned no target".to_string())?;
    if overflow_hidden.state != AUTO_HIDE_STATE_HIDDEN {
        return Err(format!(
            "expected overflow hidden state, got {}",
            overflow_hidden.state
        ));
    }
    let overflow_note = notes_store::with_notes_store(app, || notes_service::find_note(&note_id))?
        .ok_or_else(|| "overflow note missing after hide".to_string())?;
    if overflow_note.auto_hide_state.as_deref() != Some(AUTO_HIDE_STATE_HIDDEN) {
        return Err("overflow note was not persisted as hidden".to_string());
    }
    eprintln!("[runtime-check] reveal overflow hidden note");
    let overflow_revealed = crate::desktop::toggle_hidden_stickies(app.clone())?;
    if overflow_revealed.is_empty() {
        return Err("toggle_hidden_stickies did not reveal overflow-hidden note".to_string());
    }
    Ok(())
}

fn create_runtime_check_note(app: &tauri::AppHandle) -> Result<String, String> {
    notes_store::with_notes_store(app, || {
        let notes = notes_service::add_note(
            RUNTIME_CHECK_NOTE_TEXT.to_string(),
            true,
            notes::NoteSortMode::Custom,
            None,
            Some(vec!["runtime-check".to_string()]),
        )?;
        let note_id = notes
            .iter()
            .find(|note| note.text == RUNTIME_CHECK_NOTE_TEXT)
            .map(|note| note.id.clone())
            .ok_or_else(|| "runtime check note was not created".to_string())?;
        notes_service::update_note_size(&note_id, 320.0, 260.0)?;
        notes_service::update_note_position(&note_id, 120.0, 120.0)?;
        notes_service::toggle_z_order(&note_id, notes::NoteSortMode::Custom)?;
        notes_service::update_note_auto_hide_enabled(&note_id, true, notes::NoteSortMode::Custom)?;
        Ok(note_id)
    })
}

fn create_runtime_check_note_window(
    app: &tauri::AppHandle,
    note_id: &str,
    label: &str,
) -> Result<(), String> {
    let app_for_main = app.clone();
    let note_id = note_id.to_string();
    let label = label.to_string();
    let (sender, receiver) = mpsc::channel();

    app.run_on_main_thread(move || {
        let result = (|| {
            let url = tauri::WebviewUrl::App(format!("/note/{}", note_id).into());
            let window = tauri::WebviewWindowBuilder::new(&app_for_main, &label, url)
                .title("Sticky Note")
                .inner_size(320.0, 260.0)
                .position(120.0, 120.0)
                .decorations(false)
                .transparent(true)
                .background_color(tauri::window::Color(0, 0, 0, 0))
                .always_on_top(false)
                .skip_taskbar(true)
                .resizable(true)
                .maximizable(false)
                .visible(false)
                .devtools(false)
                .build()
                .map_err(|error| error.to_string())?;

            crate::desktop::configure_note_panel_window(app_for_main.clone(), label.clone())?;
            crate::desktop::sync_note_window_layer(app_for_main.clone(), note_id.clone())?;
            window.show().map_err(|error| error.to_string())?;
            Ok(())
        })();
        let _ = sender.send(result);
    })
    .map_err(|error| error.to_string())?;

    receiver
        .recv_timeout(Duration::from_secs(8))
        .map_err(|error| error.to_string())?
}

fn move_runtime_check_window_partially_offscreen(
    app: &tauri::AppHandle,
    label: &str,
) -> Result<(), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .or_else(|| {
            app.available_monitors()
                .ok()
                .and_then(|mut monitors| monitors.drain(..).next())
        })
        .ok_or_else(|| "no monitor available for overflow check".to_string())?;
    let raw_scale = monitor.scale_factor();
    let scale = if raw_scale.is_finite() && raw_scale > 0.0 {
        raw_scale
    } else {
        1.0
    };
    let position = monitor.position();
    let x = position.x as f64 / scale - 12.0;
    let y = position.y as f64 / scale + 80.0;
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| "runtime check note window missing".to_string())?;
    crate::desktop::move_note_window_without_activation(window, x, y)
}
