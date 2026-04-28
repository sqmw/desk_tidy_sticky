# Windows 图标层贴纸透明边遮挡桌面图标

## 背景

Windows 上贴纸放到“贴在图标上层”的 WorkerW 图标层后，贴纸左右和下方会出现一圈视觉透明但仍会遮挡桌面图标的窗口区域。macOS 没有这个问题。

## 判定

这是 Windows WorkerW 子窗口的原生区域问题，不是贴纸内容绘制问题。

截图里能看到壁纸仍然正常透出，但桌面图标被透明区域截断，说明该区域仍属于贴纸窗口的 native region。

## 失败方案记录

1. 固定像素 inset 直接裁剪窗口：会减少透明宿主边，但也会把可见贴纸本体的右侧和底部一起裁掉。
2. 读取 DWM 扩展边界再反推裁剪：在该 WorkerW 子窗口场景下，DWM 边界仍然接近宿主窗口边界，无法稳定表达 DOM 内真实贴纸区域，图标遮挡问题会回到原点。
3. 前端测量 `.note-window` 后用 `SetWindowRgn` 裁剪：WebView/frameless/resizable 窗口的 region 坐标与 DOM 坐标不完全等价，会导致左侧或底部贴纸本体被裁短。

## 方案

不再对 Windows 贴纸窗口做内容 region 裁剪，改为从窗口创建源头关闭 native shadow：

1. 新建贴纸窗口时设置 `shadow: false`。
2. 贴纸页启动后再次调用 `setShadow(false)`，覆盖已存在窗口和开发热更新场景。
3. WorkerW 切层仍保持清空 window region，避免继承旧裁剪。
4. CSS 继续负责贴纸本体的视觉样式；Windows 图标层不再使用 native region 去裁 DOM 内容。

这个方案避免 native shadow/透明扩展边参与桌面图标层遮挡，同时不再裁短贴纸本体。

## 影响范围

- 影响：Windows `贴在图标上层`
- 不影响：Windows `贴到壁纸层`
- 不影响：Windows `置顶显示`
- 不影响：macOS

## 验证

1. Windows 上打开一张已钉住贴纸。
2. 切到 `贴在图标上层`。
3. 将贴纸移动到桌面图标附近。
4. 确认贴纸左右和下方的透明边不再遮挡图标。
5. 切换到 `贴到壁纸层` 和 `置顶显示`，确认两种模式不受影响。
