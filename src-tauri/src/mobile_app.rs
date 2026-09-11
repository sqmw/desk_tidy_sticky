use crate::plugins;

/// Thin product entry: desktop note/tray code is intentionally not booted here.
pub(crate) fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            plugins::commands::plugin_preview,
            plugins::commands::plugin_status,
            plugins::commands::plugin_install,
            plugins::commands::plugin_open,
            plugins::commands::plugin_lifecycle,
            plugins::commands::plugin_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mobile product");
}
