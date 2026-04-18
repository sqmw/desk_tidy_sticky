# Windows Mini Window Transparent Corners

## Context

The mini window uses a transparent undecorated Tauri window. Its top-level page shell had a
transparent `.panel` background while `.glass-container` rendered a rounded 12px surface.

## Problem

On Windows 10, the native transparent window is rectangular. If the visible shell is rounded, the
four corners remain transparent and can still cover or visually clip desktop content underneath.
This is the same class of problem as the sticky WorkerW transparent-corner issue.

## Decision

Windows mini mode uses a rectangular filled shell. macOS keeps the rounded visual shell.

## Implementation

- `src/routes/+page.svelte`: detect Windows from `navigator.userAgent` / `navigator.platform`.
- Windows adds `windows-flat` to `.panel`.
- `.panel` stays transparent by default so macOS can keep the rounded visual shell.
- `.panel.windows-flat` fills the whole native window background on Windows only.
- `.panel.windows-flat .glass-container` removes the rounded outer radius and shadow.

## Verification

- `pnpm -s check`
- Manual Windows 10 check: mini mode should no longer show transparent rounded/cropped corners around
  the window edge.
