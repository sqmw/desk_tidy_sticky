# Notes Storage Safety And Architecture Governance

## Current Truth

This active milestone addresses the review findings from 2026-07-15. The primary risk is note data loss: an unreadable `notes.json` must remain untouched, and any failed replacement must preserve the last readable version. Runtime data continues to live in the system application data directory rather than the synchronized repository.

## Design

1. `NotesStore` is managed by the Tauri application and serializes every note read or mutation across panel, workspace, sticky windows, markdown import/export, and runtime checks.
2. Repository read failures return a storage-specific error. `NotesStore` records `recovery_required`, blocks later note operations, and exposes a status command for the UI.
3. Writes create a same-directory temporary file, sync it, atomically replace the primary file without deleting the old file first, and retain one last-known-good backup.
4. UI recovery notices block write controls in the compact panel, workspace, and sticky window and offer an action to open the application data directory. Shared and route-local note mutations, Markdown import/export, and note-window synchronization report the same recovery state; they do not alter the unreadable file.
5. `WorkspaceNotesPane` owns notes-region assembly, while `block-note-editor-controller` owns transient selection, cursor, inline-range, and blur-suppression state. The existing Markdown schema and rendering behavior remain unchanged.

## Verification

- Rust unit tests cover unreadable input, failed replacement, backup retention, missing note ids, legacy migration, recovery blocking, and serialized mutations.
- Frontend interaction tests cover storage recovery state and workstation card selection semantics.
- Milestone gate: `make check`, `make test`, and `git diff --check`.

## Recovery

No note schema migration is introduced. Existing users retain `notes.json`; future successful writes also retain `notes.json.bak` in the same application data directory. A recovery-required state never writes, deletes, renames, or repairs user data automatically.
