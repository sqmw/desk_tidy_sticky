# Workspace Sidebar Manual Layout Bottom Radius Clipping (2026-02-25)

## 判定
- 类型：`Bug/回归`

## 现象
- 在工作台侧栏 `manual` 分区模式下，底部主卡片（“今日任务”或“视图”）顶部圆角正常，但底部视觉接近直角。
- 体感为“上圆下方”，与整体卡片风格不一致。

## 根因
- 手动分区时，底部分区高度按比例被精确撑满 `sidebar-body`。
- `sidebar-body` 在手动模式下为 `overflow: hidden`，底部卡片圆角被容器边界裁剪。

## 修复
- 在手动模式中为底部卡片预留固定安全间距 `8px`，避免底部圆角贴边被裁剪。
- 同步调整底部内容区最大高度计算，确保滚动区域与卡片高度一致。

## 代码变更
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`
  - 新增 `MANUAL_BOTTOM_CARD_GAP = 8`
  - 新增 `manualBottomCardHeight = manualBottomBlockHeight - MANUAL_BOTTOM_CARD_GAP`
  - `manualSectionMaxHeight` 改为基于 `manualBottomCardHeight`
  - `noteFiltersBlockStyle` / `deadlineBlockStyle` 的 `--manual-block-height` 改用 `manualBottomCardHeight`
- `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceWindowBar.svelte`
  - `onclick={onMinimize}` 调整为 `onclick={() => onMinimize()}`，消除 `svelte-check` 的事件处理器类型报错，保证本次回归命令可执行。

## 回归验证
1. 打开工作台侧栏，切换到手动分区。
2. 调整分割线到不同位置，观察底部卡片四角。
3. 期望：底部圆角持续可见，不再出现“上圆下方”裁剪感。

## Follow-up: Auto Layout Still Looks Square (2026-02-25)
- 输入证据:
  - 用户反馈在自动布局下，底部大卡片仍“上圆下方”。
- 判定:
  - `Bug/回归`。
- 根因:
  - 自动布局下最后一个卡片会贴住 `sidebar-body` 底边。
  - 虽然卡片本身有圆角，但缺少底部留白时视觉上容易被误读为方角。
- 修复:
  - 仅在非手动布局下对 `sidebar-body` 的最后一个 `.sidebar-block` 增加 `margin-bottom: 8px`。
  - 同时给最后一个卡片补 `overflow: hidden`，保证内容区不覆盖圆角视觉边界。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`

## Follow-up: Manual Layout Still Looks Square (2026-02-25)
- 输入证据:
  - 用户反馈在手动布局下底部卡片仍出现“方角”。
- 判定:
  - `Bug/回归`。
- 根因:
  - 手动分区高度计算以 `sidebar-body` 高度为基准，但未扣除 `sidebar-body` 的 `gap`。
  - 结果是「上区块 + 分隔条 + 下区块 + gap」总高度超出容器，底部区块持续被裁剪，圆角被切平。
- 修复:
  - `manual` 模式下将 `sidebar-body` 的 `gap` 设为 `0`，使分区高度计算与实际布局闭合。
  - 将视觉间距转移到 `.section-height-splitter` 的 `margin`，保持原有观感。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src/lib/components/workspace/WorkspaceSidebar.svelte`
