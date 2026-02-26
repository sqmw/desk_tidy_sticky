# 2026-02-26 专注倒计时 Tab 切换重置（Windows）修复

## 判定
- 类型：`Bug/回归`
- 现象：在工作台中切换“笔记/专注”后返回，专注倒计时可能回到初始值。
- 期望：切 tab 不应重置已开始的专注计时。

## 根因
- 计时运行态仅保存在 `WorkspaceFocusHub` 组件内存中。
- 在部分运行路径下组件可能被重建，导致 `running/hasStarted/remainingSec` 等状态回到默认值。

## 修复方案
- 新增运行态缓存模块：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
- 采用持久缓存保存专注计时关键状态（`localStorage`，并兼容一次性迁移旧 `sessionStorage` 数据）：
  - `phase`
  - `remainingSec`
  - `running`
  - `hasStarted`
  - `completedFocusCount`
  - `focusSinceBreakSec`
  - `nextMiniBreakAtSec/nextLongBreakAtSec`
  - `nextMiniWarnAtSec/nextLongWarnAtSec`
  - `lastBreakReminderAtSec`
  - `activeBreakKind`
  - `skipUnlockedAfterPostpone`
- 在 `WorkspaceFocusHub` mount 时恢复缓存；状态变化时持续写入缓存。
- 当计时未开始且未运行时清理缓存，避免污染后续会话。
- 缓存有效期为 12 小时，避免长期离线后恢复过期倒计时。

## 回归验证
1. 进入“专注”并点击开始，等待倒计时明显变化（例如 25:00 -> 24:50）。
2. 切换到“笔记”tab，再切回“专注”。
3. 倒计时应保持连续，不回到初始值。
4. 在 Windows 下重复上述步骤 3~5 次，结果应一致。
5. 关闭窗口仅保留菜单栏图标后退出并重启应用，计时应恢复到退出前进度，不应重置为初始值。

## 影响文件
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/workspace/focus/focus-timer-runtime-cache.js`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceFocusHub.svelte`
