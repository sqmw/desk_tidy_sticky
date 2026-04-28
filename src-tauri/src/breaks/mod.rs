pub(crate) use overlay::{apply_break_overlay_window_traits, set_break_overlay_presentation};
#[cfg(target_os = "macos")]
pub(crate) use reminder::process_break_reminder_due;
pub(crate) use reminder::{
    start_break_reminder_watchdog, sync_break_reminder_watchdog,
};

mod overlay;
mod reminder;
