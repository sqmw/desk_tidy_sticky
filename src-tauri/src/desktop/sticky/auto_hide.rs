use crate::notes::{
    self, service as notes_service, store as notes_store, AUTO_HIDE_REASON_OVERFLOW,
    AUTO_HIDE_REASON_SHORTCUT, AUTO_HIDE_STATE_HIDDEN, AUTO_HIDE_STATE_VISIBLE,
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

#[derive(Debug, Clone, Copy)]
struct WindowGeometry {
    outer: Rect,
    body: Rect,
    body_offset_x: f64,
    body_offset_y: f64,
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

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct StickyMetadataChangedEvent {
    kind: &'static str,
    note_id: String,
    window_layer_changed: bool,
}

fn emit_notes_changed(app: &tauri::AppHandle, id: &str) {
    let _ = app.emit(
        "notes_changed",
        StickyMetadataChangedEvent {
            kind: "metadata",
            note_id: id.to_string(),
            window_layer_changed: false,
        },
    );
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

fn position_matches(position: Option<f64>, expected: f64) -> bool {
    position
        .map(|position| (position - expected).abs() <= 0.5)
        .unwrap_or(false)
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

fn note_window_geometry(note: &notes::Note, outer: Rect) -> WindowGeometry {
    let body_width = note.width.unwrap_or(outer.width).clamp(1.0, outer.width);
    let body_height = note.height.unwrap_or(outer.height).clamp(1.0, outer.height);
    let max_offset_x = (outer.width - body_width).max(0.0);
    let max_offset_y = (outer.height - body_height).max(0.0);
    let body_offset_x = clamp(note.x.unwrap_or(outer.x) - outer.x, 0.0, max_offset_x);
    let body_offset_y = clamp(note.y.unwrap_or(outer.y) - outer.y, 0.0, max_offset_y);
    WindowGeometry {
        outer,
        body: Rect {
            x: outer.x + body_offset_x,
            y: outer.y + body_offset_y,
            width: body_width,
            height: body_height,
        },
        body_offset_x,
        body_offset_y,
    }
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
            let work_area = monitor.work_area();
            Rect {
                x: work_area.position.x as f64 / scale,
                y: work_area.position.y as f64 / scale,
                width: work_area.size.width as f64 / scale,
                height: work_area.size.height as f64 / scale,
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

fn hidden_position(body: Rect, monitor: Rect, edge: &str) -> (f64, f64) {
    match edge {
        "left" => (
            monitor.x - body.width + HIDDEN_SLIVER_PX,
            clamp(body.y, monitor.y, monitor.bottom() - body.height),
        ),
        "right" => (
            monitor.right() - HIDDEN_SLIVER_PX,
            clamp(body.y, monitor.y, monitor.bottom() - body.height),
        ),
        "top" => (
            clamp(body.x, monitor.x, monitor.right() - body.width),
            monitor.y - body.height + HIDDEN_SLIVER_PX,
        ),
        "bottom" => (
            clamp(body.x, monitor.x, monitor.right() - body.width),
            monitor.bottom() - HIDDEN_SLIVER_PX,
        ),
        _ => (body.x, body.y),
    }
}

fn hidden_restore_reference(note: &notes::Note, fallback: Rect, edge: &str) -> Rect {
    let visible_x = note.auto_hide_visible_x;
    let visible_y = note.auto_hide_visible_y;
    let hidden_x = note.auto_hide_hidden_x.or(note.x);
    let hidden_y = note.auto_hide_hidden_y.or(note.y);
    let (x, y) = match edge {
        "left" | "right" => (
            hidden_x.or(visible_x).unwrap_or(fallback.x),
            visible_y.or(hidden_y).unwrap_or(fallback.y),
        ),
        "top" | "bottom" => (
            visible_x.or(hidden_x).unwrap_or(fallback.x),
            hidden_y.or(visible_y).unwrap_or(fallback.y),
        ),
        _ => (
            visible_x.or(hidden_x).unwrap_or(fallback.x),
            visible_y.or(hidden_y).unwrap_or(fallback.y),
        ),
    };
    Rect {
        x,
        y,
        width: fallback.width,
        height: fallback.height,
    }
}

fn visible_position(note: &notes::Note, body: Rect, monitor: Rect) -> (f64, f64) {
    let x = note.auto_hide_visible_x.unwrap_or(body.x);
    let y = note.auto_hide_visible_y.unwrap_or(body.y);
    (
        clamp(x, monitor.x, monitor.right() - body.width),
        clamp(y, monitor.y, monitor.bottom() - body.height),
    )
}

fn outer_position_for_body(geometry: WindowGeometry, body_position: (f64, f64)) -> (f64, f64) {
    (
        body_position.0 - geometry.body_offset_x,
        body_position.1 - geometry.body_offset_y,
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
    let note = notes_store::with_notes_store(&app, || notes_service::find_note(&id))?;
    let Some(note) = note else {
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
    let notes = notes_store::with_notes_store(&app, || {
        notes_service::update_note_auto_hide_enabled(&id, enabled, mode)
    })?;
    emit_notes_changed(&app, &id);
    Ok(notes)
}

fn hide_note_to_edge_unlocked(
    app: &tauri::AppHandle,
    id: &str,
    reason: &str,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(note) = notes_service::find_note(id)? else {
        return Ok(None);
    };
    if !is_auto_hide_eligible(&note) {
        clear_active_if_matches(app, id);
        return Ok(None);
    }
    let normalized_reason = match reason {
        AUTO_HIDE_REASON_OVERFLOW => AUTO_HIDE_REASON_OVERFLOW,
        AUTO_HIDE_REASON_SHORTCUT => AUTO_HIDE_REASON_SHORTCUT,
        _ => AUTO_HIDE_REASON_SHORTCUT,
    };
    if normalized_reason == AUTO_HIDE_REASON_OVERFLOW && !note.auto_hide_enabled {
        return Ok(None);
    }

    let label = note_window_label(id);
    let Some(window) = app.get_webview_window(label.as_str()) else {
        return Ok(None);
    };
    let geometry = note_window_geometry(&note, window_rect(&window)?);
    let monitor = resolve_window_monitor(app, geometry.body)?;
    let edge = if normalized_reason == AUTO_HIDE_REASON_OVERFLOW {
        let Some(edge) = overflow_edge(geometry.body, monitor) else {
            return Ok(None);
        };
        edge
    } else {
        nearest_edge(geometry.body, monitor, note.auto_hide_edge.as_deref())
    };
    let hidden_body = hidden_position(geometry.body, monitor, edge);
    let hidden_outer = outer_position_for_body(geometry, hidden_body);
    move_window_without_activation(window, hidden_outer.0, hidden_outer.1)?;
    let updated = notes_service::update_note_auto_hide_state(
        id,
        edge,
        AUTO_HIDE_STATE_HIDDEN,
        Some(normalized_reason),
        Some((geometry.body.x, geometry.body.y)),
        Some(hidden_body),
    )?;
    Ok(Some(StickyAutoHideResult {
        note: updated,
        edge: edge.to_string(),
        state: AUTO_HIDE_STATE_HIDDEN.to_string(),
        reason: normalized_reason.to_string(),
        moved: true,
    }))
}

fn reveal_note_from_edge_unlocked(
    app: &tauri::AppHandle,
    id: &str,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(note) = notes_service::find_note(id)? else {
        return Ok(None);
    };
    if !is_auto_hide_eligible(&note) {
        clear_active_if_matches(app, id);
        return Ok(None);
    }
    let label = note_window_label(id);
    let Some(window) = app.get_webview_window(label.as_str()) else {
        return Ok(None);
    };
    let geometry = note_window_geometry(&note, window_rect(&window)?);
    let monitor = resolve_window_monitor(app, geometry.body)?;
    let visible = visible_position(&note, geometry.body, monitor);
    let visible_outer = outer_position_for_body(geometry, visible);
    let _ = window.show();
    move_window_without_activation(window, visible_outer.0, visible_outer.1)?;
    let edge = note.auto_hide_edge.as_deref().unwrap_or("left").to_string();
    let updated = notes_service::update_note_auto_hide_state(
        id,
        &edge,
        AUTO_HIDE_STATE_VISIBLE,
        None,
        Some(visible),
        None,
    )?;
    Ok(Some(StickyAutoHideResult {
        note: updated,
        edge,
        state: AUTO_HIDE_STATE_VISIBLE.to_string(),
        reason: "reveal".to_string(),
        moved: true,
    }))
}

fn normalize_note_window_position_unlocked(
    app: &tauri::AppHandle,
    id: &str,
) -> Result<Option<StickyAutoHideResult>, String> {
    let Some(note) = notes_service::find_note(id)? else {
        return Ok(None);
    };
    if !note.is_pinned || note.is_archived || note.is_deleted {
        return Ok(None);
    }
    let Some(window) = app.get_webview_window(note_window_label(id).as_str()) else {
        return Ok(None);
    };
    let geometry = note_window_geometry(&note, window_rect(&window)?);

    if note.auto_hide_state.as_deref() == Some(AUTO_HIDE_STATE_HIDDEN) {
        let edge_hint = note.auto_hide_edge.as_deref().unwrap_or("");
        let restore_reference = hidden_restore_reference(&note, geometry.body, edge_hint);
        let monitor = resolve_window_monitor(app, restore_reference)?;
        let edge = nearest_edge(restore_reference, monitor, note.auto_hide_edge.as_deref());
        let hidden_body = hidden_position(restore_reference, monitor, edge);
        let hidden_outer = outer_position_for_body(geometry, hidden_body);
        let moved = (geometry.outer.x - hidden_outer.0).abs() > 0.5
            || (geometry.outer.y - hidden_outer.1).abs() > 0.5;
        if moved {
            move_window_without_activation(window, hidden_outer.0, hidden_outer.1)?;
        }
        let stored_position_matches = position_matches(note.auto_hide_hidden_x, hidden_body.0)
            && position_matches(note.auto_hide_hidden_y, hidden_body.1)
            && position_matches(note.x, hidden_body.0)
            && position_matches(note.y, hidden_body.1);
        let updated = if stored_position_matches {
            note
        } else {
            notes_service::normalize_note_auto_hide_position(id, None, Some(hidden_body))?
        };
        return Ok(Some(StickyAutoHideResult {
            note: updated,
            edge: edge.to_string(),
            state: AUTO_HIDE_STATE_HIDDEN.to_string(),
            reason: "normalize".to_string(),
            moved,
        }));
    }
    if !note.auto_hide_enabled && note.auto_hide_state.is_none() {
        return Ok(None);
    }

    let monitor = resolve_window_monitor(app, geometry.body)?;
    let visible = (
        clamp(
            geometry.body.x,
            monitor.x,
            monitor.right() - geometry.body.width,
        ),
        clamp(
            geometry.body.y,
            monitor.y,
            monitor.bottom() - geometry.body.height,
        ),
    );
    let visible_outer = outer_position_for_body(geometry, visible);
    let moved = (geometry.outer.x - visible_outer.0).abs() > 0.5
        || (geometry.outer.y - visible_outer.1).abs() > 0.5;
    if moved {
        move_window_without_activation(window, visible_outer.0, visible_outer.1)?;
    }
    let updated = notes_service::normalize_note_auto_hide_position(id, Some(visible), None)?;
    Ok(Some(StickyAutoHideResult {
        note: updated,
        edge: note.auto_hide_edge.unwrap_or_else(|| "none".to_string()),
        state: AUTO_HIDE_STATE_VISIBLE.to_string(),
        reason: "normalize".to_string(),
        moved,
    }))
}

#[tauri::command]
pub fn hide_note_to_edge(
    app: tauri::AppHandle,
    id: String,
    reason: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    let result =
        notes_store::with_notes_store(&app, || hide_note_to_edge_unlocked(&app, &id, &reason))?;
    if result.is_some() {
        emit_notes_changed(&app, &id);
    }
    Ok(result)
}

#[tauri::command]
pub fn reveal_note_from_edge(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    let result = notes_store::with_notes_store(&app, || reveal_note_from_edge_unlocked(&app, &id))?;
    if result.is_some() {
        emit_notes_changed(&app, &id);
    }
    Ok(result)
}

#[tauri::command]
pub fn normalize_note_window_position(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    notes_store::with_notes_store(&app, || normalize_note_window_position_unlocked(&app, &id))
}

#[cfg(target_os = "windows")]
pub(super) fn recover_hidden_note_window_position(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<StickyAutoHideResult>, String> {
    notes_store::with_notes_store(&app, || {
        let Some(note) = notes_service::find_note(&id)? else {
            return Ok(None);
        };
        if note.auto_hide_state.as_deref() != Some(AUTO_HIDE_STATE_HIDDEN) {
            return Ok(None);
        }
        normalize_note_window_position_unlocked(&app, &id)
    })
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
    let result = notes_store::with_notes_store(&app, || {
        hide_note_to_edge_unlocked(&app, &id, AUTO_HIDE_REASON_SHORTCUT)
    })?;
    if result.is_some() {
        emit_notes_changed(&app, &id);
    }
    Ok(result)
}

#[tauri::command]
pub fn toggle_hidden_stickies(app: tauri::AppHandle) -> Result<Vec<StickyAutoHideResult>, String> {
    let active_note_id = app
        .try_state::<ActiveTopmostStickyState>()
        .map(|state| state.snapshot())
        .transpose()?
        .flatten();
    let results = notes_store::with_notes_store(&app, || {
        let hidden = notes_service::hidden_notes()?;
        if hidden.is_empty() {
            let result = match active_note_id.as_deref() {
                Some(id) => hide_note_to_edge_unlocked(&app, id, AUTO_HIDE_REASON_SHORTCUT)?,
                None => None,
            };
            return Ok(result.into_iter().collect());
        }

        let mut results = Vec::new();
        for note in hidden {
            if let Some(result) = reveal_note_from_edge_unlocked(&app, &note.id)? {
                results.push(result);
            }
        }
        Ok(results)
    })?;
    if !results.is_empty() {
        for result in &results {
            emit_notes_changed(&app, &result.note.id);
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
    fn position_match_tolerates_subpixel_window_rounding() {
        assert!(position_matches(Some(100.0), 100.4));
        assert!(!position_matches(Some(100.0), 100.6));
        assert!(!position_matches(None, 100.0));
    }

    #[test]
    fn hidden_restore_keeps_distinct_positions_after_windows_recreates_offscreen_windows() {
        let monitor = rect(0.0, 0.0, 2560.0, 1440.0);
        let restarted_body = rect(160.0, 0.0, 300.0, 300.0);
        let mut first = notes::Note::new("first".to_string(), true);
        first.auto_hide_edge = Some("top".to_string());
        first.auto_hide_visible_x = Some(140.0);
        first.auto_hide_visible_y = Some(-125.33333333333331);
        first.auto_hide_hidden_x = Some(126.66666666666669);
        first.auto_hide_hidden_y = Some(-292.0);
        let mut second = notes::Note::new("second".to_string(), true);
        second.auto_hide_edge = Some("top".to_string());
        second.auto_hide_visible_x = Some(1876.6666666666667);
        second.auto_hide_visible_y = Some(-173.33333333333334);
        second.auto_hide_hidden_x = Some(177.33333333333334);
        second.auto_hide_hidden_y = Some(-292.0);
        let mut right = notes::Note::new("right".to_string(), true);
        right.auto_hide_edge = Some("right".to_string());
        right.auto_hide_visible_x = Some(2446.6666666666665);
        right.auto_hide_visible_y = Some(640.0);
        right.auto_hide_hidden_x = Some(2552.0);
        right.auto_hide_hidden_y = Some(174.66666666666666);

        let first_reference = hidden_restore_reference(&first, restarted_body, "top");
        let second_reference = hidden_restore_reference(&second, restarted_body, "top");
        let right_reference = hidden_restore_reference(&right, restarted_body, "right");

        assert_eq!(
            hidden_position(first_reference, monitor, "top"),
            (140.0, -292.0)
        );
        assert_eq!(
            hidden_position(second_reference, monitor, "top"),
            (1876.6666666666667, -292.0)
        );
        assert_eq!(
            hidden_position(right_reference, monitor, "right"),
            (2552.0, 640.0)
        );
    }

    #[test]
    fn body_geometry_keeps_expanded_controls_outside_edge_math() {
        let outer = rect(68.0, 62.0, 364.0, 552.0);
        let mut note = notes::Note::new("test".to_string(), true);
        note.x = Some(100.0);
        note.y = Some(120.0);
        note.width = Some(300.0);
        note.height = Some(420.0);
        let geometry = note_window_geometry(&note, outer);

        assert_eq!(geometry.body.x, 100.0);
        assert_eq!(geometry.body.y, 120.0);
        assert_eq!(geometry.body.width, 300.0);
        assert_eq!(geometry.body.height, 420.0);
        assert_eq!(
            outer_position_for_body(geometry, (-292.0, 120.0)),
            (-324.0, 62.0)
        );
    }

    #[test]
    fn visible_position_clamps_disconnected_monitor_coordinates() {
        let monitor = rect(0.0, 24.0, 1000.0, 736.0);
        let body = rect(-1500.0, 900.0, 300.0, 220.0);
        let mut note = notes::Note::new("test".to_string(), true);
        note.auto_hide_visible_x = Some(-1500.0);
        note.auto_hide_visible_y = Some(900.0);

        assert_eq!(visible_position(&note, body, monitor), (0.0, 540.0));
    }

    #[test]
    fn nearest_edge_can_reuse_previous_edge() {
        let monitor = rect(0.0, 0.0, 1000.0, 800.0);
        let window = rect(420.0, 120.0, 200.0, 200.0);
        assert_eq!(nearest_edge(window, monitor, Some("right")), "right");
        assert_eq!(nearest_edge(window, monitor, Some("unknown")), "top");
    }
}
