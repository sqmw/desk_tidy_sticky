# Current Agent Context

## Situation

The active delivery line is Sticky Window And Block Editor Overhaul. Storage recovery remains a release gate, while the current UI work expands native-window controls around a fixed note rectangle, makes editing state explicit, and preserves active drafts during external updates.

## Current State

- `NotesStore` serializes all note command, sticky-window, import/export, and runtime-check storage access.
- An unreadable primary notes file produces `recovery_required`; the application blocks later note operations and exposes the data-directory action without attempting repair. Shared and route-local note mutations, Markdown import/export, and note-window synchronization all refresh the same recovery state.
- Safe writes use synced same-directory temporary files, replacement without deleting the target first, and one last-known-good backup in the application data directory.
- Workspace cards keep pointer single-click selection when the inspector is open, while a dedicated details button provides keyboard access without a nested button role.
- Workspace note assembly and transient block-editor selection/cursor state now live in focused components/controllers.
- Sticky control mode preserves the note rectangle as a geometry invariant: exit/tag controls expand above it and all toolbar actions remain directly visible below it. Narrow windows measure both external control regions and expand by their actual wrapped heights.
- Sticky dragging uses the original note-surface hit area again; form controls, links, editors and popovers remain excluded. Rendered blocks expose a separate keyboard edit control and pointer clicks estimate the Markdown caret position.
- The block editor reports its active state to the route. External `notes_changed` events no longer replace an active draft; the route shows a recovery notice and requires an explicit reload.
- Clipboard images are saved through the existing backend command and inserted into the active textarea selection. Failures leave the text draft unchanged and display an inline error.

## Verification

Run from the repository root:

```bash
make check
make test
git diff --check
```

`make test` runs the Node frontend interaction tests and Rust unit tests. A local component preview verified all 10 toolbar actions at 288px width, with the header and toolbar wrapping outside the fixed note rectangle. Ordered-list editing kept identical top/left coordinates with a 0.09px height rounding difference; h1 editing moved following content by only 0.20px of browser rounding. Pure frame tests verify expand/collapse coordinate conservation and expanded-window drag persistence. The full Tauri window workflow still needs a human visual pass on the target operating systems before release.

The configured Windows compilation target could not be completed in this environment because the active toolchain reported its standard library as unavailable. No toolchain was installed or changed; verify the Windows-only replacement branch on the Windows build runner before release.

## Risks And Recovery

- Accepted release gate: no release or package promotion occurs before the recovery UI and normal note flows receive a desktop smoke test.
- The caret estimate is deliberately best-effort because rendered Markdown and source Markdown are not layout-identical. Precise rich-text caret mapping remains outside the single-textarea architecture.
- External changes preserve the local draft but are not automatically merged. Reload explicitly discards that draft, so the warning keeps the action visible and user-controlled.
- Recovery state deliberately does not rebuild, move, or overwrite user data. The user can open the application data directory and inspect `notes.json` plus the previous valid backup.
- Runtime data is outside the synchronized working tree. Do not move it into repository-relative storage.

## Task Route

See [Project TODO](../TODO.md) for stage ownership and the completed-record summary. Historical documentation routing is in [P3 Index](p3-index.md).
