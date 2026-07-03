# 2026-07-03 Workstation 卡片桌面层级按钮回归

## Situation

类型：Bug/回归。

用户反馈 workstation 笔记卡片底部动作栏缺少“钉到桌面 / 置顶 / 置底 / 壁纸层 / 桌面层”等入口。底层命令和状态仍存在，问题集中在工作台卡片 UI 渲染条件和四象限卡片动作栏漏接。

影响范围：

- 普通网格卡片在 `todo` 等未归档笔记视图下没有显示桌面层级按钮。
- 四象限卡片完全没有接入 `togglePin`、`toggleZOrder`、`toggleWallpaperLayer` 和 `toggleArchive`。
- 简洁模式列表项和便笺窗口工具栏不在本次回归范围内。

## Task

本轮目标是恢复原有功能入口，不新增桌面层级语义，不改变 Rust/Tauri 命令契约：

1. 未归档、未删除的 workstation 笔记卡片应能钉到桌面。
2. 已钉住卡片应继续显示置顶/置底按钮。
3. 非置顶卡片应继续显示壁纸层/桌面层切换。
4. 四象限卡片应与普通网格卡片保持动作能力一致。

## Action

- `WorkbenchNoteGrid.svelte`
  - 桌面层级按钮显示条件从 `viewMode === "active"` 改为 `!note.isArchived && !note.isDeleted`。
  - 保证 `active`、`todo` 和标签过滤后的未归档笔记都能看到钉住入口。
- `WorkbenchSection.svelte`
  - 给 `WorkbenchQuadrantBoard` 传入 `toggleArchive`、`togglePin`、`toggleZOrder`、`toggleWallpaperLayer`。
- `WorkbenchQuadrantBoard.svelte`
  - 四象限卡片动作栏补回钉住、置顶/置底、壁纸/桌面层和归档按钮。
  - 补齐对应图标和 active 态样式。

## Result

验证入口：

1. workstation 普通网格 `active` 视图：动作栏应显示编辑、完成、标签、钉住、归档、删除。
2. workstation 普通网格 `todo` 视图：动作栏同样应显示钉住入口。
3. 已钉住普通卡片：应显示置顶/置底按钮；非置顶时显示壁纸层/桌面层按钮。
4. workstation 四象限视图：四象限卡片应恢复同一组桌面层级入口。

回归关注：

- 归档和回收站视图不显示桌面层级按钮。
- 这次只恢复 UI 入口，不改变 `toggle_pin`、`toggle_z_order_and_apply`、`toggle_wallpaper_layer_and_apply` 的行为。
