# Workspace 创建流与优先级交互统一（2026-02-11）

## 背景

本次调整聚焦三个实际问题：

1. 创建区在小窗口下控件拥挤，四象限选择器长期占位。
2. 卡片优先级交互不一致：四象限视图是下拉选择，其他视图是点击轮换。
3. 标签已入库但在主列表中感知弱，用户难以确认“标签是否真的生效”。

## 调整目标

1. 创建行为跟随当前视图语义。
2. 优先级编辑在所有视图统一为同一交互模型。
3. 标签在列表中可见、可搜索。

## 具体改动

### 1) 创建区按视图自适应

文件：

- `src/lib/components/workspace/WorkspaceToolbar.svelte`
- `src/lib/components/workspace/toolbar/WorkspaceCreateBar.svelte`
- `src/routes/workspace/+page.svelte`
- `src/lib/panel/use-note-commands.js`

规则：

1. 仅当 `viewMode === "quadrant"` 时显示四象限选择器。
2. 四象限视图下创建默认优先级自动设为 `Q2`（可改）。
3. 离开四象限视图后，创建区优先级自动清空，避免“脏选择”污染普通笔记创建。
4. 兜底：如果在四象限视图创建时优先级为空，保存逻辑强制回填 `Q2`。

### 2) 优先级交互统一

文件：

- `src/lib/components/panel/WorkbenchSection.svelte`

调整：

1. 非四象限列表中的优先级按钮不再“点击轮换”。
2. 改为与四象限卡片一致的下拉菜单：
   - 未标记
   - Q1 / Q2 / Q3 / Q4

收益：

- 所有视图操作心智一致，减少误触和学习成本。

### 3) 标签可见 + 可搜索

文件：

- `src/lib/components/panel/WorkbenchSection.svelte`
- `src/routes/workspace/+page.svelte`

调整：

1. 卡片内容区新增标签胶囊展示（最多展示 4 个）。
2. 搜索时把 `note.tags` 合并进匹配源文本，标签可被直接检索。

## 视图文案语义补充

文件：

- `src/lib/strings.js`
- `src/lib/workspace/workspace-tabs.js`

调整：

1. 工作台侧栏 `todo` 视图文案改为“待办（未完成）/ Todo (open)”以明确语义。

## 结果

1. 四象限相关控件不再全局占位。
2. 优先级编辑模型统一。
3. 标签从“仅存储”升级为“可见 + 可查找”的可用能力。
