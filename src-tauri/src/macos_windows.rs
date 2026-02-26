use objc2::{AnyThread, MainThreadMarker};
use objc2_app_kit::{
    NSApplication, NSImage, NSWindow, NSWindowAnimationBehavior, NSWindowCollectionBehavior,
};
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

fn desktop_icon_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) as isize
}

fn wallpaper_window_level() -> isize {
    // Keep sticky windows below desktop icons (Finder items) while remaining in desktop band.
    desktop_window_level().min(desktop_icon_window_level().saturating_sub(1))
}

fn normal_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::NormalWindowLevelKey) as isize
}

fn floating_window_level() -> isize {
    CGWindowLevelForKey(CGWindowLevelKey::FloatingWindowLevelKey) as isize
}

fn desktop_icon_interactive_level() -> isize {
    (CGWindowLevelForKey(CGWindowLevelKey::DesktopIconWindowLevelKey) + 1) as isize
}

fn log_level(tag: &str, window: &NSWindow) {
    eprintln!(
        "[macos-layer] {tag} current={} desktop={} desktop_icon={} normal={} floating={} ignore_mouse={}",
        window.level(),
        desktop_window_level(),
        desktop_icon_window_level(),
        normal_window_level(),
        floating_window_level(),
        window.ignoresMouseEvents(),
    );
}

fn desktop_sticky_collection_behavior() -> NSWindowCollectionBehavior {
    NSWindowCollectionBehavior::Stationary
        | NSWindowCollectionBehavior::IgnoresCycle
        | NSWindowCollectionBehavior::FullScreenNone
}

fn apply_desktop_sticky_window_traits(window: &NSWindow) {
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(desktop_sticky_collection_behavior());
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

/// Legacy desktop-bottom strategy retained for fallback/experiments.
/// This path keeps the previous behavior and is intentionally not removed.
#[allow(dead_code)]
pub fn attach_to_worker_w(ns_window_ptr: *mut c_void) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    apply_desktop_sticky_window_traits(window);
    window.setLevel(desktop_window_level());
    // Plash-aligned desktop mode: keep sticky windows behind normal app windows
    // and out of Expose-style cycle behaviors.
    window.orderBack(None);
    log_level("attach_to_worker_w(legacy)", window);
    Ok(())
}

#[allow(dead_code)]
pub fn attach_to_wallpaper_layer(
    ns_window_ptr: *mut c_void,
) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    apply_wallpaper_window_traits(window);
    // Match Plash desktop wallpaper behavior: place on desktop level and keep the window at back.
    window.setLevel(desktop_window_level());
    window.orderBack(None);
    log_level("attach_to_wallpaper_layer", window);
    Ok(())
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
        log_level("attach_to_wallpaper_layer_with_interaction(pass-through)", window);
    } else {
        window.setIgnoresMouseEvents(false);
        // Plash-like browsing mode: move above desktop icons for direct interaction.
        window.setLevel(desktop_icon_interactive_level());
        window.orderFrontRegardless();
        log_level("attach_to_wallpaper_layer_with_interaction(interactive)", window);
    }
    Ok(())
}

/// Legacy strategy retained for fallback/experiments.
/// This variant keeps the previous desktop-icon-aware level and interactive toggle behavior.
#[allow(dead_code)]
pub fn attach_to_wallpaper_layer_legacy(
    ns_window_ptr: *mut c_void,
    click_through: bool,
) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    window.setCanHide(false);
    window.setHidesOnDeactivate(false);
    window.setCollectionBehavior(desktop_sticky_collection_behavior());
    window.setAnimationBehavior(NSWindowAnimationBehavior::None);
    window.setIgnoresMouseEvents(click_through);
    window.setLevel(wallpaper_window_level());
    window.orderBack(None);
    log_level("attach_to_wallpaper_layer_legacy", window);
    Ok(())
}

pub fn detach_from_worker_w(ns_window_ptr: *mut c_void) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    restore_standard_window_traits(window);
    window.setLevel(normal_window_level());
    log_level("detach_from_worker_w", window);
    Ok(())
}

pub fn set_topmost_no_activate(ns_window_ptr: *mut c_void, topmost: bool) -> Result<(), String> {
    let window = cast_ns_window_ptr(ns_window_ptr)?;
    if topmost {
        window.setLevel(floating_window_level());
        window.orderFrontRegardless();
        log_level("set_topmost_no_activate(true)", window);
    } else {
        window.setLevel(normal_window_level());
        log_level("set_topmost_no_activate(false)", window);
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
