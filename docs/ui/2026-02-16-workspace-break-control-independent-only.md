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
- 任务级休息参数已在后续版本整体退役，休息控制成为唯一休息配置入口。

2. 休息节奏固定为全局独立配置
- 规则：
  - 不再读取当前任务。
  - 统一使用休息控制中的单独休息间隔（适合读书等独立场景）。
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

## 2026-03-26 补充：休息控制与番茄钟 runtime 彻底解耦

### 判定
- 类型：`设计收敛`
- 新边界：
  1. `番茄钟` 仅用于任务规划与番茄计时。
  2. `休息控制` 仅按自身配置独立定时提醒。
  3. 两者不再共享任务选择、phase 或剩余时间。

### 代码收敛
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`

1. 休息控制的节奏来源固定为：
   - `independentMiniBreakEveryMinutes`
   - `independentLongBreakEveryMinutes`
   - `miniBreakDurationSeconds`
   - `longBreakDurationMinutes`
2. 不再根据 `selectedTask` 或任何任务级配置改写休息控制节奏。
3. 休息 overlay 改为使用独立的 `breakRemainingSec`，不再复用番茄 `phase/remainingSec`。
4. 休息 overlay 的 `taskText` 固定留空，不再显示 `未选择`，也不再读取当前番茄任务名。

### 结果
1. 休息控制触发时，不会再因为当前番茄任务选择而显示无关任务名。
2. 休息控制倒计时与番茄短休/长休相位不再互相污染。
3. 后续如果要恢复“番茄任务绑定休息”的产品方向，需要新增独立能力，不应再回写到当前休息控制链路。

## 2026-03-26 补充：番茄内建休息 phase 下线

### 行为变化
1. `休息控制` 继续保留独立运行。
2. `番茄钟` 不再在完成一次专注后切入 `短休息 / 长休息` phase。
3. 因此，工作台里所有“休息提醒”都统一由 `休息控制` 提供。

### 影响
1. 休息控制成为唯一休息来源后，调试面更干净，不再需要判断“当前是番茄休息还是独立休息”。
2. 即便历史缓存仍带有旧 `shortBreak / longBreak` 字段，运行时也会在恢复时归一到 `focus`。

## 2026-03-27 补充：任务级休息参数完全退役

### 判定
- 类型：`设计收敛`

### 结果
1. `WorkspaceFocusPlanner` 新建任务表单不再出现“任务休息参数”。
2. `WorkspaceFocusPlannerTaskItem` 编辑态不再支持单任务休息参数。
3. `FocusTask` 模型不再保留 `breakProfile`。
4. `休息控制` 从 UI 到数据模型都成为唯一休息配置源。
