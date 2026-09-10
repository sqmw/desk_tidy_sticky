/// Development builds must never mutate the installed application's login entry.
#[tauri::command]
pub fn is_autostart_available() -> bool {
    !cfg!(debug_assertions)
}

#[cfg(test)]
mod tests {
    #[test]
    fn availability_matches_plugin_registration_policy() {
        assert_eq!(super::is_autostart_available(), !cfg!(debug_assertions));
    }
}
