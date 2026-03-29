# 2026-03-29 Tauri 模式与功能总览

## 结论
- Tauri 版存在 `main`（简洁模式）与 `workspace`（工作台模式）两种窗口形态。
- 功能聚类为 `笔记记录 / 番茄钟 / 休息控制`，其中工作台聚合三者。
- README 只保留摘要，详细范围以本文件为准。

## 模式

### 简洁模式（main）
- 定位：快速记录 + 贴纸操作。
- 入口：默认启动窗口；托盘或快捷键 `Ctrl + Shift + N` 呼出。
- 覆盖功能：笔记记录（轻量编辑、列表管理、贴纸/置顶/透明度等）。

### 工作台模式（workspace）
- 定位：高信息密度工作区，笔记 + 任务 + 专注。
- 入口：主面板“打开工作台”切换；`last_panel_window` 记录上次窗口偏好。
- 覆盖功能：笔记记录 + 番茄钟 + 休息控制。
- 数据：与简洁模式共享同一份本地数据。

## 模块

### 笔记记录
- 简洁模式：轻量输入、快速保存、贴纸展示。
- 工作台：多视图（全部/待办/四象限/归档/回收站）、标签筛选、搜索、右侧详情编辑。

### 番茄钟（专注）
- 位置：工作台 `专注` 标签页。
- 能力：任务规划、专注计时、统计概览。

### 休息控制
- 位置：工作台 `专注` 标签页。
- 能力：独立休息提醒、短休/长休、休息遮罩/覆盖层。

## 截图占位
- 简洁模式：`.github/screenshots/hero.png` / `.github/screenshots/desktop_mode.png` / `.github/screenshots/list_page.png`
- 工作台笔记：`.github/screenshots/workspace_notes.svg`
- 工作台专注：`.github/screenshots/workspace_focus.svg`
- 工作台休息：`.github/screenshots/workspace_break.svg`

## 关键实现入口（便于定位）
- `src/routes/+page.svelte` 简洁模式页面
- `src/routes/workspace/+page.svelte` 工作台页面
- `src/lib/panel/switch-panel-window.js` 窗口切换
- `src/lib/components/workspace/WorkspaceSidebar.svelte` 工作台侧栏与视图入口
- `src/lib/components/workspace/WorkspaceFocusHub.svelte` 番茄钟与休息控制
- `src/lib/workspace/focus/*` 专注与休息运行时
