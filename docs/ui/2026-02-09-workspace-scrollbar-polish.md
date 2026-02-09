# Workspace 滚动条视觉优化（2026-02-09）

## 背景
workstation 模式右侧主内容区滚动条仍使用系统默认样式，在深色主题下对比突兀，影响整体观感。

## 本次调整
1. 为 workspace 主题增加滚动条变量，区分 light/dark：
   - `--ws-scrollbar-track`
   - `--ws-scrollbar-thumb`
   - `--ws-scrollbar-thumb-hover`
2. 在 `WorkbenchSection` 主滚动容器启用细滚动条并套用主题变量：
   - Firefox: `scrollbar-width: thin` + `scrollbar-color`
   - Chromium/WebView2: `::-webkit-scrollbar` 系列样式
3. 保持原有布局和交互不变，仅做视觉层优化。

## 影响文件
- `src/routes/workspace/+page.svelte`
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 errors / 0 warnings）。
