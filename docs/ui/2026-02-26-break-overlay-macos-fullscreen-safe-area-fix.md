# 2026-02-26 休息提示层（macOS）全屏与底部遮挡修复

## 判定
- 类型：`Bug`
- 现象：休息提示层显示时仍可见菜单栏与 Dock，底部按钮/文案存在被 Dock 遮挡风险。

## 修复
1. 窗口运行态改为优先 `setSimpleFullscreen(true)`（macOS），失败回退 `setFullscreen(true)`。
2. 复用窗口时先退出 fullscreen，再更新几何，避免 setPosition/setSize 在全屏态失效。
3. `break-overlay` 页面改用 `100dvh/100dvw`，并加入 `safe-area` 顶部/底部内边距，防止底部内容裁切。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-break-overlay-windows.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/break-overlay/+page.svelte`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/capabilities/default.json`

## 回归步骤
1. 开启休息提醒并触发休息提示。
2. 在 macOS 下确认提示层覆盖后，Dock 不再遮挡底部内容。
3. 多次触发休息提示，确认窗口可重复进入提示态，不出现位置/尺寸错乱。

## 2026-03-26 补充：休息倒计时进度条语义与样式

- 判定：这是设计问题，不是倒计时逻辑 Bug。
- 根因：`break-overlay` 的进度值本身已经是从 `0 -> 100` 递增，但“占位层/已覆盖层”的颜色关系做反了，用户预期是“白色空白占位，绿色逐渐覆盖”，当前实现却是白色作为增长层。
- 调整：保留现有进度计算逻辑，只收敛样式为“白色占位轨道 + 绿色填充逐渐覆盖”，不改事件、不改时间计算。
- 代码：`src/routes/break-overlay/+page.svelte`
- 回归：启动休息 overlay 后，进度条应从白色空轨道开始，随后绿色填充随时间逐步增长；`剩余 mm:ss` 文案保持不变。
