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
3. 图片：`![alt](src)`，支持 `https`、相对路径、`data:image;base64`，并支持可选 title  
4. 图片尺寸扩展：`![alt](src){w=240}`、`![alt](src){w=50%,h=120}`（安全校验后渲染）
4. 裸链接自动识别：`https://...`
5. 安全内联 `span`：支持 `<span class="...">` 与受限 `style`（颜色/背景/字号/行高/字重/斜体/装饰）

## 视觉样式补充
- 文件：`src/routes/note/[id]/+page.svelte`
- 补充样式：
  - `hr` 分割线
  - `img` 自适应宽度与圆角阴影
  - `task-list` 复选框与行布局

## 安全策略
仍保持“先转义 HTML，再规则转换”的策略，避免直接注入用户输入 HTML。  
新增白名单型 `span` 直通能力，仅允许：
1. `class`（仅字母数字、`_`、`-`）
2. `style` 的受限属性：
 - `color`
 - `background`（自动归一化为 `background-color`）
 - `background-color`
 - `font-size`
 - `line-height`
 - `font-weight`
 - `font-style`
 - `text-decoration`
并兼容常见误写 `backgroud`（归一化处理）。
其余标签和属性仍会被转义。

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（仅既有 warning）。
