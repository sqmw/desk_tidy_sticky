# Current Agent Context

## Situation

The current delivery line is installable timetable v0.1 in the main Tauri product, under T-PLUGIN-HOST with mobile/timetable Tasks. Feasibility Probe is closed under the user-approved simulator baseline; this does not waive arbitrary-code security gates. See the [product checkpoint](../plugins/2026-09-11-product-checkpoint.md) and [current executions](../STEPS.md#t-plugin-host). Earlier desktop review gates remain separate.

## Current State

- Real timetable demo/schema v2 supersede invented visual fixtures: 15 courses/classes, 82 dated meetings, 87 teacher records, all reference times and reminders disabled. Plugin0.2.0 supports v1/v2; fixed old0.1.0 digest remains admitted to preserve installed states. See [schema and demo](../plugins/timetable-schema-v2.md). No production data replacement or external publication.

- Timetable UI now prioritizes a compact weekly grid, not large daily/reminder cards. Week navigation, course details and secondary settings reuse the existing external Worker/JSON contract; see [week-view design and evidence](../ui/2026-09-11-timetable-week-view.md). Ownership: T-TIMETABLE-PLUGIN/E-002. No native adapter or plugin-package changes in this batch.

- E-003 implements the D-EXT-007 workspace integration. Sidebar plugin/timetable entries now switch workspace content; notes stay mounted/inert when hidden, navigation waits existing saves and blocks conflicts, and confirmations use in-window dialogs. See [implementation evidence](../plugins/workspace-integration-implementation.md) for Mac/DOM results and compatibility boundaries. Earlier documentation-only wording below describes E-002, not current code.

- D-EXT-007 / [workspace integration plan v1](../plugins/workspace-integration-plan.md) is the next Mac product design: sidebar entries switch the existing workspace content, not a separate OS window. This turn is documentation only; code still has the separately-windowed 303a375 behavior. Preserve drafts and block failed-save navigation before embedding existing components; do not expand mobile/framework/native adapters. Current execution: T-PLUGIN-HOST/E-002, with later implementation not yet started.

- D-EXT-006 now prioritizes the Mac product experience: sidebar plugin management, installed timetable entry, import preview/confirmation and saved-course display. No mobile packaging, new notification adaptation or generic framework expansion in this batch. See [Mac product flow](../plugins/mac-product-flow.md). Existing native changes remain preserved.

- Mac product UI batch has native evidence for package install, file import, full preview, save, process reopen, sidebar direct entry, and disable with data retained/queue empty. UI is split into manager/timetable/import components; malformed input and retry/navigation guards have real Worker DOM regression. Exact evidence and residual reminder/format gates are in the product flow above; no arbitrary-third-party or mobile release claim.

- D-EXT-005 established the earlier sequencing decision: finish the usable Mac product flow first; pause mobile packaging/interactive acceptance and do not expand Probe work. Shared Worker Proxy serialization and visible feedback are the immediate fix. Keep the existing platform adapters and evidence; do not rebuild three business implementations.

- Current batch is installable timetable v0.1 in the product, per [D-EXT-004](../DECISIONS.md#d-ext-004) and [product baseline](../plugins/timetable-v01.md). Simulator acceptance replaces the true-device gate only for this milestone. Exact reviewed package digests gate installation; arbitrary third-party execution remains closed pending isolation/resource validation. Product plugin page, native state/lifecycle and mobile boot paths are new implementations, not copied Probe shells.

- Current S3 evidence: Android Probe `34b8a94` and iOS evidence `e79ec60` both cover the same external JS/JSON course import, Rust persistence/reopen, background notification and cancellation on simulators. The user completed iOS file selection; E-006 succeeded after latest-build regression. True-device/channel, permission/reboot matrix and resource/security validation remain open. No product code promotion.

- E-004 Probe `3e85be7` adds durable storage and actual Rust process restart evidence (14 tests plus two explicitly run child-host tests). Old sessions are not stored or restored. S2's minimal validation gate is complete; S3 begins mobile prerequisites. Product IPC, mobile runtime/notifications and resource-hardening are not implied; see [current execution](../STEPS.md#t-plugin-platform-validation).

- Plugin admission and the host-only session broker remain unconnected to application IPC. The broker validates storage requests, namespaces in-memory data and revokes stale handles; these tests do not prove JS runtime isolation or durable storage. See the [contract](../plugins/implementation-baseline.md). Policy changes must reauthorize fail-closed; failed candidate installation is a distinct lifecycle operation.
- E-003 adds real external JS connection evidence in sibling Probe `desk_tidy_sticky--probe--js-connection` at `518d2ed`: six JavaScriptCore child-process/pipe integration tests pass. This does not change product IPC or prove persistence/mobile deployment. Follow the contract's evidence route; do not copy Probe code into the product without explicit promotion and normal implementation review.

- Review remediation R01–R12 has source changes and regression evidence in the [remediation plan](../plans/2026-09-10-review-remediation.md). Task acceptance remains in [TODO](../TODO.md#t-project-review-fix); physical mixed-DPI and login-startup smoke tests are not implied by automated tests.
- Closing a workspace inspector never deletes a stored note. Editor failures preserve drafts with retry/reload actions; reload explicitly discards the draft. Text commands require `expectedText`, checked under `NotesStore`; text events identify `sourceWindow` instead of suppressing other writers by time.
- Preferences now use backend field patches under a shared lock and the common `runtime/atomic_file.rs` writer. Corrupt preferences/current note records block replacement; legacy import alone remains best-effort. Markdown exports include `is_done`, and imports publish a text-change event after commit.
- Development builds omit the autostart plugin and disable its settings controls based on backend capability. Local 1.2.6 is installed; the existing correct login plist was reloaded after an initial code-signing rejection, without changing its content. See [local acceptance](../releases/2026-09-10-local-1.2.6-acceptance.md). Windows monitor geometry uses a single window-scale coordinate space; macOS retains its platform-specific point conversion.

- `NotesStore` serializes all note command, sticky-window, import/export, and runtime-check storage access.
- An unreadable primary notes file produces `recovery_required`; the application blocks later note operations and exposes the data-directory action without attempting repair. Shared and route-local note mutations, Markdown import/export, and note-window synchronization all refresh the same recovery state.
- Safe writes use synced same-directory temporary files, replacement without deleting the target first, and one last-known-good backup in the application data directory.
- Workspace cards keep pointer single-click selection when the inspector is open, while a dedicated details button provides keyboard access without a nested button role.
- Workspace note assembly and transient block-editor selection/cursor state now live in focused components/controllers.
- Sticky control mode preserves the note rectangle as a two-dimensional geometry invariant: the native window adds equal transparent side reserves plus measured top/bottom reserves, while the note body keeps its stored screen position and size. Exit/tags and the four grouped toolbar sections render as separate glass floating islands; the bottom island remains single-row and keeps delete isolated at the far edge.
- Native macOS panel opacity/shadow is disabled for note panels. Native full-window frost is temporarily cleared while external controls are visible because a rectangular native effect cannot preserve transparent gaps; the note body uses the existing CSS frost fallback and restores native frost after controls close. Do not rely on Tauri 2 `set_effects(None)` for this macOS path: its macOS branch does not clear vibrancy. The adapter calls `window-vibrancy` on the main thread, removes every tagged residual effect view, and clears before each reapply to prevent stacking.
- Sticky dragging uses the original note-surface hit area again and exposes `grab` / `grabbing` cursor feedback; form controls, links, editors and popovers remain excluded. Rendered blocks expose a separate keyboard edit control and pointer clicks estimate the Markdown caret position.
- Sticky edge hiding computes against the fixed note body rather than the expanded native window. Hidden notes retain exactly an 8px body sliver inside the current monitor work area, normalize stale coordinates when their window becomes ready, and expose a four-edge wheel/trackpad plus click reveal handle. Hidden-window reconstruction treats the persisted visible axis as authoritative, so Windows cannot collapse multiple offscreen notes by feeding its temporary creation position back into storage. On Windows, the sticky-hide shortcut executes only after a deliberate 30ms-2s press/release pair; moved hidden windows are independently debounced and normalized back to their persisted edge without changing state, closing the monitor-off/on recovery path.
- Windows WorkerW detach restores top-level popup style before `SetParent(hwnd, NULL)`. Parent inspection treats `NULL + GetLastError()==0` as the valid top-level state instead of a Win32 failure, while nonzero errors remain visible; desktop and wallpaper attachment behavior is unchanged.
- The block editor reports whether its active source actually differs from the stored block. Metadata events refresh without conflict; only a text-affecting event meeting a real unsaved draft shows the recovery notice and requires an explicit reload.
- The block editor tracks IME composition explicitly. Candidate confirmation and navigation keys bypass block Enter/Tab/arrow shortcuts while composition is active, with `KeyboardEvent.isComposing` and keyCode 229 as browser fallbacks.
- Note appearance uses one color veil instead of painting the same alpha twice. Opacity preserves the exact zero endpoint; frost increases blur and progressively reveals desktop content beneath the veil so its full range remains perceptible in control-mode CSS fallback and native-window mode.
- Clipboard images are saved through the existing backend command and inserted into the active textarea selection. Failures leave the text draft unchanged and display an inline error.

## Verification

Run from the repository root:

```bash
make check
make test
git diff --check
```

`make test` runs the Node frontend interaction tests and Rust unit tests. A local component preview verified all toolbar actions outside the fixed note rectangle: the top island measured about 287×56px and the grouped single-row bottom island about 384×46px. Ordered-list editing kept identical top/left coordinates with a 0.09px height rounding difference; h1 editing moved following content by only 0.20px of browser rounding. Pure tests verify two-dimensional expand/collapse coordinate conservation, expanded-window drag persistence, hidden body offset conversion, Windows offscreen-window reconstruction preserving distinct along-edge positions, disconnected-monitor clamping, Windows sticky-shortcut intent filtering, per-window display-move debouncing, wheel threshold accumulation, metadata/text conflict classification, IME key ownership, opacity zero and frost surface-alpha progression. Native Chinese IME confirmation, opacity/frost desktop composition, trackpad direction, first-frame handle hit testing, Windows visibility-toggle reconstruction, monitor-off/on recovery and live display disconnect still need desktop smoke tests.

The macOS cross-target Windows toolchain still reports its standard library as unavailable, and no local toolchain was installed or changed. On 2026-08-06 the Syncthing-synchronized Lenovo Windows workspace passed native `cargo check` and all 21 Rust tests, including the Windows-only shortcut, display-recovery and WorkerW parent branches. Real monitor-off/on and WorkerW layer-switch smoke tests remain required before release.

## Risks And Recovery

- Accepted release gate: no release or package promotion occurs before the recovery UI and normal note flows receive a desktop smoke test.
- The native frost fallback during control mode is intentional: keeping a full-window native acrylic/vibrancy layer would repaint the transparent space between the note and floating islands.
- The caret estimate is deliberately best-effort because rendered Markdown and source Markdown are not layout-identical. Precise rich-text caret mapping remains outside the single-textarea architecture.
- External changes preserve the local draft but are not automatically merged. Reload explicitly discards that draft, so the warning keeps the action visible and user-controlled.
- Physical touchpad direction cannot be inferred reliably from `WheelEvent` sign because natural scrolling is configurable. The hidden-edge controller accepts deliberate movement on the relevant axis and uses a threshold plus in-flight lock to avoid accidental or repeated reveals.
- Recovery state deliberately does not rebuild, move, or overwrite user data. The user can open the application data directory and inspect `notes.json` plus the previous valid backup.
- Runtime data is outside the synchronized working tree. Do not move it into repository-relative storage.

## Task Route

See [Project TODO](../TODO.md) for stage ownership and the completed-record summary. Historical documentation routing is in [P3 Index](p3-index.md).
