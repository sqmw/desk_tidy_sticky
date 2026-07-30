use tauri::Manager;

#[cfg(target_os = "macos")]
#[allow(deprecated)]
use tauri_nspanel::{
    cocoa::appkit::NSWindowCollectionBehavior, ManagerExt as PanelManagerExt,
    WebviewWindowExt as PanelWebviewWindowExt,
};

#[cfg(target_os = "macos")]
const NS_WINDOW_STYLE_MASK_RESIZABLE: i32 = 1 << 3;
#[cfg(target_os = "macos")]
const NS_WINDOW_STYLE_MASK_NONACTIVATING_PANEL: i32 = 1 << 7;

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn base_note_panel_collection_behaviour() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
}

#[tauri::command]
pub fn configure_note_panel_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let Some(window) = app.get_webview_window(label.as_str()) else {
            return Ok(());
        };

        window
            .set_background_color(Some(tauri::window::Color(0, 0, 0, 0)))
            .map_err(|e| e.to_string())?;
        let panel = window.to_panel().map_err(|e| e.to_string())?;
        panel.set_opaque(false);
        panel.set_has_shadow(false);
        panel.set_floating_panel(true);
        panel.set_style_mask(
            NS_WINDOW_STYLE_MASK_NONACTIVATING_PANEL | NS_WINDOW_STYLE_MASK_RESIZABLE,
        );
        panel.set_collection_behaviour(base_note_panel_collection_behaviour());
        panel.set_released_when_closed(false);
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, label);
        Ok(())
    }
}

#[tauri::command]
pub fn dismiss_note_window_by_label(app: tauri::AppHandle, label: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(panel) = app.get_webview_panel(label.as_str()) {
            panel.order_out(None);
            return Ok(());
        }

        if let Some(window) = app.get_webview_window(label.as_str()) {
            window.hide().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        if let Some(window) = app.get_webview_window(label.as_str()) {
            window.close().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
