# P3 Historical Index

## Purpose

The repository has more documentation files than the normal code-to-documentation threshold permits. This review preserves history while reducing default reading cost; it does not delete past decisions or incident records.

## Default Route

Read [Documentation Index](../README.md), [Current Agent Context](current.md), and the active item in [Project TODO](../TODO.md) first.

## Historical Collections

| Location | Default level | Use when |
|---|---|---|
| `../issues/` | P3 | Investigating a regression or a prior incident. |
| `../refactor/` | P3 | Checking a previous architectural decision. |
| `../product/` | P3 | Recovering product intent that is not linked by an active task. |
| `../sync/` | P3 | Diagnosing synchronization behavior; verify machine facts separately. |
| `../architecture/` older than the active TODO link | P3 | Comparing a historical design to the current architecture. |

## Review Evidence

2026-07-15 review: 285 documentation files versus 203 source files, and approximately 19,798 documentation lines versus 40,910 source lines. Both ratios exceed the configured review threshold. The retained material contains release, migration, and issue traceability, so deletion would reduce recoverability. The chosen mitigation is an active index plus P3 routing; future documentation must link from the active route before becoming default reading.
