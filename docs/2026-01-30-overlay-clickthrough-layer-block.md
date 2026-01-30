# Overlay Click-Through Blocking Fix

## Problems
- In interactive mode, dragging sometimes only worked once.
- After relaunching while in interactive mode, notes could be unresponsive.
- Notes pinned to bottom/top could become unclickable.

## Root Cause
Overlay uses two windows (top and bottom layers). When a layer window has no
notes, it still receives mouse events and can block interaction with the other
layer. This became more visible after migrating to multi-window.

## Fix
Add an "effective click-through" mode:
- If the layer has no notes, force native `ignoreMouseEvents = true`
- Otherwise, follow the global click-through setting

This prevents empty overlay windows from intercepting input and stabilizes
dragging behavior across layers and relaunches.

## Affected Files
- `lib/pages/overlay/overlay_page.dart`
