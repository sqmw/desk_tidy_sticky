# 2026-02-12 Workspace：休息入口重构与侧栏紧凑布局

## 背景
- 休息策略入口分散在计时卡和提示卡中，主流程不清晰。
- 窄宽度（约 70% 屏宽）下，左侧导航/视图/任务会互相挤压，影响可读性和点击体验。

## 目标
- 将休息策略操作收敛到一个独立区域，计时器主操作只保留核心动作。
- 左侧栏改为分区可折叠、分区独立滚动，避免堆叠和覆盖。

## 方案
### 1) 独立休息控制条
- 新增 `src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`。
- 控制条统一展示：
  - 下次小休 / 下次长休
  - 提醒状态
  - 动作按钮：开始休息、延后、跳过
- 按钮约束：
  - 未触发 `breakPrompt`：动作禁用
  - `strict` 模式：延后/跳过禁用
  - 延后次数达到上限：延后禁用

### 2) 计时卡职责收敛
- `WorkspaceFocusTimer.svelte` 移除主操作区 `Skip` 按钮。
- 计时卡保留：开始/暂停、重置、设置。
- “下次小休/下次长休/提醒状态”迁移至独立休息控制条。

### 3) 侧栏紧凑布局
- 新增纯函数 `src/lib/workspace/sidebar/sidebar-layout.js`。
- 统一根据 `viewportWidth/viewportHeight/sidebarWidth/uiScale` 计算：
  - `compact`（是否进入紧凑模式）
  - `viewSectionMaxHeight`
  - `deadlineSectionMaxHeight`
- `WorkspaceSidebar.svelte` 接入：
  - 紧凑模式下分区折叠按钮
  - 视图区、今日任务区各自独立滚动
  - 全栏不再承担单一滚动，避免分区挤压

## Strict 模式交互矩阵
| 状态 | 开始休息 | 延后 | 跳过 |
|---|---|---|---|
| 未触发休息 | 禁用 | 禁用 | 禁用 |
| 已触发 + 非 strict | 可用 | 可用（受次数上限） | 可用 |
| 已触发 + strict | 可用 | 禁用 | 禁用 |

## 影响文件
- `src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`（新增）
- `src/lib/components/workspace/focus/WorkspaceFocusTimer.svelte`
- `src/lib/components/workspace/WorkspaceFocusHub.svelte`
- `src/lib/components/workspace/WorkspaceSidebar.svelte`
- `src/lib/workspace/sidebar/sidebar-layout.js`（新增）
- `src/routes/workspace/+page.svelte`
- `src/lib/strings.js`

## 验证
- `npm run check` 通过（0 error / 0 warning）
- `cargo check` 通过（仅历史 warning）

