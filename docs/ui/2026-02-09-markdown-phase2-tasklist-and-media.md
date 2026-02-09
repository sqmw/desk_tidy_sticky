# 2026-02-09 Markdown 建设 Phase 2（任务列表与媒体）

## 目标
在 Phase 1 基础上补齐高频语法，并控制单文件复杂度，便于后续继续扩展 `@xxx` 命令。

## 架构调整
为避免 `note-markdown.js` 膨胀，拆分为 3 个文件：
1. `src/lib/markdown/command-expander.js`  
- 仅负责 `@time` / `@table` 等命令展开

2. `src/lib/markdown/renderer.js`  
- 仅负责 Markdown -> HTML 渲染

3. `src/lib/markdown/note-markdown.js`  
- 轻量门面导出，保持原有调用路径不变

## 新增能力
1. 任务列表：`- [ ] task` / `- [x] task`
2. 分割线：`---` / `***` / `___`
3. 图片：`![alt](https://...)`
4. 裸链接自动识别：`https://...`

## 视觉样式补充
- 文件：`src/routes/note/[id]/+page.svelte`
- 补充样式：
  - `hr` 分割线
  - `img` 自适应宽度与圆角阴影
  - `task-list` 复选框与行布局

## 安全策略
仍保持“先转义 HTML，再规则转换”的策略，避免直接注入用户输入 HTML。

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（仅既有 warning）。
