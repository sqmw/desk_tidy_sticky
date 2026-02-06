use std::ffi::c_void;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SetParent, SetWindowPos,
    HWND_BOTTOM, HWND_TOP, SMTO_NORMAL, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW,
};

static mut WORKER_W: HWND = HWND(0 as *mut c_void);

pub fn init_worker_w() -> Result<(), String> {
    unsafe {
        let progman = FindWindowW(windows::core::w!("Progman"), PCWSTR::null())
            .map_err(|e| e.to_string())?;

        if progman.0.is_null() {
            return Err("Progman not found".to_string());
        }

        // Send message to spawn WorkerW
        let mut result: usize = 0;
        let _ = SendMessageTimeoutW(
            progman,
            0x052C, // WM_ERASEBKGND
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut result as *mut _ as *mut usize),
        );

        // Find the WorkerW that hides behind icons
        let mut worker_w_candidate = HWND(0 as *mut c_void);

        unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let shell_dll_res = FindWindowExW(
                hwnd,
                HWND(0 as *mut c_void),
                windows::core::w!("SHELLDLL_DefView"),
                PCWSTR::null(),
            );

            if let Ok(shell_dll) = shell_dll_res {
                if !shell_dll.0.is_null() {
                    let worker_res = FindWindowExW(
                        HWND(0 as *mut c_void),
                        hwnd,
                        windows::core::w!("WorkerW"),
                        PCWSTR::null(),
                    );
                    if let Ok(worker) = worker_res {
                        if !worker.0.is_null() {
                            *(lparam.0 as *mut HWND) = worker;
                            return BOOL(0); // Stop enumeration
                        }
                    }
                }
            }
            BOOL(1)
        }

        EnumWindows(
            Some(enum_windows_proc),
            LPARAM(&mut worker_w_candidate as *mut _ as isize),
        );

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
        if WORKER_W.0.is_null() {
            // Try init if not ready
            if let Err(e) = init_worker_w() {
                return Err(e);
            }
        }

        let _ = SetParent(hwnd, WORKER_W);
        // Position at bottom of Z-order in that parent
        let _ = SetWindowPos(
            hwnd,
            HWND_BOTTOM,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
    }
    Ok(())
}

pub fn detach_from_worker_w(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        // Set parent to desktop/root (0)
        let _ = SetParent(hwnd, HWND(0 as *mut c_void));

        // Bring to top
        let _ = SetWindowPos(
            hwnd,
            HWND_TOP,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
    }
    Ok(())
}
