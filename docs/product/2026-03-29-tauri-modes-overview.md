# 2026-03-29 Tauri 模式与功能总览

## 结论
- Tauri 版对外统一为 `mini`（小窗口）与 `workstation`（工作台）两种模式。
- 当前代码窗口标识仍沿用 `main` 与 `workspace`，但产品文案与文档统一使用 `mini` / `workstation（工作台）`。
- 功能聚类为 `笔记记录 / 番茄钟 / 休息控制`，其中 workstation（工作台）聚合三者。
- README 只保留摘要，详细范围以本文件为准。

## 模式

### mini 模式（代码窗口：main）
- 定位：快速记录 + 贴纸操作。
- 入口：默认启动窗口；托盘或快捷键 `Ctrl + Shift + N` 呼出。
- 覆盖功能：笔记记录（轻量编辑、列表管理、贴纸/置顶/透明度等）。

### workstation（工作台）模式（代码窗口：workspace）
- 定位：高信息密度工作区，笔记 + 任务 + 专注。
- 入口：mini 模式中切换到 workstation（工作台）；`last_panel_window` 记录上次窗口偏好。
- 覆盖功能：笔记记录 + 番茄钟 + 休息控制。
- 数据：与 mini 模式共享同一份本地数据。

## 模块

### 笔记记录
- mini 模式：轻量输入、快速保存、贴纸展示。
- workstation（工作台）：多视图（活动/已归档/回收站）、标签筛选、搜索、右侧详情编辑。

### 番茄钟（专注）
- 位置：workstation（工作台）`专注` 标签页。
- 能力：任务规划、专注计时、统计概览。

### 休息控制
- 位置：workstation（工作台）`专注` 标签页。
- 能力：独立休息提醒、短休/长休、休息遮罩/覆盖层。

## 截图占位
- mini 模式：`.github/screenshots/hero.png` / `.github/screenshots/desktop_mode.png` / `.github/screenshots/list_page.png`
- workstation（工作台）笔记：`.github/screenshots/workspace_notes.webp`
- workstation（工作台）专注：`.github/screenshots/workspace_focus.webp`
- workstation（工作台）休息：`.github/screenshots/workspace_break.webp`

## 关键实现入口（便于定位）
- `src/routes/+page.svelte` mini 模式页面
- `src/routes/workspace/+page.svelte` workstation（工作台）页面
- `src/lib/panel/switch-panel-window.js` 窗口切换
- `src/lib/components/workspace/WorkspaceSidebar.svelte` workstation（工作台）侧栏与视图入口
- `src/lib/components/workspace/WorkspaceFocusHub.svelte` 番茄钟与休息控制
- `src/lib/workspace/focus/*` 专注与休息运行时
