use std::ffi::c_void;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{
    GetLastError, SetLastError, BOOL, HWND, LPARAM, WIN32_ERROR, WPARAM,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, GetDesktopWindow, GetParent, GetWindowLongPtrW,
    IsWindow, SendMessageTimeoutW, SetParent, SetWindowLongPtrW, SetWindowPos, GWL_STYLE,
    HWND_BOTTOM, HWND_NOTOPMOST, HWND_TOP, HWND_TOPMOST, SMTO_NORMAL, SWP_FRAMECHANGED,
    SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW, WS_MAXIMIZEBOX,
    WS_THICKFRAME,
};

static mut WORKER_W: HWND = HWND(0 as *mut c_void);

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

pub fn init_worker_w() -> Result<(), String> {
    unsafe {
        let progman =
            FindWindowW(windows::core::w!("Progman"), PCWSTR::null()).map_err(|e| e.to_string())?;

        if progman.0.is_null() {
            return Err("Progman not found".to_string());
        }

        // Ask Progman to spawn WorkerW.
        let mut result: usize = 0;
        let _ = SendMessageTimeoutW(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut result as *mut _ as *mut usize),
        );

        // Some systems only spawn the sibling WorkerW with lParam=1.
        let _ = SendMessageTimeoutW(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(1),
            SMTO_NORMAL,
            1000,
            Some(&mut result as *mut _ as *mut usize),
        );

        let mut worker_w_candidate = HWND(0 as *mut c_void);

        unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let shell_dll = match FindWindowExW(
                hwnd,
                HWND(0 as *mut c_void),
                windows::core::w!("SHELLDLL_DefView"),
                PCWSTR::null(),
            ) {
                Ok(v) => v,
                Err(_) => return BOOL(1),
            };

            if shell_dll.0.is_null() {
                return BOOL(1);
            }

            // Typical case: SHELLDLL_DefView is hosted by Progman/WorkerW.
            // Desktop-content WorkerW is usually the next sibling WorkerW.
            if let Ok(next_worker) = FindWindowExW(
                HWND(0 as *mut c_void),
                hwnd,
                windows::core::w!("WorkerW"),
                PCWSTR::null(),
            ) {
                if !next_worker.0.is_null() {
                    *(lparam.0 as *mut HWND) = next_worker;
                    return BOOL(0);
                }
            }

            // Fallback: if no next sibling found, use current host when it's WorkerW.
            let mut class_name = [0u16; 32];
            let len = windows::Win32::UI::WindowsAndMessaging::GetClassNameW(hwnd, &mut class_name);
            if len > 0 {
                let class_name = String::from_utf16_lossy(&class_name[..len as usize]);
                if class_name == "WorkerW" {
                    *(lparam.0 as *mut HWND) = hwnd;
                    return BOOL(0);
                }
            }

            BOOL(1)
        }

        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut worker_w_candidate as *mut _ as isize),
        );

        if worker_w_candidate.0.is_null() {
            // Last fallback: pick the first WorkerW.
            worker_w_candidate = FindWindowExW(
                HWND(0 as *mut c_void),
                HWND(0 as *mut c_void),
                windows::core::w!("WorkerW"),
                PCWSTR::null(),
            )
            .map_err(|e| e.to_string())?;
        }

        if worker_w_candidate.0.is_null() {
            return Err("WorkerW behind icons not found".to_string());
        }

        WORKER_W = worker_w_candidate;
        Ok(())
    }
}

pub fn attach_to_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("attach_to_worker_w target hwnd invalid".to_string());
        }

        if WORKER_W.0.is_null() || !IsWindow(WORKER_W).as_bool() {
            // Try init if not ready
            if let Err(e) = init_worker_w() {
                return Err(e);
            }
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
            force_bottom_immediately(hwnd);
            return Ok(());
        }
    }

    force_bottom_immediately(hwnd);
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

pub fn set_topmost_no_activate(hwnd_isize: isize, topmost: bool) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    let insert_after = if topmost {
        HWND_TOPMOST
    } else {
        HWND_NOTOPMOST
    };
    let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW;

    unsafe {
        let _ = SetWindowPos(hwnd, insert_after, 0, 0, 0, 0, flags);
    }

    Ok(())
}

pub fn disable_aero_snap(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("disable_aero_snap target hwnd invalid".to_string());
        }

        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        let no_snap_style = style & !(WS_THICKFRAME.0 as u32) & !(WS_MAXIMIZEBOX.0 as u32);
        if no_snap_style != style {
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, no_snap_style as isize);
            let _ = SetWindowPos(
                hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER | SWP_FRAMECHANGED,
            );
        }
    }
    Ok(())
}

pub fn disable_aero_snap_keep_resizable(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("disable_aero_snap_keep_resizable target hwnd invalid".to_string());
        }

        let style = GetWindowLongPtrW(hwnd, GWL_STYLE) as u32;
        // Keep WS_THICKFRAME so sticky notes remain user-resizable.
        let no_snap_style = style & !(WS_MAXIMIZEBOX.0 as u32);
        if no_snap_style != style {
            let _ = SetWindowLongPtrW(hwnd, GWL_STYLE, no_snap_style as isize);
            let _ = SetWindowPos(
                hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER | SWP_FRAMECHANGED,
            );
        }
    }
    Ok(())
}
