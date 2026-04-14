# Workspace Theme Default Template 拆分记录

日期：2026-04-14
阶段：P4 第三小步
状态：代码完成，待真实 Tauri UI 手工回归

## S：背景

`src/lib/workspace/theme/theme-default-template.js` 原本把三类内容都堆在同一个 700+ 行文件里：

- theme token 默认值顺序
- workspace selector index
- 默认模板 section builder

它本质上是“模板数据 + 模板片段构造 + 最终组装”三件事混在一起。虽然运行时风险不高，但后续只要改 selector 索引或默认样式，就必须在一个超长文件里来回跳，维护体验并不好。

## T：任务

本轮目标是做纯模板层拆分，不改 `buildWorkspaceDefaultThemeTemplate()` 的对外接口，只把常量和 section builder 下沉。验收点：

- 对外导出仍然只有 `buildWorkspaceDefaultThemeTemplate()`。
- 默认模板内容保持不变。
- `pnpm check` 和 `git diff --check` 通过。

## A：行动

- 新增 `src/lib/workspace/theme/theme-default-template-config.js`
  - 下沉 `THEME_TOKEN_ORDER`
  - 下沉 `WORKSPACE_SELECTOR_INDEX`
- 新增 `src/lib/workspace/theme/theme-default-template-sections.js`
  - 下沉 `buildThemeTokenSection()`
  - 下沉 `buildModuleDefaultSection()`
  - 下沉 `buildSelectorIndexSection()`
- 更新 `src/lib/workspace/theme/theme-default-template.js`
  - 仅保留文档头和 `buildWorkspaceDefaultThemeTemplate()` 总组装函数
  - 改为从 `sections.js` 组合模板内容

## R：结果

- `src/lib/workspace/theme/theme-default-template.js` 从约 `755` 行降到约 `24` 行。
- 结构现在分为：
  - 入口组装：`src/lib/workspace/theme/theme-default-template.js`
  - section builder：`src/lib/workspace/theme/theme-default-template-sections.js`
  - token / selector index：`src/lib/workspace/theme/theme-default-template-config.js`
- 这次拆分的收益主要体现在后续维护：
  - 调整 token 顺序时不用再翻默认样式段落。
  - 补 selector index 时不用碰模板组装入口。
  - 后续如果要再按“窗口栏 / sidebar / workbench / inspector / focus / settings”继续切 section，也有明确承接点。

验证结果：

- `pnpm check`：通过，0 errors / 0 warnings。
- `git diff --check`：通过。

风险与回归关注：

- 主题设置里的“复制完整模板”需要真实 UI 复测，确认复制内容未变化。
- 主题导入/导出链路需要真实 UI 复测，确认模板说明和 selector 索引仍完整。
