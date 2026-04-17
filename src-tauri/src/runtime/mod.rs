pub(crate) mod paths;
mod state;

pub(crate) use state::{
    BreakOverlayPresentationState, BreakReminderWatchSnapshot, BreakReminderWatchState,
    GlobalControlState, ShortcutBindingSnapshot, ShortcutRuntimeState, ShortcutSettingsSnapshot,
};
