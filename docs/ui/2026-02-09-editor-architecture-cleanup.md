# 2026-02-09 编辑器结构治理记录

## 发现的问题（按设计原则）
1. 单一职责偏弱
 - `+page.svelte` 同时承担窗口控制、工具栏、编辑器、渲染、输入策略，职责过重。
2. 可扩展性不足
 - 块编辑逻辑一开始集中在组件内部，后续新增拖拽/拆分/合并容易互相影响。
3. 复用性不足
 - `contenteditable` 光标偏移处理若散落在组件内，会重复且高风险。

## 本次治理动作
1. 抽离块操作域服务
 - 新增 `src/lib/note/block-ops.js`
 - 收敛拆分、合并、重排、插入、类型转换等纯函数。
2. 抽离 `contenteditable` 光标工具
 - 新增 `src/lib/note/contenteditable-caret.js`
 - 封装选区偏移读取、恢复、行首判断，降低 UI 层复杂度。
3. 抽离 Markdown 快捷输入解析
 - 新增 `src/lib/note/block-shortcuts.js`
 - 将 `# `、`- `、`[] ` 等快捷语法从视图事件中解耦，作为独立规则模块维护。
4. 块编辑改为单画布 WYSIWYG
 - `src/lib/components/note/BlockEditor.svelte` 从 `textarea` 切换为 `contenteditable`。
 - 页面层不再为块编辑叠加“左右编辑+预览”的旁路模式。
5. 抽离贴纸工具栏组件
 - 新增 `src/lib/components/note/NoteToolbar.svelte`
 - 将颜色面板、透明度/磨砂面板、置顶/归档/删除等工具栏 UI 与样式从 `+page.svelte` 拆出。
6. 抽离预览渲染组件
 - 新增 `src/lib/components/note/NotePreview.svelte`
 - 收敛预览容器与 markdown 样式，页面仅负责传入渲染结果。
7. 抽离源码编辑区组件
 - 新增 `src/lib/components/note/SourceEditorPane.svelte`
 - 收敛 `textarea`、`@` 命令建议弹层与对应样式，页面仅做事件编排。
8. 抽离主题与命令规则工具
 - 新增 `src/lib/note/note-theme.js`（默认主题常量、颜色转换）
 - 新增 `src/lib/note/source-command.js`（源码模式 `@` 命令 token 识别与插入）

## 对应原则收益
1. SRP（单一职责）：
 - 页面层主要做编排，块领域逻辑下沉到 `note/*`。
2. OCP（开闭）：
 - 新增块行为优先扩展 `block-ops.js`，降低修改已有 UI 代码范围。
3. DIP（依赖倒置）：
 - 组件依赖抽象工具函数而非底层选区 API 细节。
4. ISP（接口隔离）：
 - 快捷语法匹配、块数据操作、光标定位各自模块化，减少大组件内部耦合接口。
5. 组合复用：
 - `NoteToolbar` 可在后续多窗口/浮层场景复用，不再耦合页面文件。

## 仍待优化（后续）
1. `src/routes/note/[id]/+page.svelte` 体积依然较大，建议继续拆：
 - `NoteWindowFrame.svelte`
 - `SourceEditorPane.svelte`
 - `useNoteWindowDrag.js`（窗口拖拽策略）
2. 块编辑可继续补：
 - 选中文本浮动工具条
 - 块菜单（复制/删除/duplicate）
