# Workspace 今日截止任务：延后 15/30 分钟快捷操作

日期：2026-02-10  
范围：工作台左侧「今日截止任务」卡片动作

## 目标
- 在不打断当前流的前提下，允许用户快速微调任务时间；
- 避免必须进入表单编辑才能改时间的高成本操作。

## 本次改动
### 1) 新增卡片快捷动作
- 每条截止任务新增：
  - `+15m`
  - `+30m`
- 中文文案：`延后15分` / `延后30分`。

### 2) 交互行为
- 点击后仅调整该任务的 `startTime/endTime`（整体平移）；
- 立即持久化到偏好存储；
- 不切页、不弹窗，不影响当前视图上下文。

### 3) 时间计算
- 新增工具函数：
  - `minutesToTime(minutes)`（0~1439 环绕到 `HH:mm`）
- 延后通过：
  - `timeToMinutes(start/end) + delta -> minutesToTime(...)`
- 保持任务时长不变，只移动时间窗口。

## 涉及文件
- `src/lib/workspace/focus/focus-model.js`
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/strings.js`

## 校验
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
