# Focus Task Time Input (24h)

## Context

The focus task planner uses start/end time fields for time-window tasks. The native HTML `input[type="time"]` displays with a 12h or 24h picker depending on OS/browser locale. In some environments, the 12:00-13:00 range could not be set reliably (noon conversion / picker ambiguity), and the UI showed `AM/PM` which is slower to use for planning.

## Decision

Use an explicit 24-hour `HH:MM` text input for focus task start/end times, so:

- The UI is always 24h, independent from OS locale.
- Noon is unambiguous (`12:00` is always 12:00).
- Users can type exact minutes quickly.

## Implementation

- `src/lib/components/ui/TimeText24.svelte`
  - A small 24h `HH:MM` input with normalization on blur / Enter.
  - Optional `datalist` suggestions via `stepMinutes` (defaults to 15, planner uses 5).
- Planner create form (`WorkspaceFocusPlanner.svelte`)
  - Replaced `input[type="time"]` with `TimeText24` for `draftStartTime` / `draftEndTime`.
  - Added `:global(.time-text-24)` styles so the parent component theme rules apply to the nested input.
  - Updated responsive grid rules to target `.field-start` / `.field-end` via `:global(...)`.
- Planner inline edit form (`WorkspaceFocusPlannerTaskItem.svelte`)
  - Replaced `input[type="time"]` with `TimeText24` for edit start/end.
  - Added `.task-edit-grid :global(.time-text-24)` so edit-field styling remains consistent.

## Verification

1. Open workstation focus planner.
2. Create a time-window task.
3. Set `12:00` to `13:00` in the start/end time fields.
4. Confirm the saved task shows `12:00 - 13:00` and can be edited again without flipping to AM/PM.

