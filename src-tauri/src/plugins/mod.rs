//! Application-installed plugins, distinct from compile-time Tauri plugins.
//! Pure admission foundation. Never execute a package merely because it parses.
#[cfg(test)]
#[allow(dead_code)]
mod admission;
#[path = "../runtime/atomic_file.rs"]
mod atomic_file;
#[cfg(test)]
#[allow(dead_code)]
mod broker;
pub(crate) mod commands;
mod installed;
#[cfg(test)]
#[allow(dead_code)]
mod manifest;
mod notifications;
mod package;

#[cfg(test)]
mod broker_tests;
#[cfg(test)]
mod tests;
