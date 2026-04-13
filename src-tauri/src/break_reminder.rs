use crate::app_state::{BreakReminderWatchSnapshot, BreakReminderWatchState};
use crate::panel_windows::ensure_hidden_workspace_runtime_window;
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BreakReminderDuePayload {
    kind: String,
    due_at_ms: i64,
}

#[tauri::command]
pub fn sync_break_reminder_watchdog(
    state: tauri::State<'_, BreakReminderWatchState>,
    snapshot: BreakReminderWatchSnapshot,
) -> Result<(), String> {
    state.update(snapshot)
}

fn now_unix_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

pub fn process_break_reminder_due(
    app_handle: &tauri::AppHandle,
    state: &BreakReminderWatchState,
) -> Result<bool, String> {
    let snapshot = state.snapshot()?;
    if !snapshot.enabled || !snapshot.active_break_kind.is_empty() {
        return Ok(false);
    }
    let now_ms = now_unix_ms();
    let due = if snapshot.long_due_at_ms > 0 && now_ms >= snapshot.long_due_at_ms {
        Some(("long".to_string(), snapshot.long_due_at_ms))
    } else if snapshot.mini_due_at_ms > 0 && now_ms >= snapshot.mini_due_at_ms {
        Some(("mini".to_string(), snapshot.mini_due_at_ms))
    } else {
        None
    };
    let Some((kind, due_at_ms)) = due else {
        return Ok(false);
    };
    if !state.mark_emitted(due_at_ms)? {
        return Ok(false);
    }
    ensure_hidden_workspace_runtime_window(app_handle);
    #[cfg(target_os = "macos")]
    if let Err(error) = crate::break_overlay::ensure_break_overlay_windows_native(app_handle) {
        eprintln!("ensure native break overlay windows failed: {}", error);
    }
    let payload = BreakReminderDuePayload { kind, due_at_ms };
    app_handle
        .emit("focus_break_due", payload)
        .map_err(|error| error.to_string())?;
    Ok(true)
}

pub fn start_break_reminder_watchdog(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<BreakReminderWatchState>() else {
        return;
    };
    let state = state.inner().clone();
    let app_handle = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_millis(250));
        if let Err(error) = process_break_reminder_due(&app_handle, &state) {
            eprintln!("break reminder watchdog process failed: {}", error);
        }
    });
}
