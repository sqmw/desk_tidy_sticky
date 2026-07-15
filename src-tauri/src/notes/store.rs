use crate::notes::repository::RECOVERY_REQUIRED_ERROR_CODE;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NotesStorageStatus {
    pub(crate) state: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) message: Option<String>,
}

impl NotesStorageStatus {
    fn ready() -> Self {
        Self {
            state: "ready",
            message: None,
        }
    }

    fn recovery_required() -> Self {
        Self {
            state: "recoveryRequired",
            message: Some(
                "notes storage could not be read; writing is disabled until it is recovered"
                    .to_string(),
            ),
        }
    }
}

pub(crate) struct NotesStore {
    status: Mutex<NotesStorageStatus>,
}

impl Default for NotesStore {
    fn default() -> Self {
        Self {
            status: Mutex::new(NotesStorageStatus::ready()),
        }
    }
}

impl NotesStore {
    pub(crate) fn run<T>(
        &self,
        operation: impl FnOnce() -> Result<T, String>,
    ) -> Result<T, String> {
        let mut status = self
            .status
            .lock()
            .map_err(|_| "notes_store_unavailable".to_string())?;
        if status.state == "recoveryRequired" {
            return Err(RECOVERY_REQUIRED_ERROR_CODE.to_string());
        }

        match operation() {
            Ok(value) => Ok(value),
            Err(error) => {
                if error.starts_with(RECOVERY_REQUIRED_ERROR_CODE) {
                    *status = NotesStorageStatus::recovery_required();
                }
                Err(error)
            }
        }
    }

    pub(crate) fn storage_status(&self) -> Result<NotesStorageStatus, String> {
        self.status
            .lock()
            .map(|status| status.clone())
            .map_err(|_| "notes_store_unavailable".to_string())
    }
}

pub(crate) fn with_notes_store<T>(
    app: &tauri::AppHandle,
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let store = app
        .try_state::<NotesStore>()
        .ok_or_else(|| "notes_store_unavailable".to_string())?;
    store.run(operation)
}

pub(crate) fn notes_storage_status(app: &tauri::AppHandle) -> Result<NotesStorageStatus, String> {
    let store = app
        .try_state::<NotesStore>()
        .ok_or_else(|| "notes_store_unavailable".to_string())?;
    store.storage_status()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notes::{repository, Note};
    use std::sync::Arc;
    use std::thread;
    use std::time::Duration;
    use uuid::Uuid;

    fn test_directory() -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("desk-tidy-notes-store-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&path).expect("create test directory");
        path
    }

    #[test]
    fn serializes_concurrent_read_modify_write_operations() {
        let directory = test_directory();
        let notes_path = directory.join("notes.json");
        repository::write_notes_to_path(&notes_path, &[]).expect("write initial notes");
        let store = Arc::new(NotesStore::default());
        let mut handles = Vec::new();

        for text in ["first", "second"] {
            let store = Arc::clone(&store);
            let notes_path = notes_path.clone();
            handles.push(thread::spawn(move || {
                store.run(|| {
                    let mut notes = repository::read_notes_from_path(&notes_path)?;
                    thread::sleep(Duration::from_millis(20));
                    notes.push(Note::new(text.to_string(), false));
                    repository::write_notes_to_path(&notes_path, &notes)
                })
            }));
        }

        for handle in handles {
            handle
                .join()
                .expect("join mutation thread")
                .expect("mutate notes");
        }

        let texts: Vec<String> = repository::read_notes_from_path(&notes_path)
            .expect("read updated notes")
            .into_iter()
            .map(|note| note.text)
            .collect();
        assert_eq!(texts.len(), 2);
        assert!(texts.iter().any(|text| text == "first"));
        assert!(texts.iter().any(|text| text == "second"));
        let _ = std::fs::remove_dir_all(directory);
    }

    #[test]
    fn recovery_status_blocks_follow_up_operations() {
        let store = NotesStore::default();
        let error = store
            .run::<()>(|| Err(format!("{}: invalid json", RECOVERY_REQUIRED_ERROR_CODE)))
            .expect_err("invalid storage should fail");
        assert!(error.starts_with(RECOVERY_REQUIRED_ERROR_CODE));
        assert_eq!(
            store.storage_status().expect("storage status").state,
            "recoveryRequired"
        );
        assert_eq!(
            store
                .run(|| Ok::<_, String>(()))
                .expect_err("recovery state blocks writes"),
            RECOVERY_REQUIRED_ERROR_CODE
        );
    }
}
