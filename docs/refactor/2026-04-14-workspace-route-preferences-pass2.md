# Workspace Route Preferences Bridge 拆分记录

日期：2026-04-14
阶段：P3 第二小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`src/routes/workspace/+page.svelte` 除了模板装配外，还直接承担 workspace preferences 的读取、归一化和保存逻辑。`loadPrefs/savePrefs` 会跨越 note view、theme、zoom、focus、startup 等多组状态，导致 route 入口同时扮演页面装配层和 preferences bridge。

## T：任务

本轮目标是把 route 级 preferences bridge 下沉到 controller，保留 route 本地 state 的最终写入权，但不再在入口文件里展开读取/保存细节。验收点：

- workspace preferences 读取后各状态仍能按原逻辑落地。
- `savePrefs` 的调用点不需要改动行为。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/controllers/workspace-route-preferences.js`
  - 封装 `loadPrefs`。
  - 封装 `savePrefs`。
  - 在 bridge 内完成 custom css、sidebar manual split ratio、theme preset 的归一化。
- 更新 `src/routes/workspace/+page.svelte`
  - 增加 `setWorkspaceRouteState(patch)` 作为 route 本地状态写回边界。
  - 用 `createWorkspaceRoutePreferences` 替代 route 内联的 `loadPrefs/savePrefs`。
  - 保留 `normalizeWorkspaceViewMode` / `normalizeWorkspaceInitialViewMode` 在 route 层完成，以确保入口文件仍明确掌握 tab/view 模式边界。

## R：结果

- `src/routes/workspace/+page.svelte` 从约 1324 行降到约 1318 行。
- route 入口现在更接近“state patch + controller 装配”的角色，preferences bridge 已从页面入口中独立出来。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- workspace 启动时 theme / zoom / focus 数据恢复需要真实 UI 复测。
- settings dialog 修改后触发的 `savePrefs` 路径需要真实 UI 复测。
- 首次打开 workspace 时的 initial view mode / main tab 恢复需要真实 UI 复测。
