# 找回屏幕外贴纸

## 背景

贴纸支持自由拖动和位置持久化，这让桌面使用体验更自然，但也带来了一个高频风险：

- 贴纸被拖到屏幕外
- 更换显示器或分辨率后坐标落在不可视区域
- 用户仍然能打开 workstation，却无法重新找到贴纸本体

当前项目缺少一个明确、可执行的恢复入口，用户几乎没有自救路径。

## 判定

这是一个 `Bug或回归`：

- 数据层已经持久化了位置
- 但产品层没有提供越界恢复机制
- 一旦发生，用户会直接失去对贴纸的可达性

## 方案

新增一个 workstation 设置动作：

- 位置：`设置 -> General`
- 文案：`找回贴纸`
- 行为：把所有“已钉住且仍活跃”的贴纸重新排布回主屏可视区域

恢复策略：

1. Rust 侧读取主显示器逻辑坐标与尺寸
2. 仅处理：
   - `isPinned = true`
   - 非归档
   - 非删除
3. 保留每张贴纸自己的宽高
4. 按行流式重新排布，必要时换行
5. 同步更新：
   - 持久化 `x / y`
   - 已打开贴纸窗口的实时位置

## 代码范围

- `src-tauri/src/notes/service.rs`
- `src-tauri/src/notes/commands.rs`
- `src-tauri/src/notes/mod.rs`
- `src-tauri/src/lib.rs`
- `src/routes/workspace/+page.svelte`
- `src/lib/components/workspace/WorkspaceSettingsDialog.svelte`
- `src/lib/components/workspace/settings/WorkspaceSettingsGeneralSection.svelte`
- `src/lib/strings.js`

## 结果

用户现在可以在 workstation 设置里一键找回贴纸，不需要手动改坐标，也不需要退出重开。

这个功能主要解决两类问题：

1. 贴纸被误拖到屏幕外
2. 显示器布局变化后，历史坐标已经不可见

## 回归关注点

1. 仅已钉住贴纸会被重排
2. 未钉住笔记不受影响
3. 已打开的贴纸窗口会立即回到主屏
4. 重启后位置保持恢复后的新坐标
