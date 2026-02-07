# 2026-02-07 架构整理（Phase 2）

## 目标
在 Phase 1 的 UI 组件拆分基础上，继续拆分 `src/routes/+page.svelte` 内的业务编排逻辑，减少页面脚本承担的职责。

## 新增模块

### 1. 便签命令编排
- 文件：`src/lib/panel/use-note-commands.js`
- 负责：
  - `loadNotes`
  - `saveNote`
  - `togglePin/toggleZOrder/toggleDone/toggleArchive`
  - `deleteNote/restoreNote/emptyTrash`
  - `persistReorderedVisible`
- 价值：统一了 invoke 调用入口，主页面不再直接持有大量命令函数。

### 2. 拖拽重排流程
- 文件：`src/lib/panel/use-drag-reorder.js`
- 负责：
  - 拖拽起点/移动/落点计算
  - 自动滚动与排序预览
  - 结束落盘触发
  - 对 `svelte:window` 的 pointer 结束事件处理
- 价值：把复杂的拖拽状态机从页面剥离，页面只绑定回调。

### 3. 置顶窗口同步
- 文件：`src/lib/panel/use-window-sync.js`
- 负责：
  - 打开/关闭单个便签窗口
  - 同步所有 note-* 子窗口生命周期
- 价值：窗口管理逻辑独立，便于后续扩展窗口策略。

## 主页面变化
- 文件：`src/routes/+page.svelte`
- 行数变化：`734 -> 442`
- 当前职责：
  - 状态定义与派生值
  - 模块装配（Dependency Injection）
  - 生命周期与事件监听
  - 视图组件拼装

## 原则映射
- SRP：命令、拖拽、窗口同步各自独立。
- OCP：新增命令或拖拽规则时，优先扩展对应模块。
- DIP：页面通过依赖注入使用模块，降低直接耦合。

## 验证
- `npm run build`：通过
- `cargo check`：通过（仅历史 warning）

## 后续建议（Phase 3）
- `PanelHeader.svelte` 仍偏大（547行），可继续拆：
  - `HeaderActions.svelte`
  - `SortModeMenu.svelte`
  - `SearchBar.svelte`
- 这样能进一步减少单文件复杂度，并提升复用粒度。
