#[cfg(target_os = "windows")]
pub(crate) fn window_hwnd_isize(window: &tauri::WebviewWindow) -> Result<Option<isize>, String> {
    match window.hwnd() {
        Ok(v) => Ok(Some(v.0 as isize)),
        Err(e) => {
            let msg = e.to_string();
            if msg
                .to_lowercase()
                .contains("underlying handle is not available")
            {
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn window_ns_window_ptr(
    window: &tauri::WebviewWindow,
) -> Result<Option<*mut std::ffi::c_void>, String> {
    match window.ns_window() {
        Ok(v) => Ok(Some(v)),
        Err(e) => {
            let msg = e.to_string();
            let normalized = msg.to_lowercase();
            if normalized.contains("underlying handle is not available")
                || normalized.contains("invalid window handle")
            {
                Ok(None)
            } else {
                Err(msg)
            }
        }
    }
}

#[cfg(target_os = "macos")]
pub(crate) fn run_macos_window_op(
    window: &tauri::WebviewWindow,
    op_name: &'static str,
    op: impl FnOnce(*mut std::ffi::c_void) -> Result<(), String> + Send + 'static,
) -> Result<(), String> {
    let Some(ns_window_ptr) = window_ns_window_ptr(window)? else {
        return Ok(());
    };
    let ns_window_addr = ns_window_ptr as usize;
    window
        .run_on_main_thread(move || {
            let ptr = ns_window_addr as *mut std::ffi::c_void;
            if let Err(error) = op(ptr) {
                eprintln!("{op_name} failed: {error}");
            }
        })
        .map_err(|e| e.to_string())
}
