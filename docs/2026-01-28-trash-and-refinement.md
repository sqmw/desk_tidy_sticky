# Note Logic Refinement & Recycle Bin Feature

## Overview
Implemented the Recycle Bin (Trash) feature and refined note state transitions (Archive/Trash) to ensure logical consistency and a better user experience.

## Key Changes

### 1. State Transition Rules
- **Unpin on Archive**: When a note is moved to the archive, it is automatically unpinned.
- **Unpin on Trash**: When a note is moved to the trash, it is automatically unpinned.
- **Archive visibility**: The "Pin" action is hidden for archived notes to prevent logical conflicts.

### 2. Recycle Bin (Trash)
- Added `isDeleted` field to `Note` model.
- `NotesService` now supports:
    - `deleteNote(id)`: Moves note to trash (soft delete).
    - `restoreNote(id)`: Restores note from trash.
    - `permanentlyDeleteNote(id)`: Hard delete.
    - `emptyTrash()`: Clears all deleted notes.
- Updated `PanelHeader` with a "Recycle Bin" tab and an "Empty Trash" button.
- Updated `PanelNotesList` to show "Restore" and "Permanent Delete" icons when in Trash mode.

### 3. Localization
- Added translations for:
    - `trash` / `回收站`
    - `restore` / `恢复`
    - `permanentlyDelete` / `永久删除`
    - `emptyTrash` / `清空回收站`

### 4. Technical Refactoring
- Consolidated core enums (`NoteViewMode`, `NoteSortMode`, `AppLocale`) into `note_model.dart` to resolve circular dependencies and duplicate definition errors.
- Cleaned up unused imports across the service and UI layers.

## Verification
- Verified that archiving a pinned note removes the pin.
- Verified that deleting a note moves it to the Trash tab.
- Verified that restoring a note moves it back to its previous state (Active/Archived) but remains unpinned.
- Verified that "Empty Trash" permanently removes all notes in the Recycle Bin.
