# 前端结构整理 Pass 2（共享逻辑下沉 + 全局样式归一）

日期：2026-04-13  
范围：`src/routes`、`src/lib`

## 背景
- 多个页面重复声明 `:global(html, body)` / `box-sizing` 等 reset，导致：
  - 规则分散，后续加新页面容易漏掉；
  - 同类改动需要在多个 `+page.svelte` 里同步修改。
- Tag 规范化（去 `#`、trim、大小写比较）与 tag suggestions 采集逻辑在多个页面/组件重复实现。
- 面板（panel）笔记列表筛选与搜索逻辑长期放在 `routes/+page.svelte` 内，层次偏“页面即领域”。
- `WorkbenchSection.svelte` 内重复实现了 `note-priority` 的优先级规范化与 badge 文案。

## 本轮调整

### 1) 全局样式 reset 归一
- 新增：`src/lib/styles/base.css`
  - 统一 `html/body` 的 `margin/padding/size/overflow/background`；
  - 统一 `box-sizing`；
  - 表单控件继承字体与颜色（避免 UA 默认样式混入）。
- 新增：`src/routes/+layout.svelte`
  - 在根 layout 里一次性 import `base.css`，避免页面重复声明全局 reset。
- 调整：移除页面内重复的 `:global(html, body)` / `:global(*)` reset：
  - `routes/+page.svelte`
  - `routes/workspace/+page.svelte`
  - `routes/break-overlay/+page.svelte`（仅保留 overlay 独有的 `cursor/user-select`）
  - `routes/note/[id]/+page.svelte`

### 2) Tag 规范化下沉到 note 领域
- 新增：`src/lib/note/tags.js`
  - `normalizeTagText`：trim + 去 `#` + 长度上限（与编辑器契约一致）；
  - `normalizeTagKey`：用于大小写不敏感比较；
  - `collectTagSuggestionsFromNotes`：从 notes 列表提取去重 tag suggestions（可选排序/limit）。
- 替换：多个位置的重复实现改为复用上述函数：
  - `components/note/NoteTagsEditor.svelte`
  - `routes/note/[id]/+page.svelte`
  - `components/panel/WorkbenchSection.svelte`

### 3) 日期格式化统一
- 新增：`src/lib/note/note-date-format.js`
  - `formatNoteDate`：统一 `MM-DD HH:mm`。
- 调整：`workspace-note-selectors` 的 `formatWorkspaceNoteDate` 改为委托到 `formatNoteDate`（保留旧导出名，避免大范围重命名）。

### 4) 面板笔记选择器下沉到 panel 领域
- 新增：`src/lib/panel/panel-note-selectors.js`
  - `notesByPanelView`：按 viewMode 筛选（含 todo/quadrant/archived/trash）；
  - `getVisiblePanelNotes`：在 view 的基础上叠加搜索排序；
  - `getPanelNoteTagOptions`：面板 tag options 去重与排序；
  - `PANEL_NOTE_VIEW_MODES`：统一 viewMode 列表来源。
- 调整：`routes/+page.svelte` 改为调用选择器函数，页面逻辑更偏“组装层”。

### 5) Workbench 复用优先级逻辑
- 调整：`components/panel/WorkbenchSection.svelte`
  - 移除 `normalizePriority/priorityBadge` 的重复实现；
  - 复用 `$lib/panel/note-priority.js` 的导出（同时保持 UI 行为不变）。

## 当前边界（更新）
- `src/lib/styles/`：前端全局基础样式（仅放 reset/tokens 这类跨页面共用的内容）。
- `src/lib/note/`：note 前端领域逻辑（tag/date 等“与 note 语义绑定”的能力）。
- `src/lib/panel/`：panel 前端领域逻辑（筛选/搜索/展示装配相关的 selectors 与 actions）。
- `src/routes/`：路由入口与页面组装（不再承载可复用的领域选择器/规范化逻辑）。

## 验证
- 需要执行：
  - `pnpm check`
  - `git diff --check`
- 目标：
  - Svelte 检查 0 errors / 0 warnings；
  - 页面行为无感知变化（结构性重构为主）。

