use std::ffi::c_void;
use windows::Win32::Foundation::{GetLastError, SetLastError, HWND, WIN32_ERROR};
use windows::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetParent, IsWindow, SetParent, SetWindowPos, HWND_BOTTOM, HWND_NOTOPMOST,
    HWND_TOP, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
};

mod discovery;

static mut WORKER_W: HWND = HWND(0 as *mut c_void);
static mut WALLPAPER_WORKER_W: HWND = HWND(0 as *mut c_void);

fn set_parent_checked(hwnd: HWND, expected_parent: HWND, phase: &str) -> Result<(), String> {
    unsafe {
        SetLastError(WIN32_ERROR(0));
        let _ = SetParent(hwnd, expected_parent);
        let desktop = GetDesktopWindow();
        if matches!(GetParent(hwnd), Ok(parent) if parent == expected_parent) {
            return Ok(());
        }
        // Some WebView hosts report top-level as NULL parent even after reparenting to desktop.
        if expected_parent == desktop && matches!(GetParent(hwnd), Ok(parent) if parent.0.is_null())
        {
            return Ok(());
        }
        let code = GetLastError().0;
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
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, flags);
    }
}

fn force_desktop_layer_immediately(hwnd: HWND) {
    unsafe {
        // Keep no-activate semantics, but move above icon host children for "desktop layer".
        let flags =
            SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_FRAMECHANGED | SWP_NOACTIVATE;
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

        if WALLPAPER_WORKER_W.0.is_null() || !IsWindow(WALLPAPER_WORKER_W).as_bool() {
            if let Err(err) = init_wallpaper_worker_w() {
                eprintln!("init_wallpaper_worker_w failed: {}", err);
                let desktop = GetDesktopWindow();
                let _ = set_parent_checked(hwnd, desktop, "attach_wallpaper_fallback_desktop");
                force_bottom_immediately(hwnd);
                return Ok(());
            }
        }

        let attached = match set_parent_checked(hwnd, WALLPAPER_WORKER_W, "attach_wallpaper") {
            Ok(_) => true,
            Err(first_err) => {
                init_wallpaper_worker_w()?;
                if WALLPAPER_WORKER_W.0.is_null() || !IsWindow(WALLPAPER_WORKER_W).as_bool() {
                    false
                } else if let Err(second_err) =
                    set_parent_checked(hwnd, WALLPAPER_WORKER_W, "attach_wallpaper_retry")
                {
                    eprintln!(
                        "attach_to_wallpaper_worker_w failed after retry: first={}, second={}",
                        first_err, second_err
                    );
                    false
                } else {
                    true
                }
            }
        };

        if !attached {
            let desktop = GetDesktopWindow();
            let _ = set_parent_checked(hwnd, desktop, "attach_wallpaper_fallback_desktop");
            force_bottom_immediately(hwnd);
            return Ok(());
        }
    }

    force_bottom_immediately(hwnd);
    Ok(())
}

pub fn attach_to_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("attach_to_worker_w target hwnd invalid".to_string());
        }

        if WORKER_W.0.is_null() || !IsWindow(WORKER_W).as_bool() {
            init_worker_w()?;
        }

        let attached = match set_parent_checked(hwnd, WORKER_W, "attach") {
            Ok(_) => true,
            Err(first_err) => {
                init_worker_w()?;
                if WORKER_W.0.is_null() || !IsWindow(WORKER_W).as_bool() {
                    false
                } else if let Err(second_err) = set_parent_checked(hwnd, WORKER_W, "attach_retry") {
                    eprintln!(
                        "attach_to_worker_w failed after retry: first={}, second={}",
                        first_err, second_err
                    );
                    false
                } else {
                    true
                }
            }
        };

        if !attached {
            let desktop = GetDesktopWindow();
            let _ = set_parent_checked(hwnd, desktop, "attach_fallback_desktop");
            force_desktop_layer_immediately(hwnd);
            return Ok(());
        }
    }

    force_desktop_layer_immediately(hwnd);
    Ok(())
}

pub fn detach_from_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("detach_from_worker_w target hwnd invalid".to_string());
        }

        let desktop = GetDesktopWindow();
        if let Err(first_err) = set_parent_checked(hwnd, desktop, "detach") {
            if let Err(second_err) = set_parent_checked(hwnd, desktop, "detach_retry") {
                eprintln!(
                    "detach_from_worker_w retry failed: first={}, second={}",
                    first_err, second_err
                );
            }
        }

        // Keep window as top-level; caller decides whether to promote topmost.
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, flags);
    }
    Ok(())
}
