use std::path::PathBuf;

pub(crate) fn data_dir() -> Result<PathBuf, String> {
    directories::ProjectDirs::from("com", "desk_tidy", "desk_tidy_sticky")
        .map(|d| d.data_dir().to_path_buf())
        .ok_or_else(|| "Could not determine data directory".to_string())
}
