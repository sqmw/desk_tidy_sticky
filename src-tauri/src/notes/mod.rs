pub(crate) mod assets;
mod commands;
pub(crate) mod compat;
mod domain;
mod model;
pub(crate) mod repository;
pub(crate) mod service;
pub(crate) mod store;

pub(crate) use commands::{
    add_done_log, add_note, clear_note_priority, delete_note, empty_trash,
    get_notes_storage_status, load_notes, open_notes_data_directory, permanently_delete_note,
    persist_note_window_size, reorder_notes, reset_pinned_note_positions, restore_note,
    save_clipboard_image, toggle_archive, toggle_done, toggle_pin, update_note, update_note_color,
    update_note_frost, update_note_opacity, update_note_position, update_note_priority,
    update_note_size, update_note_tags, update_note_text, update_note_text_color,
};
pub(crate) use domain::{normalize_note_review_semantics, normalize_tags};
pub(crate) use model::{
    chrono_now, Note, AUTO_HIDE_REASON_OVERFLOW, AUTO_HIDE_REASON_SHORTCUT, AUTO_HIDE_STATE_HIDDEN,
    AUTO_HIDE_STATE_VISIBLE, DEFAULT_NOTE_FROST, DEFAULT_NOTE_OPACITY, DEFAULT_NOTE_TEXT_COLOR,
    RECORD_KIND_DONE_LOG, RECORD_KIND_NOTE,
};
pub(crate) use service::NoteSortMode;
