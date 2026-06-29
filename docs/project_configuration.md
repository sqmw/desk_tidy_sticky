# Project Configuration

## Version Control (.gitignore)

The project's `.gitignore` rules (updated 2026-02-06) are designed to keep the repository clean.

### Global Exclusions
- **Operating System Files**: `.DS_Store` (macOS), `Thumbs.db`, `Desktop.ini`, `$RECYCLE.BIN/` (Windows).
- **Logs**: `*.log` and specific Node package manager logs (`npm-debug.log`, `pnpm-debug.log`, etc.).
- **Environment Variables**: `.env` and `.env.*` are ignored to protect secrets. `!.env.example` is explicitly tracked to serve as a template.

### Development Stack
- **Node.js**: `node_modules/` is ignored.
- **SvelteKit/Vite**: Build directories (`/build`, `/.svelte-kit`, `/package`) and Vite timestamp files are ignored.
- **Rust/Tauri**: Handled via `src-tauri/.gitignore` (excludes `/target` and `/gen/schemas`).

### IDE Settings
- **VS Code**: `.vscode/` logic allows local overrides but tracks shared settings:
    - User settings (`.vscode/*`) are ignored.
    - `settings.json`, `tasks.json`, `launch.json`, and `extensions.json` are **tracked/allowed** (using `!`) to ensure a consistent team environment.

### Temporary Files
- **Output Checks**: `check_output_*.txt` files are ignored.

## Syncthing Sync

This project supports Syncthing-based sync with a repository-level ignore file:
- **Root `.stignore`** mirrors `.gitignore` + `src-tauri/.gitignore` to avoid syncing build artifacts and temp files.
- **Manual setup guide**: see `docs/sync/syncthing.md`.
  - Recommended default: **Send Only** on the primary device, **Receive Only** on other devices to reduce conflicts.

## Command Entry Points

The repository uses `Makefile` as the stable command entry point for macOS and Windows:

- `make dev` / `make start`: run `pnpm tauri dev`.
- `make check`: run frontend and Rust checks.
- `make build`: build the release executable without bundling.
- `make package`: build the current platform Tauri bundle.
- `make package-portable`: build the Windows portable zip.

Detailed command mapping: `docs/build/make-commands.md`.

`package.json` pins `packageManager` to `pnpm@10.28.2`.
`pnpm-workspace.yaml` allows the `esbuild` install build script so non-interactive `make check` / CI runs do not stop at pnpm approval prompts.

## Active Architecture Routes

Use these focused documents before scanning the full historical `docs/` tree:

- Current project TODO: `docs/TODO.md`.
- Note Todo blocks: `docs/product/2026-06-29-note-todo-blocks.md`.
- Single active block editor design: `docs/architecture/2026-06-29-single-active-block-editor.md`.

## Documentation Structure Review

2026-06-29 review:

- Trigger: documentation file count is far above 10% of source/config file count.
- Current conclusion: keep the existing structure for this task because this repository is a mature cross-platform desktop app with many historical issue, refactor, UI, and platform regression records.
- Current risk: default context cost is high if future agents scan `docs/` broadly.
- Routing rule: use `README.md`, `docs/project_configuration.md`, and task-specific `docs/build/*.md` first for build/start/package work; avoid bulk-reading historical `docs/issues/`, `docs/refactor/`, and `docs/ui/` unless the current bug requires that history.
