# Workspace 今日截止任务面板可操作化（Pass2）

日期：2026-02-10  
范围：工作台左侧「今日截止任务」

## 目标
- 从“纯展示列表”升级为“可操作面板”。
- 用户无需先切到专注页再找任务，能在左侧直接进行核心操作。

## 本次改动
### 1) 卡片状态可读性增强
- 每张卡新增状态徽标：
  - `待开始`
  - `进行中`
  - `已超时`
- 保留时间区间与剩余/超时分钟文案。

### 2) 番茄进度可视化
- 新增任务番茄进度行：
  - 历史版本为 `🍅 done/target`
  - 历史版本带百分比与细进度条

### 3) 卡片快捷动作
- 每张卡新增两个动作按钮：
  - `查看`：切到专注页并选中任务
  - `开始`：切到专注页并立即启动该任务专注

### 4) 专注页外部命令打通
- 在 `workspace` 页面引入 `focusCommand`（带 `nonce` 防重放）：
  - `type: "select" | "start"`
  - `taskId`
- `WorkspaceFocusHub` 监听命令并执行：
  - `select` -> 仅选中任务
  - `start` -> 直接进入专注计时

## 结构说明
- 侧栏只发出意图，不直接处理计时状态机；
- 计时启动仍由 `WorkspaceFocusHub` 内部函数执行，保持单一职责。

## 涉及文件
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/strings.js`

## 校验
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`

## 2026-03-26 补充：单任务时今日任务卡不再纵向拉伸

### 判定
- 类型：`Bug/回归`
- 现象：左侧 `今日任务` 区只有 1 张卡片时，卡片会被拉伸填满整块区域，底部出现大面积无意义留白。

### 根因
- `WorkspaceSidebar.svelte` 中的 `.deadline-list` 使用了 `display: grid`，并在自动/手动布局下拥有固定可用高度。
- 当列表只有一项时，grid 唯一一行会按剩余空间被拉大，导致单卡高度失真。

### 修复
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`
- 调整：
  1. `.deadline-list` 增加 `align-content: start`
  2. `.deadline-list` 增加 `grid-auto-rows: max-content`

### 结果
- 单任务时，左侧今日任务卡按内容高度展示。
- 多任务时，仍保持原有滚动和高度分配策略。

## 2026-03-27 补充：截止任务卡移除目标番茄进度条

### 判定
- 类型：`设计收敛`

### 变化
1. 左侧 `今日截止任务` 卡片不再显示 `done/target`、百分比和进度条。
2. 改为只显示当前任务已完成番茄次数：`🍅 done`。
3. 截止任务列表不再因为“达到目标番茄数”而过滤任务。

### 原因
- `目标番茄数` 能力已经整体下线，保留进度条只会继续引入错误语义。
