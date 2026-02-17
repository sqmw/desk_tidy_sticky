# 工作台/便笺编辑体验优化：仅当前块进入编辑态

## 问题
原实现中，进入编辑后所有内容都处于输入态（全页 `contenteditable` 或整块 `textarea` 源码态）。
这会造成：
1. 阅读与编辑难以并存。
2. 需要频繁在“查看/编辑”之间切换。
3. 长文档定位与微调体验差。

## 目标
对齐 Notion/Anytype 的核心编辑感受：
1. 仅当前操作块进入编辑态。
2. 其余块保持渲染态，保证上下文可读。
3. 工作台详情编辑与便笺编辑行为保持一致。

## 实现

### 1) BlockEditor 改为“单块编辑态”
文件：`src/lib/components/note/BlockEditor.svelte`

关键调整：
1. 新增 `editingBlockId`，作为唯一编辑中的块。
2. 非编辑块改为渲染展示（使用 `renderNoteMarkdown(blocksToMarkdown([block]))` 生成预览 HTML）。
3. 点击非编辑块时，仅该块切换到编辑态并聚焦光标。
4. `/` 命令菜单仅在当前编辑块显示。
5. 工具按钮（拖拽/类型/新增）改为 hover/active 显示，降低视觉噪音。

### 2) 工作台详情编辑改为复用 BlockEditor
文件：`src/lib/components/workspace/WorkspaceNoteInspector.svelte`

关键调整：
1. 编辑态从整块 `textarea` 切换为 `BlockEditor`。
2. `draftText` 继续作为单一数据源，不改变原保存/取消链路。
3. 保留快捷键：
   - `Ctrl/Cmd + Enter` 保存
   - `Esc` 取消编辑
4. 查看态仍使用渲染后的 `renderedHtml`。

## 交互结果
1. 编辑时只影响当前块，其他内容保持可读。
2. 长文档编辑不再“整页源码化”。
3. 工作台与便笺的编辑感知更统一。

## 回归点
1. 块拆分/合并（Enter / Backspace）正常。
2. 拖拽排序、切换块类型、待办勾选正常。
3. 工作台详情保存/取消逻辑不变。
4. 查看态渲染逻辑不变。
