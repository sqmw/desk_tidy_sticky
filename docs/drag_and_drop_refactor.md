# Drag and Drop Refactor

> Follow-up optimization (2026-02-07): `docs/ui/2026-02-07-drag-and-list-polish.md`
> Follow-up stability alignment with Flutter handle-based reorder: same doc, section 4.

## Problem
1. Drag handle icon was not desired (user wanted no visible icon)
2. Previous HTML5 draggable approach conflicted with Dismissible's horizontal swipe

## Solution: Direction-Aware Drag Detection
Modified `Dismissible.svelte` to detect drag direction:
- **Horizontal movement** → Swipe for archive/delete (existing behavior)
- **Vertical movement** → Trigger callbacks for note reordering

### Key Changes
1. **No visible drag handle** - Removed the 6-dot icon completely
2. **Direction lock** - First significant movement (5px) locks the gesture direction
3. **Vertical threshold** - 10px vertical movement triggers reorder mode
4. **Visual feedback** - Dragged item gets opacity and shadow effect

## How It Works
1. User presses on a note
2. If first 5px of movement is more vertical than horizontal → vertical drag mode
3. Vertical drag mode triggers `onVerticalDragStart`, `onVerticalDragMove`, `onVerticalDragEnd`
4. On drag end, use pointer position and card centerline to compute precise target index, then reorder
