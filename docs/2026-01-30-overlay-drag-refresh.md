# Overlay Drag Refresh Issue

## Problem
When dragging one sticky note and releasing it, the notes on the left/right
visibly "refresh" once.

## Root Cause
`OverlayPage._commitPosition` called `_refreshPinned()` after every drag end.
`_refreshPinned()` reloads notes and reassigns positions for *all* pinned notes,
which triggers a full `setState` rebuild and causes neighboring notes to repaint.

## Fix
- Add a dedicated persistence method for position updates:
  `NotesService.updateNotePosition(...)`
- On drag end, only persist the moved note's position without reloading the
  entire pinned list.

This removes the unnecessary full refresh and prevents adjacent notes from
repainting.

## Affected Files
- `lib/services/notes_service.dart`
- `lib/pages/overlay/overlay_page.dart`
