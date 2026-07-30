# Current Agent Context

## Situation

The active delivery line is Sticky Window And Block Editor Overhaul. Storage recovery remains a release gate, while the current UI work expands native-window controls around a fixed note rectangle, makes editing state explicit, and preserves active drafts during external updates.

## Current State

- `NotesStore` serializes all note command, sticky-window, import/export, and runtime-check storage access.
- An unreadable primary notes file produces `recovery_required`; the application blocks later note operations and exposes the data-directory action without attempting repair. Shared and route-local note mutations, Markdown import/export, and note-window synchronization all refresh the same recovery state.
- Safe writes use synced same-directory temporary files, replacement without deleting the target first, and one last-known-good backup in the application data directory.
- Workspace cards keep pointer single-click selection when the inspector is open, while a dedicated details button provides keyboard access without a nested button role.
- Workspace note assembly and transient block-editor selection/cursor state now live in focused components/controllers.
- Sticky control mode preserves the note rectangle as a two-dimensional geometry invariant: the native window adds equal transparent side reserves plus measured top/bottom reserves, while the note body keeps its stored screen position and size. Exit/tags and the four grouped toolbar sections render as separate glass floating islands; the bottom island remains single-row and keeps delete isolated at the far edge.
- Native macOS panel opacity/shadow is disabled for note panels. Native full-window frost is temporarily cleared while external controls are visible because a rectangular native effect cannot preserve transparent gaps; the note body uses the existing CSS frost fallback and restores native frost after controls close.
- Sticky dragging uses the original note-surface hit area again and exposes `grab` / `grabbing` cursor feedback; form controls, links, editors and popovers remain excluded. Rendered blocks expose a separate keyboard edit control and pointer clicks estimate the Markdown caret position.
- The block editor reports its active state to the route. External `notes_changed` events no longer replace an active draft; the route shows a recovery notice and requires an explicit reload.
- Clipboard images are saved through the existing backend command and inserted into the active textarea selection. Failures leave the text draft unchanged and display an inline error.

## Verification

Run from the repository root:

```bash
make check
make test
git diff --check
```

`make test` runs the Node frontend interaction tests and Rust unit tests. A local component preview verified all toolbar actions outside the fixed note rectangle: the top island measured about 287×56px and the grouped single-row bottom island about 384×46px. Ordered-list editing kept identical top/left coordinates with a 0.09px height rounding difference; h1 editing moved following content by only 0.20px of browser rounding. Pure frame tests verify two-dimensional expand/collapse coordinate conservation and expanded-window drag persistence. The full Tauri window workflow still needs a human visual pass on the target operating systems before release.

The configured Windows compilation target could not be completed in this environment because the active toolchain reported its standard library as unavailable. No toolchain was installed or changed; verify the Windows-only replacement branch on the Windows build runner before release.

## Risks And Recovery

- Accepted release gate: no release or package promotion occurs before the recovery UI and normal note flows receive a desktop smoke test.
- The native frost fallback during control mode is intentional: keeping a full-window native acrylic/vibrancy layer would repaint the transparent space between the note and floating islands.
- The caret estimate is deliberately best-effort because rendered Markdown and source Markdown are not layout-identical. Precise rich-text caret mapping remains outside the single-textarea architecture.
- External changes preserve the local draft but are not automatically merged. Reload explicitly discards that draft, so the warning keeps the action visible and user-controlled.
- Recovery state deliberately does not rebuild, move, or overwrite user data. The user can open the application data directory and inspect `notes.json` plus the previous valid backup.
- Runtime data is outside the synchronized working tree. Do not move it into repository-relative storage.

## Task Route

See [Project TODO](../TODO.md) for stage ownership and the completed-record summary. Historical documentation routing is in [P3 Index](p3-index.md).
