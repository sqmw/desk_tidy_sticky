# 2026-02-16 休息控制改为纯独立模式

## 背景
- 反馈：休息控制面板里仍出现“绑定任务”入口，和预期不一致。
- 预期：休息控制用于独立休息管理，不应再承担任务绑定语义。

## 调整内容
1. UI 语义收敛为独立模式
- 文件：`src/lib/components/workspace/focus/WorkspaceBreakControlBar.svelte`
- 移除会话作用域切换（独立/绑定任务）及相关提示。
- 将“30m/1h/2h/Today”改为关闭时长预设（先选模式，不立即生效）。
- 新增显式按钮：
  - `关闭`：按当前预设关闭休息提醒。
  - `开启`：恢复休息提醒。
- 移除“独立间隔/跟随任务”分类切换，休息控制仅保留“单独休息间隔”设置。
- 任务休息参数不在该面板切换，只在任务新增/编辑处维护。

2. 休息节奏自动判定（无分类选择）
- 文件：`src/lib/workspace/focus/focus-break-profile.js`
- 规则：
  - 有选中任务：使用任务参数；任务未自定义时回退任务默认间隔。
  - 无选中任务：使用休息控制中的单独休息间隔（适合读书等独立场景）。
- 同时移除 `breakScheduleMode` 相关代码路径（前端配置与持久化不再依赖该字段）。

3. 会话模型兼容降级
- 文件：`src/lib/workspace/focus/focus-break-session.js`
- `normalizeBreakSession`：历史 `scope=task` 数据读取后统一归一化为 `global`。
- `createBreakSession`：新会话固定创建为独立（global）。
- `shouldSuppressBreakPromptBySession`：激活会话时统一抑制休息弹窗（独立暂停语义）。

4. Hub 传参与控制器清理
- 文件：`src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 移除休息控制条任务绑定传参与节奏来源切换回调。
- 移除 `breakScheduleMode` 在保存配置链路中的写入。
- 文件：`src/lib/workspace/preferences-service.js`、`src/lib/workspace/controllers/workspace-focus-actions.js`、`src/routes/workspace/+page.svelte`
- 移除 `breakScheduleMode` 默认值/归一化/持久化写入链路。

## 结果
- 休息控制面板不再出现“绑定任务”相关入口。
- 休息控制面板不再出现“独立间隔/跟随任务”二选一分类。
- 休息控制具备明确开关语义，不再是“点预设即触发”的隐式行为。
- 历史数据不需要手动迁移，旧 task-scope 会话自动兼容为独立会话。

## 验证
- `npm run check`：通过（0 errors / 0 warnings）。
