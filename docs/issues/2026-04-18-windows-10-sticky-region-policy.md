# Windows Sticky Window Region Policy

## Context

Windows stickies can be attached as WorkerW child windows to sit on the desktop layer. The app used
`SetWindowRgn(CreateRoundRectRgn(...))` to clip those child windows to the same rounded shape as the
web UI.

## Decision

Windows no longer applies rounded native region clipping for sticky WorkerW child windows.
Windows note surfaces also render as rectangular surfaces to avoid transparent corners inside the
rectangular native window.

## Reason

- Windows 10 can leave transparent square or pointed artifacts around a clipped transparent child
  window.
- The artifact is worse than a rectangular native window region because it can visibly cover or cut
  nearby desktop icons.
- Keeping a single Windows policy is simpler and avoids version-specific window-region behavior.

## Implementation

- `src-tauri/src/platform/windows/workerw/mod.rs`: `apply_desktop_child_style()` calls
  `clear_window_region()` after applying the WorkerW child style.
- The old rounded-region helper and unused GDI imports were removed from the default Windows WorkerW
  child path.
- `src/routes/note/[id]/+page.svelte`: the note window writes `--note-radius` inline
  (`0px` on Windows, `12px` elsewhere), so CSS no longer creates transparent rounded corners inside
  a rectangular native window.
- The note surface now uses `background: var(--note-tint)` directly on `.note-window`, so the
  rectangular Windows surface is filled by the note color instead of relying only on an absolutely
  positioned inner frost layer.

## Verification

- `cargo check -q --manifest-path src-tauri/Cargo.toml`
- Windows side: `cargo check -q` in `F:\language\rust\code\desk_tidy_sticky\src-tauri`
- Manual Windows check: pinned desktop stickies should no longer show clipped transparent pointed
  corners around the visible note.
