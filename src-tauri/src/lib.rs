// Keep desktop-only window/runtime dependencies out of mobile product builds.
#[cfg(desktop)]
mod breaks;
#[cfg(desktop)]
mod desktop;
#[cfg(desktop)]
mod markdown_storage;
#[cfg(mobile)]
mod mobile_app;
#[cfg(desktop)]
mod notes;
#[cfg(desktop)]
mod platform;
mod plugins;
#[cfg(desktop)]
mod preferences;
#[cfg(desktop)]
mod runtime;
#[cfg(desktop)]
mod runtime_checks;

// Tauri's exported command macros keep their original crate-root scope.
#[cfg(desktop)]
include!("desktop_app.rs");
#[cfg(mobile)]
#[tauri::mobile_entry_point]
pub fn run() {
    mobile_app::run();
}
