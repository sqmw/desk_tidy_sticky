# 工作台 tab 切换导致专注计时重置（2026-02-26）

## 判定
- 类型：`Bug/回归`

## 现象
- 在工作台中从“专注”切到“笔记”再切回“专注”，计时会重新开始。
- 该问题在 macOS / Windows 均可出现。

## 根因
- `WorkspaceFocusHub` 只在 `mainTab === focus` 时渲染。
- 切换到“笔记”时组件被卸载；再切回时重新挂载，本地计时状态（`running`、`remainingSec` 等）被重置。

## 修复
- 文件：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/routes/workspace/+page.svelte`
- 保持 `WorkspaceFocusHub` 常驻挂载，仅通过样式隐藏：
  - `mainTab === notes` 时隐藏 `.focus-pane`（`display: none`）；
  - 切回“专注”时复用同一实例，不触发重新初始化。

## 回归验证
1. 在“专注”tab 开始计时（观察秒数递减）。
2. 切换到“笔记”tab，等待 3-5 秒。
3. 切回“专注”tab：
  - 计时应连续（不会回到初始配置时间）；
  - 相位/轮次保持不变。
