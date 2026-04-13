use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
fn push_candidate(candidates: &mut Vec<PathBuf>, base_dir: &Path) {
    candidates.push(base_dir.join("notes.json"));
}

#[cfg(target_os = "windows")]
fn candidate_legacy_notes_files() -> Vec<PathBuf> {
    use std::sync::OnceLock;

    static CACHED_CANDIDATES: OnceLock<Vec<PathBuf>> = OnceLock::new();
    CACHED_CANDIDATES
        .get_or_init(|| {
            let mut candidates = Vec::new();

            let mut extend_windows_roots = |root: &Path| {
                push_candidate(&mut candidates, &root.join("desk_tidy_sticky"));
                push_candidate(
                    &mut candidates,
                    &root.join("com.example").join("desk_tidy_sticky"),
                );
                push_candidate(
                    &mut candidates,
                    &root.join("com.sqmw").join("desk_tidy_sticky"),
                );
                push_candidate(&mut candidates, &root.join("sqmw").join("desk_tidy_sticky"));

                if let Ok(entries) = std::fs::read_dir(root) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if !path.is_dir() {
                            continue;
                        }
                        push_candidate(&mut candidates, &path.join("desk_tidy_sticky"));
                    }
                }
            };

            if let Ok(appdata) = std::env::var("APPDATA") {
                let appdata_path = PathBuf::from(appdata);
                extend_windows_roots(&appdata_path);
                if let Some(parent) = appdata_path.parent() {
                    extend_windows_roots(parent);
                }
            }
            if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
                let local_appdata_path = PathBuf::from(local_appdata);
                extend_windows_roots(&local_appdata_path);
            }
            candidates.sort();
            candidates.dedup();
            candidates
        })
        .clone()
}

#[cfg(not(target_os = "windows"))]
fn candidate_legacy_notes_files() -> Vec<PathBuf> {
    Vec::new()
}

pub fn existing_legacy_notes_files(current_path: &Path) -> Vec<PathBuf> {
    let current = current_path.canonicalize().ok();
    candidate_legacy_notes_files()
        .into_iter()
        .filter(|candidate| {
            if !candidate.exists() {
                return false;
            }
            let resolved = candidate.canonicalize().ok();
            match (&current, &resolved) {
                (Some(current), Some(resolved)) => current != resolved,
                _ => candidate != current_path,
            }
        })
        .collect()
}
