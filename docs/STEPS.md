# Project STEPS

主 STEPS：承载正在推进的 Task 的宏观步骤序列与执行位置。任务级状态只在 [Project TODO](TODO.md) 维护，本文件只维护步骤状态。

活跃步骤块数量：**1**

步骤状态取值：`未开始` / `进行中` / `受阻` / `已完成` / `已跳过`

---

## 活跃步骤块

### <a id="steps-t-stk-p0-data-safety"></a>T-STK-P0-DATA-SAFETY · 贴纸数据安全 P0 修复 · 定义版本 v1

- 回链 TODO 条目：[T-STK-P0-DATA-SAFETY](TODO.md#todo-t-stk-p0-data-safety)
- 块所有者：Claude Code 会话 `97c43058`
- 写入模式：`single-writer`
- 执行授权：`implicit` — 来源：用户 2026-08-10 指令“开始修复”，紧接在上一轮“P0 四条要不要本轮落地”的提问之后；范围：扫描文档 P0 批次 A1/A2/A3/A4 加同函数的 A5/C1。四项均为可逆代码修复，不触及冻结基线与架构取舍，故不升级为 `explicit`。
- 最近更新：2026-08-10

**目的意图**：把 `docs/issues/2026-08-10-sticky-full-scan.md` 判定为 P0 的四条数据安全缺陷从"有台账"推进到"已修复且有自动化回归"，消除贴纸尺寸单调膨胀、隐藏贴纸丢失可见锚点、隐藏态切层级后贴纸永久失踪、块编辑器静默丢内容这四类用户不可逆损失。顺带并入 A5、C1 两条与 P0 同文件同函数、独立提交反而增加噪音的修复。明确不含 B1 混合 DPI 坐标空间口径、B2 macOS 窗口生命周期取舍、F4 devtools 发布策略，这三条需要先与用户定方向。

**宏观步骤**

| # | 步骤 | 状态 | 完成判据 | 实测结果 |
| --- | --- | --- | --- | --- |
| 1 | A2 + A3：后端隐藏态守卫与坐标回收 | 已完成 | `hide_note_to_edge_unlocked` 对 hidden 幂等；`clear_auto_hide_runtime` 在 hidden 时回收 `x/y`；三条仍保留活窗口的命令先唤回再改层级；新增 Rust 测试覆盖幂等与坐标回收 | 新增 `is_already_hidden` 守卫与 `reveal_hidden_note_before_state_change`；Rust 测试 19 → 24 全绿 |
| 2 | A1：控制态预留量归口前端 | 已完成 | 新增预留量运行态与上报命令；`persist_note_window_size` 扣除预留后再写盘；前端在扩窗/收窗两处上报；新增 Rust 测试覆盖扣减与缺省回落 | 新增 `StickyWindowReserveState` + `set_note_window_reserve` + `note_body_extent`；前端改为单一 `getAppliedControlsReserve()` 算式并由 `$effect` 上报；Rust 测试 24 → 31 全绿。已知残留：收起动画期间约 1ms 的上报/缩窗非原子窗口，记入扫描文档第 8 节 |
| 3 | A4 + A5 + C1：块编辑器写入路径 | 已完成 | 分块/追加/合并三处检查保存返回值并回滚草稿；`activeBlockInitialDraft` 三处补清；图片粘贴改走 `setEditorDraft`；新增前端测试覆盖保存失败回滚 | 抽出 `block-structural-commit.js` 纯函数（`block-note-editor-controller.js` 依赖 `$lib` 别名，`node --test` 无法加载，故另立模块）；前端测试 15 → 18 全绿 |
| 4 | 自动化验证与文档回写 | 已完成 | `make check`、Rust 测试、前端测试、`git diff --check` 全绿；扫描文档六条标记状态 | svelte-check 0 error / 0 warning；`cargo check` 无警告；31 项 Rust + 18 项前端测试通过；扫描文档新增第 8 节修复记录 |
| 5 | 实机冒烟验收 | 未开始 | 扫描文档第 8 节列出的 5 项冒烟全部通过；通过后 TODO 条目转 `done` 并按归档规则移出本块 | — |

**步骤变更记录**

- 2026-08-10 建块，绑定定义版本 v1。
- 2026-08-10 步骤 1-4 完成。追加步骤 5：自动化门禁不覆盖窗口几何、层级切换与存储恢复态这三类真实运行行为，任务在实机冒烟前不转 `done`。定义版本不变（未改变任务边界与完成定义，只把原本隐含的验收拆成显式步骤）。

---

## 挂起步骤块

无。

## 关闭步骤块

已关闭步骤块归档至 `docs/archive/steps-closed.md`（首次归档时创建）。
