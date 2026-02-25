use objc2::{AnyThread, MainThreadMarker};
use objc2_app_kit::{NSApplication, NSImage, NSWindow};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::NSData;
use std::ffi::c_void;

fn cast_ns_window_ptr(ptr: *mut c_void) -> Result<&'static NSWindow, String> {
    if ptr.is_null() {
        return Err("macos ns_window pointer is null".to_string());
    }
    // SAFETY: pointer is provided by Tauri `window.ns_window()` and expected to refer to a live NSWindow.
    Ok(unsafe { &*ptr.cast::<NSWindow>() })
}

fn desktop_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::DesktopWindowLevelKey) as isize
}

fn normal_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::NormalWindowLevelKey) as isize
}

fn floating_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::FloatingWindowLevelKey) as isize
}

fn desktop_icon_interactive_level() -> isize {
    // Plash-style interaction level: just above desktop icons to keep desktop embedding semantics
    // while still allowing direct interaction when click-through is disabled.
    (CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) + 1) as isize
}

pub fn attach_to_worker_w(ns_window_ptr: *mut c_void) -> Result<(), String> {
    attach_to_worker_w_with_mode(ns_window_ptr, false)
}

pub fn attach_to_worker_w_with_mode(
    ns_window_ptr: *mut c_void,
    interactive: bool,
) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    if interactive {
        window.setLevel(desktop_icon_interactive_level());
        window.setIgnoresMouseEvents(false);
        window.makeKeyAndOrderFront(None);
    } else {
        window.setLevel(desktop_window_level());
        // Keep desktop-level semantics and pass-through behavior to match desktop sticker mode.
        window.setIgnoresMouseEvents(true);
        window.orderFront(None);
    }
    Ok(())
}

pub fn detach_from_worker_w(ns_window_ptr: *mut c_void) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    window.setLevel(normal_window_level());
    window.setIgnoresMouseEvents(false);
    Ok(())
}

pub fn set_topmost_no_activate(ns_window_ptr: *mut c_void, topmost: bool) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    if topmost {
        window.setLevel(floating_window_level());
        window.orderFrontRegardless();
    } else {
        window.setLevel(normal_window_level());
    }
    Ok(())
}

pub fn disable_aero_snap(_ns_window_ptr: *mut c_void) -> Result<(), String> {
    Ok(())
}

pub fn disable_aero_snap_keep_resizable(_ns_window_ptr: *mut c_void) -> Result<(), String> {
    Ok(())
}

pub fn set_application_icon_from_png(png_bytes: &[u8]) -> Result<(), String> {
    let Some(mtm) = MainThreadMarker::new() else {
        return Err("set_application_icon_from_png must run on macOS main thread".to_string());
    };
    let png_data = NSData::with_bytes(png_bytes);
    let Some(icon) = NSImage::initWithData(NSImage::alloc(), &png_data) else {
        return Err("decode app icon png failed".to_string());
    };
    let app = NSApplication::sharedApplication(mtm);
    // SAFETY: icon is a live NSImage created from in-memory PNG bytes on main thread.
    unsafe { app.setApplicationIconImage(Some(&icon)) };
    Ok(())
}
