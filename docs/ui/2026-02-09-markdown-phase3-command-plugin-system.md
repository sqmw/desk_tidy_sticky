# 2026-02-09 Markdown 建设 Phase 3（命令插件系统）

## 目标
把 `@xxx` 命令从硬编码替换升级为可注册插件机制，便于后续快速扩展（如 `@calc` / `@weather` / `@link`）。

## 架构调整
### 1) 命令处理拆层
1. `src/lib/markdown/commands/builtin-commands.js`
- 内置命令定义（默认行为）

2. `src/lib/markdown/command-expander.js`
- 命令执行引擎
- 支持动态注册：
  - `registerNoteTextCommand(handler)`
  - `registerNoteLineCommand(handler)`

3. `src/lib/markdown/note-markdown.js`
- 对外统一导出（门面）

## 命令类型
1. `text` 级命令：对整段文本进行替换  
2. `line` 级命令：对单行命令进行替换（支持返回多行）

## 内置命令（当前）
1. `@time` / `@now` -> `YYYY-MM-DD HH:mm`
2. `@date` -> `YYYY-MM-DD`
3. `@table CxR` -> Markdown 表格
4. `@hr` -> `---`
5. `@todo text` -> `- [ ] text`
6. `@done text` -> `- [x] text`

## 设计收益
1. 扩展新命令不再修改核心渲染主循环。  
2. 命令逻辑与渲染逻辑解耦，降低单文件复杂度。  
3. 后续可按命令域拆分（时间类、模板类、数据类）。

## 验证
1. `npm run check` 通过（0 errors / 0 warnings）。  
2. `cargo check` 通过（仅既有 warning）。
