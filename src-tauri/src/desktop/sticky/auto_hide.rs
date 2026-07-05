use crate::notes::{
    self, service as notes_service, AUTO_HIDE_REASON_OVERFLOW, AUTO_HIDE_REASON_SHORTCUT,
    AUTO_HIDE_STATE_HIDDEN, AUTO_HIDE_STATE_VISIBLE,
};
use crate::runtime::ActiveTopmostStickyState;
use tauri::{Emitter, Manager};

const OVERFLOW_HIDE_THRESHOLD_PX: f64 = 1.0;
const HIDDEN_SLIVER_PX: f64 = 8.0;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyAutoHideResult {
    pub note: notes::Note,
    pub edge: String,
    pub state: String,
    pub reason: String,
    pub moved: bool,
}

#[derive(Debug, Clone, Copy)]
struct Rect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl Rect {
    fn right(self) -> f64 {
        self.x + self.width
    }

    fn bottom(self) -> f64 {
        self.y + self.height
    }

    fn center_x(self) -> f64 {
        self.x + self.width / 2.0
    }

    fn center_y(self) -> f64 {
        self.y + self.height / 2.0
    }

    fn contains_point(self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.right() && y >= self.y && y <= self.bottom()
    }
}

fn emit_notes_changed(app: &tauri::AppHandle) {
    let _ = app.emit("notes_changed", ());
}

fn is_auto_hide_eligible(note: &notes::Note) -> bool {
    note.is_pinned && note.is_always_on_top && !note.is_archived && !note.is_deleted
}

fn note_window_label(id: &str) -> String {
    format!("note-{}", id)
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    if max <= min {
        return min;
    }
    value.clamp(min, max)
}

fn window_rect(window: &tauri::WebviewWindow) -> Result<Rect, String> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    let raw_scale = window.scale_factor().map_err(|e| e.to_string())?;
    let scale = if raw_scale.is_finite() && raw_scale > 0.0 {
        raw_scale
    } else {
        1.0
    };
    Ok(Rect {
        x: position.x as f64 / scale,
        y: position.y as f64 / scale,
        width: (size.width as f64 / scale).max(1.0),
        height: (size.height as f64 / scale).max(1.0),
    })
}

fn monitor_rects(app: &tauri::AppHandle) -> Result<Vec<Rect>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let rects = monitors
        .into_iter()
        .map(|monitor| {
            let raw_scale = monitor.scale_factor();
            let scale = if raw_scale.is_finite() && raw_scale > 0.0 {
                raw_scale
            } else {
                1.0
            };
            let position = monitor.position();
            let size = monitor.size();
            Rect {
                x: position.x as f64 / scale,
                y: position.y as f64 / scale,
                width: size.width as f64 / scale,
                height: size.height as f64 / scale,
            }
        })
        .collect::<Vec<_>>();
    if rects.is_empty() {
        return Err("no monitor available".to_string());
    }
    Ok(rects)
}

fn resolve_window_monitor(app: &tauri::AppHandle, rect: Rect) -> Result<Rect, String> {
    let rects = monitor_rects(app)?;
    let center_x = rect.center_x();
    let center_y = rect.center_y();
    if let Some(monitor) = rects
        .iter()
        .copied()
        .find(|monitor| monitor.contains_point(center_x, center_y))
    {
        return Ok(monitor);
    }

    rects
        .into_iter()
        .min_by(|a, b| {
            let da = (a.center_x() - center_x).powi(2) + (a.center_y() - center_y).powi(2);
            let db = (b.center_x() - center_x).powi(2) + (b.center_y() - center_y).powi(2);
            da.partial_cmp(&db).unwrap_or(std::cmp::Ordering::Equal)
        })
        .ok_or_else(|| "no monitor available".to_string())
}

fn overflow_edge(window: Rect, monitor: Rect) -> Option<&'static str> {
    let candidates = [
        ("left", monitor.x - window.x),
        ("right", window.right() - monitor.right()),
        ("top", monitor.y - window.y),
        ("bottom", window.bottom() - monitor.bottom()),
    ];
    candidates
        .into_iter()
        .filter(|(_, distance)| *distance > OVERFLOW_HIDE_THRESHOLD_PX)
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(edge, _)| edge)
}

fn nearest_edge(window: Rect, monitor: Rect, preferred: Option<&str>) -> &'static str {
    if matches!(preferred, Some("left" | "right" | "top" | "bottom")) {
        return match preferred.unwrap() {
            "left" => "left",
            "right" => "right",
            "top" => "top",
            "bottom" => "bottom",
            _ => "left",
        };
    }

    let candidates = [
        ("left", (window.x - monitor.x).abs()),
        ("right", (monitor.right() - window.right()).abs()),
        ("top", (window.y - monitor.y).abs()),
        ("bottom", (monitor.bottom() - window.bottom()).abs()),
    ];
    candidates
        .into_iter()
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(edge, _)| edge)
        .unwrap_or("left")
}

fn hidden_position(window: Rect, monitor: Rect, edge: &str) -> (f64, f64) {
    match edge {
        "left" => (
            monitor.x - window.width + HIDDEN_SLIVER_PX,
            clamp(window.y, monitor.y, monitor.bottom() - window.height),
        ),
        "right" => (
            monitor.right() - HIDDEN_SLIVER_PX,
            clamp(window.y, monitor.y, monitor.bottom() - window.height),
        ),
        "top" => (
            clamp(window.x, monitor.x, monitor.right() - window.width),
            monitor.y - window.height + HIDDEN_SLIVER_PX,
        ),
        "bottom" => (
            clamp(window.x, monitor.x, monitor.right() - window.width),
            monitor.bottom() - HIDDEN_SLIVER_PX,
        ),
        _ => (window.x, window.y),
    }
}

fn visible_position(note: &notes::Note, window: Rect, monitor: Rect) -> (f64, f64) {
    let x = note.auto_hide_visible_x.unwrap_or(window.x);
    let y = note.auto_hide_visible_y.unwrap_or(window.y);
    (
        clamp(x, monitor.x, monitor.right() - window.width),
        clamp(y, monitor.y, monitor.bottom() - window.height),
    )
}

fn move_window_without_activation(
    window: tauri::WebviewWindow,
    x: f64,
    y: f64,
) -> Result<(), String> {
    super::move_note_window_without_activation(window, x, y)
}

fn clear_active_if_matches(app: &tauri::AppHandle, id: &str) {
    if let Some(state) = app.try_state::<ActiveTopmostStickyState>() {
        let _ = state.clear_if_matches(id);
    }
}

pub fn shortcut_hide_or_reveal(app: &tauri::AppHandle) {
    match toggle_hidden_stickies(app.clone()) {
        Ok(_) => {}
        Err(error) => eprintln!("sticky auto hide shortcut failed: {}", error),
    }
}

#[tauri::command]
pub fn mark_active_topmost_editing_sticky(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let Some(note) = notes_service::find_note(&id)? else {
        clear_active_if_matches(&app, &id);
        return Ok(());
    };
    if !is_auto_hide_eligible(&note) {
        clear_active_if_matches(&app, &id);
        return Ok(());
    }
    let Some(state) = app.try_state::<ActiveTopmostStickyState>() else {
        return Err("ActiveTopmostStickyState not found".to_string());
    };
    state.set(id)
}

#[tauri::command]
pub fn clear_active_topmost_editing_sticky(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    clear_active_if_matches(&app, &id);
    Ok(())
}

#[tauri::command]
pub fn set_note_auto_hide_enabled(
    app: tauri::AppHandle,
    id: String,
    enabled: bool,
    sort_mode: String,
) -> Result<Vec<notes::Note>, String> {
    let mode = super::parse_sort_mode(sort_mode.as_str());
    let notes = notes_service::update_note_auto_hide_enabled(&id, enabled, mode)?;
    emit_notes_changed(&app);
    Ok(notes)
}

#[tauri::command]
pub fn hide_note_to_edge(
    app: tauri::AppHandle,
    id: String,
    reason: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(note) = notes_service::find_note(&id)? else {
        return Ok(None);
    };
    if !is_auto_hide_eligible(&note) {
        clear_active_if_matches(&app, &id);
        return Ok(None);
    }
    let normalized_reason = match reason.as_str() {
        AUTO_HIDE_REASON_OVERFLOW => AUTO_HIDE_REASON_OVERFLOW,
        AUTO_HIDE_REASON_SHORTCUT => AUTO_HIDE_REASON_SHORTCUT,
        _ => AUTO_HIDE_REASON_SHORTCUT,
    };
    if normalized_reason == AUTO_HIDE_REASON_OVERFLOW && !note.auto_hide_enabled {
        return Ok(None);
    }

    let label = note_window_label(&id);
    let Some(window) = app.get_webview_window(label.as_str()) else {
        return Ok(None);
    };
    let rect = window_rect(&window)?;
    let monitor = resolve_window_monitor(&app, rect)?;
    let edge = if normalized_reason == AUTO_HIDE_REASON_OVERFLOW {
        let Some(edge) = overflow_edge(rect, monitor) else {
            return Ok(None);
        };
        edge
    } else {
        nearest_edge(rect, monitor, note.auto_hide_edge.as_deref())
    };
    let hidden = hidden_position(rect, monitor, edge);
    move_window_without_activation(window, hidden.0, hidden.1)?;
    let updated = notes_service::update_note_auto_hide_state(
        &id,
        edge,
        AUTO_HIDE_STATE_HIDDEN,
        Some(normalized_reason),
        Some((rect.x, rect.y)),
        Some(hidden),
    )?;
    emit_notes_changed(&app);
    Ok(Some(StickyAutoHideResult {
        note: updated,
        edge: edge.to_string(),
        state: AUTO_HIDE_STATE_HIDDEN.to_string(),
        reason: normalized_reason.to_string(),
        moved: true,
    }))
}

#[tauri::command]
pub fn reveal_note_from_edge(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(note) = notes_service::find_note(&id)? else {
        return Ok(None);
    };
    if !is_auto_hide_eligible(&note) {
        clear_active_if_matches(&app, &id);
        return Ok(None);
    }
    let label = note_window_label(&id);
    let Some(window) = app.get_webview_window(label.as_str()) else {
        return Ok(None);
    };
    let rect = window_rect(&window)?;
    let monitor = resolve_window_monitor(&app, rect)?;
    let visible = visible_position(&note, rect, monitor);
    let _ = window.show();
    move_window_without_activation(window, visible.0, visible.1)?;
    let edge = note.auto_hide_edge.as_deref().unwrap_or("left").to_string();
    let updated = notes_service::update_note_auto_hide_state(
        &id,
        &edge,
        AUTO_HIDE_STATE_VISIBLE,
        None,
        Some(visible),
        None,
    )?;
    emit_notes_changed(&app);
    Ok(Some(StickyAutoHideResult {
        note: updated,
        edge,
        state: AUTO_HIDE_STATE_VISIBLE.to_string(),
        reason: "reveal".to_string(),
        moved: true,
    }))
}

#[tauri::command]
pub fn hide_active_topmost_editing_sticky(
    app: tauri::AppHandle,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(state) = app.try_state::<ActiveTopmostStickyState>() else {
        return Err("ActiveTopmostStickyState not found".to_string());
    };
    let Some(id) = state.snapshot()? else {
        return Ok(None);
    };
    hide_note_to_edge(app, id, AUTO_HIDE_REASON_SHORTCUT.to_string())
}

#[tauri::command]
pub fn toggle_hidden_stickies(app: tauri::AppHandle) -> Result<Vec<StickyAutoHideResult>, String> {
    let hidden = notes_service::hidden_notes()?;
    if hidden.is_empty() {
        return hide_active_topmost_editing_sticky(app).map(|result| result.into_iter().collect());
    }

    let mut results = Vec::new();
    for note in hidden {
        if let Some(result) = reveal_note_from_edge(app.clone(), note.id)? {
            results.push(result);
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(x: f64, y: f64, width: f64, height: f64) -> Rect {
        Rect {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn overflow_edge_picks_largest_overflow() {
        let monitor = rect(0.0, 0.0, 1000.0, 800.0);
        assert_eq!(
            overflow_edge(rect(-12.0, 10.0, 200.0, 200.0), monitor),
            Some("left")
        );
        assert_eq!(
            overflow_edge(rect(850.0, 10.0, 200.0, 200.0), monitor),
            Some("right")
        );
        assert_eq!(
            overflow_edge(rect(10.0, -9.0, 200.0, 200.0), monitor),
            Some("top")
        );
        assert_eq!(
            overflow_edge(rect(10.0, 720.0, 200.0, 120.0), monitor),
            Some("bottom")
        );
        assert_eq!(overflow_edge(rect(10.0, 10.0, 200.0, 200.0), monitor), None);
    }

    #[test]
    fn hidden_position_keeps_a_visible_sliver() {
        let monitor = rect(0.0, 0.0, 1000.0, 800.0);
        let window = rect(100.0, 120.0, 300.0, 220.0);
        assert_eq!(hidden_position(window, monitor, "left"), (-292.0, 120.0));
        assert_eq!(hidden_position(window, monitor, "right"), (992.0, 120.0));
        assert_eq!(hidden_position(window, monitor, "top"), (100.0, -212.0));
        assert_eq!(hidden_position(window, monitor, "bottom"), (100.0, 792.0));
    }

    #[test]
    fn nearest_edge_can_reuse_previous_edge() {
        let monitor = rect(0.0, 0.0, 1000.0, 800.0);
        let window = rect(420.0, 120.0, 200.0, 200.0);
        assert_eq!(nearest_edge(window, monitor, Some("right")), "right");
        assert_eq!(nearest_edge(window, monitor, Some("unknown")), "top");
    }
}
