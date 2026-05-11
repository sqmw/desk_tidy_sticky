use objc2::{AnyThread, MainThreadMarker};
use objc2_app_kit::{
    NSApplication, NSApplicationActivationOptions, NSApplicationPresentationOptions, NSImage,
    NSRunningApplication, NSWindow, NSWindowAnimationBehavior, NSWindowCollectionBehavior,
};
use objc2_core_graphics::{CGWindowLevelForKey, CGWindowLevelKey};
use objc2_foundation::{NSActivityOptions, NSData, NSProcessInfo, NSString};
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

fn topmost_window_level() -> isize {
    // Fullscreen Spaces can hide windows below screen-saver level.
    // Use the screen-saver level for topmost stickies/panels so they remain visible
    // even when another app is fullscreen.
    screen_saver_window_level()
}

fn screen_saver_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::ScreenSaverWindowLevelKey) as isize
}

fn assistive_tech_high_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::AssistiveTechHighWindowLevelKey) as isize
}

fn desktop_icon_interactive_level() -> isize {
    (CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) + 1) as isize
}

fn desktop_sticky_collection_behavior() -> NSWindowCollectionBehavior {
    // Keep pinned sticky windows eligible for fullscreen Spaces even while
    // they are visually placed in the desktop band. Removing this membership
    // during a bottom-layer transition can prevent AppKit from reattaching the
    // same window to already-existing fullscreen Spaces when it becomes
    // topmost again.
    NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::Stationary
        | NSWindowCollectionBehavior::IgnoresCycle
        | NSWindowCollectionBehavior::FullScreenAuxiliary
}

fn break_overlay_collection_behavior() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::Stationary
        | NSWindowCollectionBehavior::IgnoresCycle
        | NSWindowCollectionBehavior::FullScreenAuxiliary
}

fn topmost_sticky_collection_behavior() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::Stationary
        | NSWindowCollectionBehavior::IgnoresCycle
        | NSWindowCollectionBehavior::FullScreenAuxiliary
}

fn apply_topmost_sticky_window_traits(window: &NSWindow) {
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setIgnoresMouseEvents(false);
    window.setCollectionBehavior(topmost_sticky_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
}

#[allow(dead_code)]
fn apply_wallpaper_window_traits(window: &NSWindow) {
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(desktop_sticky_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
    // Align to Plash wallpaper mode: desktop layer is strictly non-interactive.
    window.setIgnoresMouseEvents(true);
}

fn restore_standard_window_traits(window: &NSWindow) {
    window.setCanHide(true);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(NSWindowCollectionBehavior::Default);
    window.setAnimationBehavior(NSWindowAnimationBehavior::Default);
    window.setIgnoresMouseEvents(false);
}

pub fn attach_to_wallpaper_layer_with_interaction(
    ns_window_ptr: *mut c_void,
    click_through: bool,
) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(desktop_sticky_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
    if click_through {
        window.setIgnoresMouseEvents(true);
        window.setLevel(desktop_window_level());
        window.orderBack(None);
    } else {
        window.setIgnoresMouseEvents(false);
        // Plash-like browsing mode: move above desktop icons for direct interaction.
        window.setLevel(desktop_icon_interactive_level());
        window.orderFrontRegardless();
    }
    Ok(())
}

pub fn attach_to_desktop_layer_with_interaction(
    ns_window_ptr: *mut c_void,
    click_through: bool,
) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(desktop_sticky_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
    // Desktop layer means "above desktop icons". Keep interaction policy driven
    // by global click-through state.
    window.setIgnoresMouseEvents(click_through);
    window.setLevel(desktop_icon_interactive_level());
    window.orderFrontRegardless();
    Ok(())
}

pub fn detach_from_worker_w(ns_window_ptr: *mut c_void) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    restore_standard_window_traits(window);
    window.setLevel(normal_window_level());
    Ok(())
}

pub fn set_topmost_no_activate(ns_window_ptr: *mut c_void, topmost: bool) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    if topmost {
        apply_topmost_sticky_window_traits(window);
        window.setLevel(topmost_window_level());
        window.orderFrontRegardless();
    } else {
        window.setLevel(normal_window_level());
    }
    Ok(())
}

pub fn apply_break_overlay_window_traits(ns_window_ptr: *mut c_void) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setIgnoresMouseEvents(false);
    window.setCollectionBehavior(break_overlay_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
    // Ensure break overlay stays above all other topmost windows (stickies/panels).
    window.setLevel(assistive_tech_high_window_level());
    window.makeKeyAndOrderFront(None);
    window.orderFrontRegardless();
    Ok(())
}

#[allow(deprecated)]
pub fn set_break_overlay_presentation(active: bool) -> Result<(), String> {
    let Some(mtm) = MainThreadMarker::new() else {
        return Err("set_break_overlay_presentation must run on macOS main thread".to_string());
    };
    let app = NSApplication::sharedApplication(mtm);
    let options = if active {
        NSApplicationPresentationOptions::HideDock | NSApplicationPresentationOptions::HideMenuBar
    } else {
        NSApplicationPresentationOptions::Default
    };
    app.setPresentationOptions(options);
    if active {
        let current_app = NSRunningApplication::currentApplication();
        let _ = current_app.activateWithOptions(NSApplicationActivationOptions::ActivateAllWindows);
        app.activateIgnoringOtherApps(true);
    }
    Ok(())
}

pub fn prevent_app_nap_for_runtime_timers() {
    let reason =
        NSString::from_str("Keep break reminder watchdog responsive while app runs in background");
    let process_info = NSProcessInfo::processInfo();
    let activity = process_info.beginActivityWithOptions_reason(
        NSActivityOptions::UserInitiatedAllowingIdleSystemSleep,
        &reason,
    );
    std::mem::forget(activity);
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
