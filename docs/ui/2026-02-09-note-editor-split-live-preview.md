# 2026-02-09 贴纸编辑器混合视图（Split Live Preview）

## 背景
原交互是二选一：
1. 编辑态只看 Markdown 源码
2. 预览态只看渲染结果

在长内容场景下需要频繁切换，体验割裂。

## 方案
编辑态升级为三模式循环：
1. `blocks`：块编辑（默认）
2. `source`：仅源码编辑
3. `split`：左侧源码编辑 + 右侧实时渲染预览

通过工具栏按钮循环切换，并持久化到本地存储。

## 实现
### 1) 模式状态模块化
- 新文件：`src/lib/note/editor-display-mode.js`
- 提供：
 - `EDITOR_DISPLAY_MODE`
 - `loadEditorDisplayMode()`
 - `saveEditorDisplayMode(mode)`
 - `nextEditorDisplayMode(current)`

### 2) 贴纸页接入
- 文件：`src/routes/note/[id]/+page.svelte`
- 编辑态渲染结构调整为 `editor-shell`：
 - `textarea.editor`
 - `div.editor-live-preview`（split 模式时显示）
- 增加工具栏切换按钮。
- split 视觉采用“拟态预览窗”样式（圆角、边框、阴影、轻磨砂），增强参照感。
- split 模式固定为左右布局，不再自动回退上下布局。

### 3) 文案
- 文件：`src/lib/strings.js`
- 新增：
 - `editorSplitMode`
 - `editorSourceMode`

## 用户收益
1. 默认块编辑更接近 Notion/Anytype 的操作心智。
2. 仍保留纯源码模式，兼容重度 Markdown 用户。
3. 需要渲染参照时可切到左右 split。
4. 模式偏好会记住，下次打开仍沿用上次选择。
