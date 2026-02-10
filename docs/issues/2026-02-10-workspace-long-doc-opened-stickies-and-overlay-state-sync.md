# 写长文档误开贴纸 + 贴纸状态刷新不一致

## 现象
- 在工作台点击“写长文档”时，即使桌面贴纸已关闭，仍会弹出贴纸窗口。
- 桌面贴纸开关在刷新/重启后存在状态不一致，用户感觉像“脏数据”。

## 根因

### 1. 写长文档复用了贴纸开窗链路
- `createLongDocument()` 调用了 `windowSync.openNoteWindow(created)`。
- 该函数是“贴纸窗口”能力，不应在“长文档编辑入口”场景使用。

### 2. 贴纸可见状态未做统一持久化
- UI 里的 `stickiesVisible` 在主窗和工作台中都没有与偏好字段 `overlayEnabled` 完整双向绑定。
- 导致重启/刷新后状态恢复不一致。

## 修复

### A. 写长文档改为工作台内编辑
- 文件：`src/routes/workspace/+page.svelte`
- 将新建后行为从 `openNoteWindow(created)` 改为 `openInspectorEdit(created)`。
- 结果：不再触发贴纸窗口链路，符合“长文档编辑”预期。

### B. 贴纸开关接入持久化
- 文件：
  - `src/routes/+page.svelte`
  - `src/routes/workspace/+page.svelte`
  - `src/lib/workspace/preferences-service.js`
- 处理：
  1. 初始化读取 `overlayEnabled` -> `stickiesVisible`
  2. 每次切换贴纸开关后保存 `overlayEnabled`
  3. 工作台偏好服务返回 `overlayEnabled` 统一供页面恢复

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
