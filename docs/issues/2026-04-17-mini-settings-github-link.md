# mini 设置里的 GitHub 按钮无响应

## 判定

`Bug`

## 现象

mini 模式设置弹窗右上角的 `Star` 按钮在界面上可点击，但点击后不会打开 GitHub 仓库页面。

## 根因

该按钮此前使用的是普通超链接：

- `<a href="..." target="_blank" rel="noopener">`

在当前 Tauri mini 窗口场景里，这种写法不稳定，WebView 不一定会按浏览器语义把链接交给系统默认浏览器，因此用户侧表现为“点击没反应”。

## 修复

改为显式调用 `@tauri-apps/plugin-opener`：

- 组件从超链接改为按钮
- 点击后通过 `openUrl("https://github.com/sqmw/desk_tidy_sticky")` 打开仓库

这样行为由桌面端插件接管，不再依赖 WebView 自己处理 `target="_blank"`。

## 回归验证

已完成：

1. `pnpm check`

建议人工补充验证：

1. 打开 mini 设置弹窗
2. 点击右上角 `Star`
3. 确认系统默认浏览器成功打开 GitHub 仓库页面
