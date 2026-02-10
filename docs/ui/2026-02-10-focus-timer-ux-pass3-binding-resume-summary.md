# 番茄计时 UX 第三轮（绑定可视化/继续按钮/统计摘要）（2026-02-10）

## 目标
按体验优先完成 3 项优化：
1. 绑定状态可视化（当前任务进度）
2. 暂停后按钮语义清晰（继续）
3. 统计折叠态保留摘要信息

## 实现
1. 计时卡增加“当前任务番茄进度”胶囊：
   - 展示 `已完成 / 目标`
   - 展示进度条
2. 主按钮文案逻辑：
   - 运行中：`暂停`
   - 已开始但暂停：`继续`
   - 未开始：`开始`
3. 统计折叠按钮增加摘要：
   - 今日专注分钟
   - 连续专注天数

## 代码位置
1. `src/lib/components/workspace/WorkspaceFocusHub.svelte`
2. `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
3. `src/lib/strings.js`

## 验证
1. `npm run check` 通过。
2. 暂停后再次点击为继续，不会误导为重新开始。
