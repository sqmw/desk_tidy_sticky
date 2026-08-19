# Documentation Index

This is the first-read route for people and agents. Read the active documents below before following older implementation records.

## Active

- [Project TODO](TODO.md): single source of truth for active work, stage status, and completed-item index.
- [Project STEPS](STEPS.md): macro step sequence and execution position for tasks currently in progress. Task status stays in TODO.
- [Current Agent Context](agent-context/current.md): current delivery line, risks, validation commands, and accepted gaps.
- [Notes Storage Safety](architecture/2026-07-15-notes-storage-safety-and-governance.md): storage recovery and component-boundary design.
- [Make Commands](build/make-commands.md): portable local verification and build entry points.

## Product And Operations

- `ui/`: active UI plans and focused interaction records.
- `migration/`: data and compatibility migration notes.
- `releases/`: release mappings and distribution history. Update this only when a release is prepared.
- `sync/`: synchronization constraints and historical environment guidance. Treat environment-specific paths as historical unless confirmed by the environment truth source.

## Historical P3 Records

Historical issue, product, and refactor documents are retained for traceability but are not default reading. See [P3 Index](agent-context/p3-index.md) before opening them.

## Maintenance Rules

1. Keep active documents short, structured, and linked from this file.
2. Record new actionable work in `TODO.md`; do not create an independent task list.
3. Keep project documentation portable. Use paths relative to the repository; machine facts belong in environment-level documentation.
