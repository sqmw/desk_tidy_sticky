# 简洁模式顶部栏响应式修复（2026-02-10）

## 问题
新增“四象限”筛选后，简洁模式默认宽度下顶部筛选栏占用过宽，右侧操作按钮（贴纸开关、全局操作）被挤压或显示不全。

## 修复
1. 顶部 `tabs-row` 拆分为两组：
   - `tabs-main`：筛选 + 排序 + 回收站操作。
   - `tabs-actions`：隐藏后、贴纸、全局操作。
2. `tabs-main` 支持横向滚动，不再挤压右侧操作区。
3. 小屏（`<=560px`）自动换两行：
   - 第一行筛选区
   - 第二行操作区（右对齐）

## 影响文件
1. `src/lib/components/panel/PanelHeader.svelte`

## 效果
1. 默认窗口宽度下右侧操作按钮持续可见。
2. 新增筛选项不会再导致“全局操作”按钮被裁切。

## 视觉修正（同日）
1. 取消小屏自动换两行策略，恢复单行工具栏（更符合简洁模式美学）。
2. 左侧筛选区继续使用横向滚动承载额外筛选项，右侧操作区固定可见。

## 2026-04-15 补充：mini 模式圆角与透明度能力下线
- 判定：`设计问题`
- 背景：
  - mini 模式窗口四角为直角，和当前工作台/贴纸的整体视觉语言不一致。
  - mini 模式顶部“透明度百分比”能力持续带来错误预期，且多轮调整后仍无法稳定满足 `10%` 与 `100%` 两端观感。
- 本轮收敛：
  - `src/routes/+page.svelte`
    - mini 容器恢复小圆角，使用 `12px`，避免过于圆润；
    - 为容器补齐轻微边框与阴影，保证圆角在浅色背景上仍有清晰边界；
    - 删除页面层的 `glassOpacity` 状态、偏好读取和 `adjustGlass` 逻辑。
  - `src/lib/components/panel/PanelHeader.svelte`
    - 删除透明度 props 透传。
  - `src/lib/components/panel/HeaderActions.svelte`
    - 删除顶部透明度按钮与滚轮调节入口。
- 结果：
  - mini 模式回到稳定的固定实底样式，不再自带背景透明/透视；
  - 顶部操作区更干净；
  - 不再保留 mini 窗口透明度这条交互链路。

## 2026-04-15 补充：mini 顶部主筛选收敛为 3 个
- 判定：`设计收敛`
- 背景：
  - mini 顶部同时放 `全部 / 待办 / 四象限 / 已归档 / 回收站`，信息密度过高；
  - `待办` 与 `全部` 在 quick panel 场景里语义接近；
  - `四象限` 更适合作为分析视图，而不是 mini 顶部常驻主导航。
- 本轮调整：
  - `src/lib/panel/panel-note-selectors.js`
    - `PANEL_NOTE_VIEW_MODES` 收敛为 `active / archived / trash`。
  - `src/lib/components/panel/PanelHeader.svelte`
    - mini 顶部 tab 改为 `活动 / 已归档 / 回收站` 三个。
  - `src/lib/strings.js`
    - 为 mini 顶部新增独立文案 `compactActive`，避免影响其他场景里原有的 `全部` 文案。
  - `src/routes/+page.svelte`
    - 增加 compact 视图模式归一化逻辑；
    - 若本地偏好仍保存旧值 `todo / quadrant`，启动后自动回落到 `active`。
- 结果：
  - mini 顶部导航更短、更稳；
  - 不会因为历史偏好残留而落入已经下线的旧视图。

## 2026-04-15 补充：mac mini 排序下拉点击失效
- 判定：`Bug/回归`
- 最短依据：
  - mini 顶部“手动/最新/最早”排序下拉在 Windows 可点击，在 mac 无反应；
  - 排序按钮位于顶部区域，容易被窗口拖拽热区抢走 `pointerdown`。
- 修复：
  - `src/lib/components/panel/PanelHeader.svelte`
    - 顶部 `tabs-row` 明确标记为 `data-tauri-drag-region="false"`。
  - `src/lib/components/panel/SortModeMenu.svelte`
    - 排序触发按钮与菜单项拦截 `pointerdown` 冒泡；
    - 菜单从顶部横向滚动容器中解耦，改为基于触发按钮位置计算的 `fixed` 弹层；
    - 避免 Win 点击后把 `tabs-main` 撑出滚动条，也避免 mac 下菜单被裁切后看起来“无反应”。
- 结果：
  - mac 下点击“手动”会正常展开排序菜单；
  - Win 下不会再因为展开菜单而在下方出现一条横向滚动条。

## 2026-04-15 补充：mini 模式 Win 窗控按钮视觉收敛
- 判定：`设计问题`
- 最短依据：
  - mini 模式 Win 右上角仍使用原始文本字符 `- / ✕` 作为最小化与关闭按钮；
  - 与当前 mini 顶部的图标按钮体系不一致，视觉上显得突兀且粗糙。
- 修复：
  - `src/lib/components/panel/HeaderActions.svelte`
    - Win 窗控改成统一的轻量图标按钮；
    - 最小化使用细横线图标，关闭使用细线叉图标；
    - 去掉额外按钮边框，只保留无框图标与轻 hover 态；
    - 关闭按钮 hover 使用更轻的浅红反馈，而不是生硬文本字符。
- 结果：
  - Win mini 顶部窗控和整套图标按钮视觉保持一致；
  - 观感更精致，也更接近原生窗控语义。
