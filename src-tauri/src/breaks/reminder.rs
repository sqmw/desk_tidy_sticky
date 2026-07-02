use crate::desktop::ensure_hidden_workspace_runtime_window;
use crate::runtime::{BreakReminderWatchSnapshot, BreakReminderWatchState};
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

fn resolve_break_due_kind(
    long_due_at_ms: i64,
    mini_due_at_ms: i64,
    now_ms: i64,
) -> Option<(&'static str, i64)> {
    if long_due_at_ms <= 0 && mini_due_at_ms <= 0 {
        return None;
    }
    if long_due_at_ms > 0 && now_ms >= long_due_at_ms {
        return Some(("long", long_due_at_ms));
    }
    if mini_due_at_ms > 0 && now_ms >= mini_due_at_ms {
        return Some(("mini", mini_due_at_ms));
    }
    None
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
    let Some((kind, due_at_ms)) =
        resolve_break_due_kind(snapshot.long_due_at_ms, snapshot.mini_due_at_ms, now_ms)
    else {
        return Ok(false);
    };
    if !state.mark_emitted(due_at_ms)? {
        return Ok(false);
    }
    ensure_hidden_workspace_runtime_window(app_handle);
    let payload = BreakReminderDuePayload {
        kind: kind.to_string(),
        due_at_ms,
    };
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
