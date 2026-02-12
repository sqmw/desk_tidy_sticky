# Workspace 显示缩放改为整窗统一缩放

## 问题
- 用户反馈设置 `140%` 后视觉上并不像完整 140%。
- 根因是此前缩放仅覆盖部分组件（局部字号/局部间距），不是工作台整窗统一缩放。

## 方案
- 在 `src/routes/workspace/+page.svelte` 中将显示缩放改为整窗等比缩放：
  - 新增变量 `--ws-ui-scale` 作为整窗缩放倍率。
  - `workspace` 容器应用：
    - `width: calc(100% / var(--ws-ui-scale))`
    - `height: calc(100% / var(--ws-ui-scale))`
    - `transform: scale(var(--ws-ui-scale))`
    - `transform-origin: top left`
- 字体大小保持独立职责：
  - `workspaceTextScale` 只受“字体大小”设置影响，不再叠乘显示缩放，避免重复放大。

## 结果
- `90% / 100% / 110% / 125% / 140%` 均可按整窗统一比例生效。
- “显示缩放”与“字体大小”分离：
  - 显示缩放负责界面整体密度；
  - 字体大小负责文本阅读偏好。

## 影响文件
- `src/routes/workspace/+page.svelte`
