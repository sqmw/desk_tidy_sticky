use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct GlobalControlState(pub Arc<Mutex<bool>>);

impl GlobalControlState {
    pub fn toggle(&self) -> bool {
        let mut guard = self.0.lock().expect("global control mutex poisoned");
        *guard = !*guard;
        *guard
    }
}

impl Default for GlobalControlState {
    fn default() -> Self {
        // Default to "global control off": non-topmost desktop notes stay in their
        // normal desktop / wallpaper layers and only individually topmost notes remain interactive.
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

#[cfg(target_os = "macos")]
#[derive(Debug, Clone, Default)]
struct BreakOverlayPresentationInner {
    restore_regular_policy: bool,
    captured: bool,
}

#[cfg(target_os = "macos")]
#[derive(Clone, Default)]
pub struct BreakOverlayPresentationState(Arc<Mutex<BreakOverlayPresentationInner>>);

#[cfg(target_os = "macos")]
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

#[cfg(not(target_os = "macos"))]
#[derive(Clone, Default)]
pub struct BreakOverlayPresentationState;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutBindingSnapshot {
    pub value: String,
    pub status: String,
    pub message: String,
}

impl Default for ShortcutBindingSnapshot {
    fn default() -> Self {
        Self {
            value: String::new(),
            status: "disabled".to_string(),
            message: String::new(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutSettingsSnapshot {
    pub panel_binding: ShortcutBindingSnapshot,
    pub overlay_binding: ShortcutBindingSnapshot,
    pub sticky_hide_binding: ShortcutBindingSnapshot,
}

#[derive(Clone, Default)]
pub struct ShortcutRuntimeState(Arc<Mutex<ShortcutSettingsSnapshot>>);

impl ShortcutRuntimeState {
    pub fn update(&self, snapshot: ShortcutSettingsSnapshot) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "shortcut runtime mutex poisoned".to_string())?;
        *guard = snapshot;
        Ok(())
    }

    pub fn snapshot(&self) -> Result<ShortcutSettingsSnapshot, String> {
        self.0
            .lock()
            .map_err(|_| "shortcut runtime mutex poisoned".to_string())
            .map(|guard| guard.clone())
    }
}

#[derive(Clone, Default)]
pub struct ActiveTopmostStickyState(Arc<Mutex<Option<String>>>);

impl ActiveTopmostStickyState {
    pub fn set(&self, id: String) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "active topmost sticky mutex poisoned".to_string())?;
        *guard = Some(id);
        Ok(())
    }

    pub fn clear_if_matches(&self, id: &str) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "active topmost sticky mutex poisoned".to_string())?;
        if guard.as_deref() == Some(id) {
            *guard = None;
        }
        Ok(())
    }

    pub fn snapshot(&self) -> Result<Option<String>, String> {
        self.0
            .lock()
            .map_err(|_| "active topmost sticky mutex poisoned".to_string())
            .map(|guard| guard.clone())
    }
}

/// Transparent space a sticky window reserves around its note body in control mode.
///
/// Control mode grows the native window on all four sides so the floating islands
/// can render outside the note rectangle while the body keeps its screen position.
/// Only the note window knows how much it reserved, so it publishes the totals here
/// and the backend subtracts them instead of measuring the native frame a second
/// time. An absent entry means "no reserve", which is also the collapsed state.
#[derive(Clone, Default)]
pub struct StickyWindowReserveState(Arc<Mutex<HashMap<String, (f64, f64)>>>);

impl StickyWindowReserveState {
    pub fn set(&self, note_id: &str, horizontal: f64, vertical: f64) -> Result<(), String> {
        let mut guard = self
            .0
            .lock()
            .map_err(|_| "sticky window reserve mutex poisoned".to_string())?;
        let horizontal = sanitize_reserve(horizontal);
        let vertical = sanitize_reserve(vertical);
        if horizontal <= 0.0 && vertical <= 0.0 {
            guard.remove(note_id);
        } else {
            guard.insert(note_id.to_string(), (horizontal, vertical));
        }
        Ok(())
    }

    /// Returns `(horizontal, vertical)`; unknown windows report no reserve so a
    /// missing report can never inflate a persisted size.
    pub fn get(&self, note_id: &str) -> (f64, f64) {
        self.0
            .lock()
            .ok()
            .and_then(|guard| guard.get(note_id).copied())
            .unwrap_or((0.0, 0.0))
    }
}

fn sanitize_reserve(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unreported_sticky_windows_have_no_reserve() {
        let state = StickyWindowReserveState::default();
        assert_eq!(state.get("missing"), (0.0, 0.0));
    }

    #[test]
    fn collapsing_to_zero_forgets_the_reserve() {
        let state = StickyWindowReserveState::default();
        state.set("one", 64.0, 116.0).expect("store reserve");
        assert_eq!(state.get("one"), (64.0, 116.0));

        state.set("one", 0.0, 0.0).expect("clear reserve");
        assert_eq!(state.get("one"), (0.0, 0.0));
    }

    #[test]
    fn non_finite_and_negative_reserves_are_rejected() {
        let state = StickyWindowReserveState::default();
        state
            .set("one", f64::NAN, -12.0)
            .expect("reject invalid reserve");
        assert_eq!(state.get("one"), (0.0, 0.0));

        state
            .set("two", f64::INFINITY, 40.0)
            .expect("reject infinite reserve");
        assert_eq!(state.get("two"), (0.0, 40.0));
    }
}
