# Workspace 番茄“目标番茄数”滚轮输入与样式优化（2026-02-09）

## 问题
1. 使用原生 `number` 输入框，视觉与工作台风格不一致。
2. 原生上下箭头在深色主题下观感差，且交互不够直观。
3. 用户希望可通过滚轮快速调整目标番茄数。

## 方案
1. 新增独立组件 `TargetPomodoroInput.svelte`，单一职责处理：
   - 值约束（`min=1`, `max=24`）。
   - `+/-` 步进按钮。
   - 鼠标滚轮增减（向上 +1，向下 -1）。
   - 文本输入后自动校正与回写。
2. `WorkspaceFocusPlanner.svelte` 中替换原生 `input[type=number]` 为该组件。

## 关键实现点
1. 组件内统一 `clamp`，避免非法值进入任务模型。
2. `onwheel` 内 `preventDefault()`，避免调整时触发父容器滚动。
3. 焦点态增加外发光，保持与工作台控件视觉一致。

## 影响范围
1. `src/lib/components/workspace/focus/TargetPomodoroInput.svelte`（新增）
2. `src/lib/components/workspace/focus/WorkspaceFocusPlanner.svelte`（替换输入控件）

## 验证
1. 深/浅色模式下视觉一致。
2. 滚轮、按钮、手输三种方式均可正确修改值并自动限制范围。
3. `npm run check` 通过。

## 细节修复（同日）
1. 修复数字输入顶部出现浅色白边的问题：
   - 移除容器 `inset` 白色高光阴影。
   - 容器与输入区改为统一实色背景，避免透明混色产生缝隙。
   - 左右步进按钮与中间数字区采用明确分隔线，替代依赖混合阴影。
