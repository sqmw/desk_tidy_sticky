# 2026-02-09 `@` 命令自动补全面板

## 目标
在贴纸编辑时输入 `@` 即弹出可选命令，不要求用户先完整输入命令名。

## 交互设计
1. 输入 `@` 或 `@前缀` 时自动显示命令列表。  
2. 列表左侧显示命令名，右侧显示执行后预览（如 `@time` 显示当前时间）。  
3. 支持键盘操作：
  - `ArrowUp/ArrowDown`：切换高亮项
  - `Enter/Tab`：插入并立即展开为最终内容
  - `Esc`：关闭面板
4. 点击其它区域自动关闭面板。

## 实现
### 1) 命令目录
- 文件：`src/lib/markdown/command-catalog.js`
- 提供命令元数据与过滤函数：
  - `NOTE_COMMAND_CATALOG`
  - `filterNoteCommands(query)`
  - `getNoteCommandPreview(command)`：返回命令执行后的右侧预览文案

### 2) 贴纸编辑器接入
- 文件：`src/routes/note/[id]/+page.svelte`
- 新增状态：
  - `showCommandSuggestions`
  - `commandQuery`
  - `commandActiveIndex`
- 新增逻辑：
  - `updateCommandSuggestions`
  - `applyCommandSuggestion`
  - `onEditorKeydown`
  - 在外部点击时自动收起
  - 选中联想命令后只触发保存防抖，不再立即重新执行联想检测，避免 `Enter` 后面板再次出现
  - 选中联想命令后立即执行 `expandNoteCommands`，实现无延迟内容替换
  - 自动保存不再执行命令展开，避免用户仅输入完整命令文本（如 `@date`）就被自动替换

### 3) UI
- 在编辑态 textarea 上方显示 `command-popover`
- 每条命令行结构：
  - 左：命令名
  - 右：执行结果预览（单行截断显示）

## 结果
用户输入 `@` 即可发现并插入命令，并能直接看到最终插入效果，降低试错成本并提升体验。
同时修复了“按 `Enter` 选中命令后联想面板再次弹出”的误触发问题。
并修复“必须等待保存后才看到命令展开结果”的延迟问题。
并修复“输入完整命令后未确认就自动展开”的误触发问题。
