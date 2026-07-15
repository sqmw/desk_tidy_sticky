# Current Agent Context

## Situation

The active delivery line is Notes Storage Safety And Architecture Governance. It removes the previously identified JSON overwrite and multi-window lost-update risks while preserving the existing note schema.

## Current State

- `NotesStore` serializes all note command, sticky-window, import/export, and runtime-check storage access.
- An unreadable primary notes file produces `recovery_required`; the application blocks later note operations and exposes the data-directory action without attempting repair. Shared and route-local note mutations, Markdown import/export, and note-window synchronization all refresh the same recovery state.
- Safe writes use synced same-directory temporary files, replacement without deleting the target first, and one last-known-good backup in the application data directory.
- Workspace cards keep pointer single-click selection when the inspector is open, while a dedicated details button provides keyboard access without a nested button role.
- Workspace note assembly and transient block-editor selection/cursor state now live in focused components/controllers.

## Verification

Run from the repository root:

```bash
make check
make test
git diff --check
```

`make test` runs the Node frontend interaction tests and Rust unit tests. The full desktop window workflow still needs a human visual pass on the target operating systems before release.

The configured Windows compilation target could not be completed in this environment because the active toolchain reported its standard library as unavailable. No toolchain was installed or changed; verify the Windows-only replacement branch on the Windows build runner before release.

## Risks And Recovery

- Accepted release gate: no release or package promotion occurs before the recovery UI and normal note flows receive a desktop smoke test.
- Recovery state deliberately does not rebuild, move, or overwrite user data. The user can open the application data directory and inspect `notes.json` plus the previous valid backup.
- Runtime data is outside the synchronized working tree. Do not move it into repository-relative storage.

## Task Route

See [Project TODO](../TODO.md) for stage ownership and the completed-record summary. Historical documentation routing is in [P3 Index](p3-index.md).
