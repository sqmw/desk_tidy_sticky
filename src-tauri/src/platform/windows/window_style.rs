use std::ffi::c_void;
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetDesktopWindow, GetParent, GetWindowLongPtrW, IsWindow, SetWindowLongPtrW, SetWindowPos,
    GWL_STYLE, HWND_BOTTOM, HWND_NOTOPMOST, HWND_TOP, HWND_TOPMOST, SWP_FRAMECHANGED,
    SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW, WS_MAXIMIZEBOX,
    WS_THICKFRAME,
};

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

/// When switching from "always-on-top" to normal, Windows may keep the active window visually
/// above other non-topmost windows until focus changes. This forces an immediate send-to-back,
/// but only for top-level windows to avoid pushing desktop-attached child windows under icons.
pub fn send_window_to_bottom_if_top_level(hwnd_isize: isize) -> Result<(), String> {
    let hwnd = HWND(hwnd_isize as *mut c_void);
    unsafe {
        if hwnd.0.is_null() || !IsWindow(hwnd).as_bool() {
            return Err("send_window_to_bottom target hwnd invalid".to_string());
        }
        let desktop = GetDesktopWindow();
        let parent = GetParent(hwnd).unwrap_or(HWND(std::ptr::null_mut()));
        if parent != desktop && !parent.0.is_null() {
            return Ok(());
        }

        // Do not use SWP_NOACTIVATE here; the point is to refresh Z order immediately.
        let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_FRAMECHANGED;
        let _ = SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, flags);
        let _ = SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, flags);
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
