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
