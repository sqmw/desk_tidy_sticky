# 工作台主题扩散方式迁移到 Theme 设置（2026-04-27）

## 背景

- 工作台当前支持两种主题切换扩散方式：
  - `圆形扩散`
  - `柔和扩散`
- 原入口挂在工作台顶部主题按钮的右键菜单里。
- 这个入口虽然可用，但发现路径过隐蔽，用户需要先知道“主题按钮支持右键”才能找到，不符合设置项应有的显式程度。

## 本轮目标

1. 保留两种扩散方式与原持久化逻辑。
2. 将配置入口从顶部按钮右键菜单迁移到 `workstation -> 设置 -> Theme`。
3. 让顶部主题按钮只负责主题切换，不再承担隐藏配置入口。

## 实现

### 1. 工作台顶部窗口栏收口

- 文件：
  - `src/lib/components/workspace/WorkspaceWindowBar.svelte`
- 调整：
  - 删除主题按钮的右键菜单；
  - 删除 `showThemeMenu`、菜单定位和外部点击关闭逻辑；
  - 主题按钮保留左键切换明暗主题能力。

### 2. Theme 设置区承接配置

- 文件：
  - `src/lib/components/workspace/settings/WorkspaceSettingsThemeSection.svelte`
  - `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
  - `src/routes/workspace/+page.svelte`
- 调整：
  - 在 Theme 设置区新增 `主题切换动效` 设置块；
  - 直接展示两种选项：
    - `圆形扩散`
    - `柔和扩散`
  - 复用现有 `changeThemeTransitionShape` 持久化动作，不新增新的状态来源。

### 3. 文案

- 文件：
  - `src/lib/strings.js`
- 新增：
  - `workspaceThemeTransitionStyle`
  - `workspaceThemeTransitionStyleHint`

## 验证

### 静态验证

```bash
pnpm -s check
```

### 手动回归建议

1. 打开 workstation。
2. 进入 `设置 -> Theme`。
3. 在 `圆形扩散 / 柔和扩散` 之间切换。
4. 关闭设置，点击顶部主题按钮切换明暗主题。
5. 确认：
   - 顶部主题按钮仍然正常切换主题；
   - 扩散方式按新设置生效；
   - 重新打开工作台后设置保持。

## 结果

- 主题扩散方式现在归属到工作台 Theme 设置。
- 工作台顶部主题按钮语义更单纯。
- 配置入口从隐藏交互改为显式设置项，更容易发现和理解。

## 2026-04-27 补充：修复“双选中”视觉误判

- 问题：
  - 迁移后两种动效按钮都使用了蓝色图形预览。
  - 其中 `圆形扩散` 的预览本身长得像“已选中的单选点”，导致即使真实状态只有一个值，界面看起来像两个都选中了。
- 修复：
  - 将“选中态指示”独立为单独的圆点 indicator；
  - 不再让预览图形本身承担状态语义。
  - 后续继续收口为单一状态圆点，移除每个选项内部右侧的额外预览点，避免一个容器里出现两个圆点。
- 结果：
  - 两个选项现在是明确的单选视觉，不会再产生“双选中”的误解。
