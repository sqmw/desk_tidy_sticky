# 2026-04-14 专注任务按钮状态透传修复

## 背景

任务行主按钮文案（开始/暂停/继续）依赖：
- `selectedTaskId`
- `activeTaskStarted`
- `activeTaskRunning`

回归中 `selectedTaskId` 在 `WorkspaceFocusHub -> WorkspaceFocusHubView` 透传链路被遗漏，导致任务行无法识别“当前激活任务”，按钮退化为全部显示 `开始`。

## 修复

在 `WorkspaceFocusHub.svelte` 调用 `WorkspaceFocusHubView` 时恢复透传：
- `{selectedTaskId}`

## 结果

按钮状态重新按串行模型工作：
1. 当前激活且运行中：`暂停`
2. 当前激活且暂停中：`继续`
3. 其他任务：`开始`
