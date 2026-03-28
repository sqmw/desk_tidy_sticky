# 2026-03-27 笔记编辑器重置：暂停块级方案，统一为单文档编辑

## 判定
- 类型：设计收敛
- 最短依据：
  1. 当前 `BlockEditor.svelte + contenteditable + blocks` 已不再符合“先不要块级功能”的产品边界。
  2. 块编辑与源码编辑双轨并存，导致完整笔记页与工作台详情页行为分裂，维护成本持续上升。

## 当前生效方案
1. 完整笔记页与工作台详情页统一使用单文档编辑器。
2. 编辑器基于 `textarea`，保留 Markdown 文本输入与完整文档保存链路。
3. 工作台详情页不再走单块编辑态，改回稳定的整文档编辑。
4. 块编辑模式切换、块模型与 `contenteditable` 光标工具全部退役。

## 代码变更
### 1) 统一编辑器接入
- 文件：
  - `src/routes/note/[id]/+page.svelte`
  - `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- 调整：
  - 删除 `BlockEditor` 接入。
  - 删除块/源码双模式切换状态。
  - 编辑态统一接入 `SourceEditorPane.svelte`。

### 2) 退役块模式开关
- 文件：
  - `src/lib/components/note/NoteToolbar.svelte`
  - `src/lib/strings.js`
- 调整：
  - 删除“块编辑 / 仅源码”切换按钮。
  - 删除 `editorBlockMode` / `editorSourceMode` 文案。

### 3) 退役块编辑实现
- 删除文件：
  - `src/lib/components/note/BlockEditor.svelte`
  - `src/lib/note/block-editor-helpers.js`
  - `src/lib/note/block-model.js`
  - `src/lib/note/block-ops.js`
  - `src/lib/note/block-shortcuts.js`
  - `src/lib/note/contenteditable-caret.js`
  - `src/lib/note/editor-display-mode.js`

## 2026-03-28 体验收口
### 1) 编辑态与查看态排版统一
- 文件：
  - `src/lib/components/note/SourceEditorPane.svelte`
  - `src/lib/components/note/NotePreview.svelte`
- 调整：
  - 统一编辑态与查看态的字体栈、字号、行高与留白节奏。
  - 让 Markdown 预览更接近编辑时的阅读密度，避免两种状态像两套完全不同的产品。

### 2) 单文档编辑器增加产品态占位
- 文件：
  - `src/lib/components/note/SourceEditorPane.svelte`
  - `src/lib/strings.js`
- 调整：
  - 增加 `noteEditorPlaceholder` 文案。
  - 完整笔记页与工作台详情编辑都接入统一占位提示。

### 3) 工作台详情编辑压缩为紧凑版
- 文件：
  - `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- 调整：
  - `SourceEditorPane` 新增 `compact` 形态，用于右侧详情窄区域。
  - 命令建议弹层也会按紧凑形态重新对齐位置。

## 2026-03-28 体验收口（二）
### 1) 标签区改为轻量信息条
- 文件：
  - `src/lib/components/note/NoteTagBar.svelte`
- 调整：
  - 从“标题在上、编辑器在下”的纵向堆叠，改为“左侧标签标题、右侧标签编辑器”的轻量头部条。
  - 窄宽度下自动回落为纵向布局，避免挤压。

### 2) 工具栏编辑态常驻、查看态悬停
- 文件：
  - `src/lib/components/note/NoteToolbar.svelte`
- 调整：
  - 编辑态下工具栏固定可见，不再要求用户 hover 才能保存或继续调整。
  - 查看态仍保持悬停显示，避免长期遮挡正文。
  - 同步收紧视觉样式：圆角、模糊、按钮尺寸与遮罩过渡统一。

### 3) 工具栏改为分组层级
- 文件：
  - `src/lib/components/note/NoteToolbar.svelte`
- 调整：
  - 按“主动作 / 常用状态 / 外观调整 / 生命周期 / 危险动作”分组，而不是所有按钮同权重平铺。
  - `保存/编辑` 提升为带文字的主按钮。
  - 低频危险动作单独放到末尾一组，降低误触感。

## 保留能力
1. 完整笔记页仍支持：
  - Markdown 文本编辑
  - 粘贴图片落盘并插入 Markdown 链接
  - 命令建议弹层
2. 工作台详情页仍支持：
  - 查看态渲染 HTML
  - 编辑态整文档修改
  - `Ctrl/Cmd + Enter` 保存
  - `Esc` 取消

## 回归关注点
1. 笔记页编辑不再出现块级拆分、拖拽、单块编辑态。
2. 工作台详情页输入与回退不再受 `contenteditable` 光标问题影响。
3. 保存、取消、标签与优先级链路保持不变。
4. 旧块编辑相关存储与按钮不再出现。

## 验证
1. `pnpm check`
2. 手动验证：
  - 完整笔记页进入编辑后直接显示单文档文本编辑器。
  - 工作台右侧详情进入编辑后直接显示单文档文本编辑器。
  - 两处都不再出现块模式切换入口。
