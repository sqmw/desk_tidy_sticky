# 详情标签区重构：下拉改为可编辑标签管理

## 背景问题
用户反馈详情区标签交互存在三类问题：
1. 同区域出现两套“标签”交互（标签输入 + 下拉选择），认知冲突。
2. 下拉切换样式不符合当前工作台设计语言。
3. 无法在标签位直接完成“添加 / 修改 / 删除 / 搜索选择”闭环。

## 目标
将详情区改为统一的标签管理模型：
1. 标题行仅保留“标签”。
2. 标签以 chip 形式展示，支持点击编辑。
3. 每个 chip 右上角提供 `×` 删除。
4. 输入框常驻显示（chip + input 同行），新增与编辑都使用 input + suggestion（可输入可选）模式。
5. 保留 Q1~Q4 能力，但不再使用下拉框。

## 方案

### 1) 复用统一标签输入组件
文件：`src/lib/components/note/NoteTagsEditor.svelte`

职责：作为全局统一标签输入组件，详情区与工作台创建区复用同一套交互与联想逻辑。

核心行为：
1. 输入框常驻显示，chip 与输入在同一行。
2. 输入支持建议列表，支持直接输入新值。
3. 输入 `Q1~Q4` 自动映射优先级（priority），普通值映射普通标签。
4. `Esc` 关闭建议态，`Enter`/`,` 提交输入。
5. 输入框为空时按 `Backspace` 删除最后一个标签，降低纯键盘操作成本。

### 2) 替换详情条实现
文件：`src/lib/components/note/NoteTagBar.svelte`

变更：
1. 移除旧的 `CreateTagSelect`（下拉优先级）和双行“标签”布局。
2. 接入 `NoteTagsEditor`（复用工作台创建区同源实现），统一一个入口处理 tags + priority。

### 3) 补齐标签建议来源
文件：
- `src/lib/components/workspace/WorkspaceNoteInspector.svelte`
- `src/routes/workspace/+page.svelte`
- `src/routes/note/[id]/+page.svelte`

变更：
1. 详情面板新增 `tagSuggestions` 透传。
2. 工作台详情使用现有 `noteTagOptions` 作为建议源。
3. 单便笺页从 `load_notes` 聚合标签，形成建议列表。

## 验证点
1. 详情区不再出现“标签 + 下拉”双控件。
2. 标签 chip 可点击改名，可用右上角 `×` 删除。
3. 标签输入框始终可见，可搜索已有标签并选择。
4. 输入 `Q1/Q2/Q3/Q4` 会更新优先级。
5. `npm run check` 通过，`cargo check` 通过。
