pub(crate) mod paths;
mod state;

pub(crate) use state::{
    ActiveTopmostStickyState, BreakOverlayPresentationState, BreakReminderWatchSnapshot,
    BreakReminderWatchState, GlobalControlState, ShortcutBindingSnapshot, ShortcutRuntimeState,
    ShortcutSettingsSnapshot, StickyWindowReserveState,
};
pub(crate) mod atomic_file;
