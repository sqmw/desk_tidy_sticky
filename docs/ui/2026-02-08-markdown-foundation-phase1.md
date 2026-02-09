# 2026-02-08 Markdown 建设 Phase 1（可用基础版）

## 目标
在不破坏当前贴纸架构的前提下，引入 Markdown 预览能力，并建立可扩展命令机制（`@time` / `@table`）。

## 核心实现
### 1) 新增 Markdown + 命令模块
- 文件：`src/lib/markdown/note-markdown.js`
- 导出：
  - `expandNoteCommands(text)`  
  - `renderNoteMarkdown(text)`

### 2) 已支持命令
1. `@time`  
- 展开为本地时间字符串：`YYYY-MM-DD HH:mm`

2. `@table CxR`  
- 例：`@table 3x4`  
- 展开为 Markdown 表格（3 列，4 行内容）

### 3) 已支持 Markdown 渲染（基础）
1. 标题：`#` / `##` / `###`
2. 列表：无序、有序
3. 引用：`>`
4. 行内代码与代码块：`` `code` `` / ``` ```
5. 粗体、斜体
6. 链接：`[text](https://...)`
7. 表格（标准 markdown table）

## 接入点
### 1) 贴纸窗口预览改为 Markdown
- 文件：`src/routes/note/[id]/+page.svelte`
- 预览态改用 `{@html renderedMarkdown}` 渲染。

### 2) 保存链路加入命令展开（一次性写入）
- 文件：`src/routes/note/[id]/+page.svelte`
- 自动保存前先执行 `expandNoteCommands`。

- 文件：`src/lib/panel/use-note-commands.js`
- 新建便笺保存前执行 `expandNoteCommands`。

- 文件：`src/routes/+page.svelte`
- 编辑弹窗保存前执行 `expandNoteCommands`。

## 安全说明
渲染器采用“先 HTML 转义，再有限规则转换”的策略，避免直接执行用户输入 HTML。

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。

## 后续建议（Phase 2）
1. 支持任务列表（`- [ ]` / `- [x]`）  
2. 支持更多块语法（分割线、内嵌图片）  
3. 命令扩展插件化（`@xxx` 解析器注册机制）
