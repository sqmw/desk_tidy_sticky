#[cfg(target_os = "macos")]
pub(crate) mod macos;
mod window_handle;
#[cfg(target_os = "windows")]
pub(crate) mod windows;

#[cfg(target_os = "macos")]
pub(crate) use window_handle::run_macos_window_op;
#[cfg(target_os = "windows")]
pub(crate) use window_handle::window_hwnd_isize;
