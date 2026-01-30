# Overlay Bottom Note Distortion

## Problem
When a sticky note is pinned to the bottom layer, clicking it can cause the
note UI to appear stretched/deformed.

## Root Cause
Bottom layer notes are hosted in a window reparented to `WorkerW`. When
interacting, the window gets detached/reattached to switch Z-order. On some
systems this reparenting can alter the effective window bounds/DPI mapping,
causing the Flutter scene to render with a stretched layout.

## Fix
After any WorkerW reparenting, re-apply the overlay window bounds to restore
the correct size/position:
- Recalculate `_virtualRect`
- `setSize` and `setPosition` to the intended overlay bounds

This stabilizes the window metrics and avoids UI deformation.

## Affected Files
- `lib/pages/overlay/overlay_page.dart`
