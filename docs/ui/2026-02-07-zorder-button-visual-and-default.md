# 2026-02-07 Z-Order Button Visual And Default

## Requirement Clarification
1. 新建贴纸（包括 pin 后首次显示）默认应在底层（WorkerW），不是顶层。  
2. 顶层/底层切换按钮应通过图标方向表达状态，不应额外出现明显边框高亮。  

## Code Changes
### Default Layer Policy
- `src-tauri/src/notes.rs`
  - `Note::new` 中 `is_always_on_top` 固定默认 `false`。
- `src-tauri/src/notes_service.rs`
  - `toggle_pin` 取消“pin 时自动设为顶层”的逻辑。

### Z-Order Button Visual
- `src/lib/components/panel/NotesSection.svelte`
  - 移除 `.action-btn.zorder-toggle.active` 的边框和底色，仅保留颜色区分。
- `src/routes/note/[id]/+page.svelte`
  - 移除 `.tool-btn.active` 的边框与高亮底色，保持视觉一致性。

## Expected Result
- 新建并 pin 的贴纸默认附着 WorkerW（底层）。
- 顶层与底层状态由“上下方向图标”区分，不再出现不协调的激活边框块。
