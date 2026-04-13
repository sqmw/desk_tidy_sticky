use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct OverlayInputState(pub Arc<Mutex<bool>>);

impl OverlayInputState {
    pub fn toggle(&self) -> bool {
        let mut guard = self.0.lock().expect("overlay input mutex poisoned");
        *guard = !*guard;
        *guard
    }
}

impl Default for OverlayInputState {
    fn default() -> Self {
        // Start in click-through mode so newly pinned notes follow their own z-order policy
        // and default to desktop-bottom unless explicitly set always-on-top.
        Self(Arc::new(Mutex::new(true)))
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BreakReminderWatchSnapshot {
    pub enabled: bool,
    pub active_break_kind: String,
    pub mini_due_at_ms: i64,
    pub long_due_at_ms: i64,
}

#[derive(Debug, Clone, Default)]
pub struct BreakReminderWatchInner {
    pub enabled: bool,
    pub active_break_kind: String,
    pub mini_due_at_ms: i64,
    pub long_due_at_ms: i64,
    pub last_emitted_due_at_ms: i64,
}

#[derive(Clone, Default)]
pub struct BreakReminderWatchState(Arc<Mutex<BreakReminderWatchInner>>);

impl BreakReminderWatchState {
    pub fn update(&self, snapshot: BreakReminderWatchSnapshot) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "break reminder watchdog mutex poisoned".to_string())?;
        guard.enabled = snapshot.enabled;
        guard.active_break_kind = snapshot.active_break_kind;
        guard.mini_due_at_ms = snapshot.mini_due_at_ms.max(0);
        guard.long_due_at_ms = snapshot.long_due_at_ms.max(0);
        if !guard.enabled
            || !guard.active_break_kind.is_empty()
            || (guard.mini_due_at_ms <= 0 && guard.long_due_at_ms <= 0)
        {
            guard.last_emitted_due_at_ms = 0;
        }
        Ok(())
    }

    pub fn snapshot(&self) -> Result<BreakReminderWatchInner, String> {
        self.0
            .lock()
            .map_err(|_| "break reminder watchdog mutex poisoned".to_string())
            .map(|guard| guard.clone())
    }

    pub fn mark_emitted(&self, due_at_ms: i64) -> Result<bool, String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "break reminder watchdog mutex poisoned".to_string())?;
        if guard.last_emitted_due_at_ms == due_at_ms {
            return Ok(false);
        }
        guard.last_emitted_due_at_ms = due_at_ms;
        Ok(true)
    }
}

#[derive(Debug, Clone, Default)]
struct BreakOverlayPresentationInner {
    restore_regular_policy: bool,
    captured: bool,
}

#[derive(Clone, Default)]
pub struct BreakOverlayPresentationState(Arc<Mutex<BreakOverlayPresentationInner>>);

impl BreakOverlayPresentationState {
    pub fn capture(&self, restore_regular_policy: bool) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "break overlay presentation mutex poisoned".to_string())?;
        guard.restore_regular_policy = restore_regular_policy;
        guard.captured = true;
        Ok(())
    }

    pub fn take_restore_regular_policy(&self) -> Result<Option<bool>, String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "break overlay presentation mutex poisoned".to_string())?;
        if !guard.captured {
            return Ok(None);
        }
        let value = guard.restore_regular_policy;
        guard.captured = false;
        Ok(Some(value))
    }
}
