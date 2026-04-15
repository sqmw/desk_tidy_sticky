# 应用内交流反馈群入口（2026-04-15）

## 判定
- 类型：`产品入口补齐`

## 背景
- 用户提供了交流反馈群二维码，希望在应用内可见。
- 该入口不适合常驻主界面，否则会持续占据视觉空间并干扰日常使用。
- 同时需要确保资源不是开发态专用文件，而是跟随正式打包一起分发。

## 设计落位
- 入口统一放在设置弹窗内，而不是主界面常驻区域。
- 两个模式都接入：
  - 简洁模式：`src/lib/components/panel/SettingsDialog.svelte`
  - 工作台模式：`src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
- 两边复用同一个反馈卡片组件：
  - `src/lib/components/common/FeedbackQrCard.svelte`

## 资源路径策略
- 原始图片来源：`.github/screenshots/qq_group.png`
- 应用内实际使用路径：`static/feedback/qq-group.png`
- 说明：
  - 运行时使用相对 Web 资源路径 `/feedback/qq-group.png`
  - 不在代码里写本机绝对路径
  - 静态资源通过 SvelteKit `static/` 目录进入构建产物，打包后的应用可直接访问

## 文案与行为
- 新增中英文文案：
  - `feedbackCommunityEyebrow`
  - `feedbackCommunityTitle`
  - `feedbackCommunityHint`
  - `feedbackCommunityCaption`
- 卡片默认直接展示二维码，不增加额外二级跳转，降低用户寻找成本。

## 回归关注点
1. 简洁模式与工作台模式的设置弹窗中都能看到二维码卡片。
2. 二维码图片在 `pnpm build` 后进入前端产物。
3. 深浅色主题下卡片都保持可读。
