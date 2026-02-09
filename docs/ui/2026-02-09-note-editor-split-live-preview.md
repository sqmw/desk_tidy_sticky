# 2026-02-09 贴纸编辑器模式精简（移除 Split）

## 背景
此前编辑器一度支持 `split`（左源码、右预览）模式。  
实际使用反馈显示该模式视觉噪音高、操作割裂，且与 Notion/Logseq 的单画布编辑心智不一致。

## 方案
将编辑态收敛为双模式循环：
1. `blocks`：单画布块编辑（默认）
2. `source`：仅源码编辑

明确移除 `split` 模式，不再渲染右侧实时预览窗。

## 实现
### 1) 模式状态收敛
- 新文件：`src/lib/note/editor-display-mode.js`
- 提供：
 - `EDITOR_DISPLAY_MODE`
 - `loadEditorDisplayMode()`
 - `saveEditorDisplayMode(mode)`
 - `nextEditorDisplayMode(current)`
- 变更点：
 - 删除 `SPLIT` 枚举值
 - `nextEditorDisplayMode` 改为 `blocks <-> source` 双向切换

### 2) 贴纸页接入
- 文件：`src/routes/note/[id]/+page.svelte`
- 编辑态保留 `editor-shell > textarea.editor`（source 模式）
- 删除 `editor-live-preview` 节点与对应分栏样式
- 增加工具栏切换按钮。
- 切换按钮只在块编辑和源码编辑间切换。

### 3) 文案
- 文件：`src/lib/strings.js`
- 删除未使用的 `editorSplitMode`
- 保留：
 - `editorBlockMode`
 - `editorSourceMode`

## 用户收益
1. 编辑界面更聚焦，避免左右分栏干扰。
2. 默认块编辑更接近 Notion/Anytype 的同屏编辑体验。
3. 仍保留源码模式，兼容重度 Markdown 用户。
4. 模式偏好会记住，下次打开仍沿用上次选择。
