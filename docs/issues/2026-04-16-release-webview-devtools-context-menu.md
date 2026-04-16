# 发布版 WebView 调试菜单保留

## 判定

- 类型：设计行为调整。
- 背景：Tauri / Wry 的 WebView 调试入口在 debug 构建默认可用，但 release 构建需要编译 `devtools` feature，并对窗口启用 `devtools`。
- 目标：正式包中保留右键浏览器调试菜单，便于用户反馈异常时直接 Inspect 页面、查看控制台和定位样式问题。

## 实现约定

- `src-tauri/Cargo.toml` 的 `tauri` 依赖必须保留 `devtools` feature。
- `src-tauri/tauri.conf.json` 的主窗口必须设置 `devtools: true`。
- 运行时创建的窗口也必须显式启用 `devtools: true`：
  - 工作台窗口
  - 便笺窗口
  - 休息遮罩窗口

## 影响与风险

- 收益：release 包出现 UI、样式或运行时异常时，可以通过右键菜单快速打开调试入口，降低远程排障成本。
- 风险：正式用户也能看到 Inspect / DevTools 入口；当前阶段为了可调试性接受该取舍。
- 后续如果需要面向更稳定的大众发布，可再改成独立的 debug-release 构建开关，而不是删除窗口级配置。

## 回归检查

1. debug 模式右键仍可看到浏览器调试菜单。
2. release 构建后主窗口、工作台窗口、便笺窗口右键可看到浏览器调试菜单。
3. 便笺窗口的置顶、置底、透明背景和拖动行为不应因开启 devtools 改变。
