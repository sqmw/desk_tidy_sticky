use std::ffi::c_void;
use windows::Win32::Foundation::{GetLastError, SetLastError, HWND, WIN32_ERROR};
use windows::Win32::Graphics::Gdi::{SetWindowRgn, HRGN};
use windows::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetParent, GetWindowLongPtrW, IsWindow, SetParent, SetWindowLongPtrW,
    SetWindowPos, GWL_STYLE, HWND_BOTTOM, HWND_NOTOPMOST, HWND_TOP, SWP_FRAMECHANGED,
    SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_CHILD, WS_MAXIMIZEBOX, WS_POPUP,
    WS_THICKFRAME,
};

mod discovery;

static mut WORKER_W: HWND = HWND(0 as *mut c_void);
static mut WALLPAPER_WORKER_W: HWND = HWND(0 as *mut c_void);

fn null_hwnd() -> HWND {
    HWND(std::ptr::null_mut())
}

fn parent_matches(parent: HWND, expected_parent: HWND, desktop: HWND) -> bool {
    parent == expected_parent || (expected_parent == desktop && parent.0.is_null())
}

unsafe fn read_parent(hwnd: HWND) -> Result<HWND, u32> {
    SetLastError(WIN32_ERROR(0));
    match GetParent(hwnd) {
        Ok(parent) => Ok(parent),
        Err(_) => {
            let code = GetLastError().0;
            // windows-rs maps a NULL HWND to Err even though Win32 uses NULL + error 0
            // for a valid top-level window with no parent.
            if code == 0 {
                Ok(null_hwnd())
            } else {
                Err(code)
            }
        }
    }
}

fn set_parent_checked(hwnd: HWND, expected_parent: HWND, phase: &str) -> Result<bool, String> {
    unsafe {
        let desktop = GetDesktopWindow();
        if matches!(read_parent(hwnd), Ok(parent) if parent_matches(parent, expected_parent, desktop))
        {
            return Ok(false);
        }

        SetLastError(WIN32_ERROR(0));
        let _ = SetParent(hwnd, expected_parent);
        let set_parent_error = GetLastError().0;
        let parent_after = read_parent(hwnd);
        if matches!(parent_after, Ok(parent) if parent_matches(parent, expected_parent, desktop)) {
            return Ok(true);
        }
        let code = if set_parent_error != 0 {
            set_parent_error
        } else {
            match parent_after {
                Err(code) => code,
                Ok(_) => 0,
            }
        };
        Err(format!(
            "SetParent {} failed with Win32 error {}",
            phase, code
        ))
    }
}

fn force_bottom_immediately(hwnd: HWND) {
    unsafe {
        // Do not use SWP_NOACTIVATE when sinking: active top-level windows may otherwise
        // stay visually above until another window gets focus.
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, flags);
    }
}

fn force_wallpaper_layer_immediately(hwnd: HWND) {
    unsafe {
        // The wallpaper WorkerW is already below desktop icons. Keep the note at the front of
        // that parent so it stays visible instead of being pushed behind wallpaper siblings.
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_NOACTIVATE;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, flags);
    }
}

fn refresh_style(hwnd: HWND) {
    unsafe {
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
    }
}

fn clear_window_region(hwnd: HWND) {
    unsafe {
        let _ = SetWindowRgn(hwnd, HRGN(std::ptr::null_mut()), true);
    }
}

fn apply_desktop_child_style(hwnd: HWND) {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let next_style = (style | WS_CHILD.0)
            & !WS_POPUP.0
            & !(WS_THICKFRAME.0 as u32)
            & !(WS_MAXIMIZEBOX.0 as u32);
        if next_style != style {
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, next_style as isize);
            refresh_style(hwnd);
        }
        // Windows 10 leaves visible transparent spikes around clipped WorkerW children.
        // Keep the native region rectangular; CSS still controls the visible note surface.
        clear_window_region(hwnd);
    }
}

fn apply_top_level_style(hwnd: HWND) {
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let next_style = (style | WS_POPUP.0 | (WS_THICKFRAME.0 as u32))
            & !WS_CHILD.0
            & !(WS_MAXIMIZEBOX.0 as u32);
        if next_style != style {
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, next_style as isize);
            refresh_style(hwnd);
        }
        clear_window_region(hwnd);
    }
}

fn force_desktop_layer_immediately(hwnd: HWND) {
    unsafe {
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_FRAMECHANGED | SWP_NOACTIVATE;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, flags);
    }
}

fn init_worker_w() -> Result<(), String> {
    discovery::spawn_worker_w()?;
    let worker_w_candidate = discovery::find_desktop_worker_w()?;
    if worker_w_candidate.0.is_null() {
        return Err("WorkerW behind icons not found".to_string());
    }
    unsafe {
        WORKER_W = worker_w_candidate;
    }
    Ok(())
}

fn init_wallpaper_worker_w() -> Result<(), String> {
    discovery::spawn_worker_w()?;
    let worker_w_candidate = discovery::find_wallpaper_worker_w();
    if worker_w_candidate.0.is_null() {
        return Err("Wallpaper WorkerW behind icons not found".to_string());
    }
    unsafe {
        WALLPAPER_WORKER_W = worker_w_candidate;
    }
    Ok(())
}

pub fn attach_to_wallpaper_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("attach_to_wallpaper_worker_w target hwnd invalid".to_string());
        }

        apply_desktop_child_style(hwnd);

        if WALLPAPER_WORKER_W.0.is_null() || !IsWindow(WALLPAPER_WORKER_W).as_bool() {
            if let Err(err) = init_wallpaper_worker_w() {
                eprintln!("init_wallpaper_worker_w failed: {}", err);
                let desktop = GetDesktopWindow();
                if set_parent_checked(hwnd, desktop, "attach_wallpaper_fallback_desktop")
                    .unwrap_or(false)
                {
                    force_bottom_immediately(hwnd);
                }
                return Ok(());
            }
        }

        let mut parent_changed = false;
        let attached = match set_parent_checked(hwnd, WALLPAPER_WORKER_W, "attach_wallpaper") {
            Ok(changed) => {
                parent_changed = changed;
                true
            }
            Err(first_err) => {
                init_wallpaper_worker_w()?;
                if WALLPAPER_WORKER_W.0.is_null() || !IsWindow(WALLPAPER_WORKER_W).as_bool() {
                    false
                } else {
                    match set_parent_checked(hwnd, WALLPAPER_WORKER_W, "attach_wallpaper_retry") {
                        Ok(changed) => {
                            parent_changed = changed;
                            true
                        }
                        Err(second_err) => {
                            eprintln!(
                                "attach_to_wallpaper_worker_w failed after retry: first={}, second={}",
                                first_err, second_err
                            );
                            false
                        }
                    }
                }
            }
        };

        if !attached {
            let desktop = GetDesktopWindow();
            if set_parent_checked(hwnd, desktop, "attach_wallpaper_fallback_desktop")
                .unwrap_or(false)
            {
                force_bottom_immediately(hwnd);
            }
            return Ok(());
        }

        // Even when the parent is already correct, refreshing Z order is still required after
        // Tauri/WebView show(): Windows may keep the window visually raised until focus changes.
        let _ = parent_changed;
        force_wallpaper_layer_immediately(hwnd);
    }
    Ok(())
}

pub fn attach_to_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("attach_to_worker_w target hwnd invalid".to_string());
        }

        apply_desktop_child_style(hwnd);

        if WORKER_W.0.is_null() || !IsWindow(WORKER_W).as_bool() {
            init_worker_w()?;
        }

        let mut parent_changed = false;
        let attached = match set_parent_checked(hwnd, WORKER_W, "attach") {
            Ok(changed) => {
                parent_changed = changed;
                true
            }
            Err(first_err) => {
                init_worker_w()?;
                if WORKER_W.0.is_null() || !IsWindow(WORKER_W).as_bool() {
                    false
                } else {
                    match set_parent_checked(hwnd, WORKER_W, "attach_retry") {
                        Ok(changed) => {
                            parent_changed = changed;
                            true
                        }
                        Err(second_err) => {
                            eprintln!(
                                "attach_to_worker_w failed after retry: first={}, second={}",
                                first_err, second_err
                            );
                            false
                        }
                    }
                }
            }
        };

        if !attached {
            let desktop = GetDesktopWindow();
            if set_parent_checked(hwnd, desktop, "attach_fallback_desktop").unwrap_or(false) {
                force_bottom_immediately(hwnd);
            }
            return Ok(());
        }

        let _ = parent_changed;
        force_desktop_layer_immediately(hwnd);
    }
    Ok(())
}

pub fn detach_from_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("detach_from_worker_w target hwnd invalid".to_string());
        }

        apply_top_level_style(hwnd);

        let top_level = null_hwnd();
        if let Err(first_err) = set_parent_checked(hwnd, top_level, "detach") {
            if let Err(second_err) = set_parent_checked(hwnd, top_level, "detach_retry") {
                eprintln!(
                    "detach_from_worker_w retry failed: first={}, second={}",
                    first_err, second_err
                );
            }
        }

        // Keep window as top-level; caller decides whether to promote topmost.
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, flags);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hwnd(value: usize) -> HWND {
        HWND(value as *mut c_void)
    }

    #[test]
    fn top_level_parent_matches_null_only() {
        let desktop = hwnd(1);
        let worker = hwnd(2);

        assert!(parent_matches(null_hwnd(), null_hwnd(), desktop));
        assert!(!parent_matches(worker, null_hwnd(), desktop));
    }

    #[test]
    fn desktop_fallback_accepts_webview_top_level_parent() {
        let desktop = hwnd(1);
        let worker = hwnd(2);

        assert!(parent_matches(desktop, desktop, desktop));
        assert!(parent_matches(null_hwnd(), desktop, desktop));
        assert!(!parent_matches(worker, desktop, desktop));
    }
}
