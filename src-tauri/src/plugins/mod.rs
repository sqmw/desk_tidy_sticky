//! Application-installed plugins, distinct from compile-time Tauri plugins.
//! Pure admission foundation. Never execute a package merely because it parses.
mod admission;
mod manifest;

#[cfg(test)]
mod tests;
