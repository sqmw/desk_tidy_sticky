use std::ffi::c_void;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SMTO_NORMAL,
};

pub(super) fn spawn_worker_w() -> Result<(), String> {
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
    }
    Ok(())
}

pub(super) fn find_desktop_worker_w() -> Result<HWND, String> {
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

    unsafe {
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
    }

    Ok(worker_w_candidate)
}

pub(super) fn find_wallpaper_worker_w() -> HWND {
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

        BOOL(1)
    }

    unsafe {
        let _ = EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut worker_w_candidate as *mut _ as isize),
        );
    }

    if !worker_w_candidate.0.is_null() {
        return worker_w_candidate;
    }

    let mut fallback = HWND(0 as *mut c_void);

    unsafe extern "system" fn enum_workerw_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let mut class_name = [0u16; 32];
        let len = windows::Win32::UI::WindowsAndMessaging::GetClassNameW(hwnd, &mut class_name);
        if len == 0 {
            return BOOL(1);
        }
        let class_name = String::from_utf16_lossy(&class_name[..len as usize]);
        if class_name != "WorkerW" {
            return BOOL(1);
        }

        let shell_dll = match FindWindowExW(
            hwnd,
            HWND(0 as *mut c_void),
            windows::core::w!("SHELLDLL_DefView"),
            PCWSTR::null(),
        ) {
            Ok(v) => v,
            Err(_) => return BOOL(1),
        };

        if !shell_dll.0.is_null() {
            return BOOL(1);
        }

        *(lparam.0 as *mut HWND) = hwnd;
        BOOL(0)
    }

    unsafe {
        let _ = EnumWindows(
            Some(enum_workerw_proc),
            LPARAM(&mut fallback as *mut _ as isize),
        );
    }

    fallback
}
