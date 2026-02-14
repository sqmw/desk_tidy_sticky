# 2026-02-13 Workspace Focus：休息入口位置修正与“绑定任务”语义修正

## 问题
- 休息控制条在宽屏布局下出现错位（落到右下角），视觉和操作都不合理。
- “绑定任务”语义与预期不一致：
  - 期望：跟随番茄任务专注流程，到了休息点要弹休息窗口。
  - 实际：被当成“抑制休息触发”。

## 修复结论
1. 入口迁移  
- 将休息控制入口放回番茄计时卡（左上番茄区），通过入口按钮展开控制面板。  
- 不再独立占右侧/底部视觉块，避免错位。

2. 绑定任务语义修正  
- `独立运行(global)`：全局暂停休息触发（可类 Stretchly 的临时暂停）。
- `绑定任务(task)`：仅在绑定任务专注时允许正常休息触发弹窗；非绑定任务时抑制。

## 关键实现
- `src/lib/workspace/focus/focus-break-session.js`
  - `shouldSuppressBreakPromptBySession` 改为：
    - `global` -> 抑制
    - `task` -> 仅当当前任务不是绑定任务时抑制
- `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
  - 在番茄头部新增休息入口按钮（展开/收起）。
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
  - 休息控制条嵌入计时卡下方。
  - 移除旧的独立 `break-controls-slot` 布局，修复宽屏错位。
  - break prompt 出现时自动展开休息面板。

## 验证
- `npm run check`：通过
- `cargo check`：通过（仅历史 warning）

