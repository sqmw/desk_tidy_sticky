# 参与开发

Desk Tidy Sticky 欢迎问题反馈、交互建议、文档补充和代码贡献。这个项目横跨 Tauri、Svelte、Rust、macOS 和 Windows 桌面窗口能力，因此清晰的复现信息和小步提交会非常有帮助。

## 适合贡献的方向

- 桌面贴纸：层级、透明、磨砂、拖动、鼠标交互、跨平台一致性。
- workstation（工作台）：笔记视图、标签、搜索、长文档、主题和布局。
- 专注模块：番茄任务、休息控制、提醒策略、统计展示。
- 工程质量：模块拆分、文档整理、测试记录、构建流程。
- 体验反馈：更自然的按钮文案、更少干扰的默认行为、更清晰的设置入口。

## 本地开发

```bash
pnpm install
pnpm tauri dev
```

提交前建议至少跑：

```bash
pnpm check
cargo check --manifest-path src-tauri/Cargo.toml
```

Windows 相关能力建议在 Windows 环境实际回归，尤其是 WorkerW、壁纸层、图标上层、置顶、置底、透明和磨砂效果。

## 提交建议

- 一个提交只解决一个清晰问题，避免把重构、UI 调整和平台修复混在一起。
- 修复 bug 时写清楚复现路径、期望行为和实际行为。
- 涉及用户可见行为变化时，同步更新 README 或 `docs/` 下的专题文档。
- 涉及桌面层级、窗口可见性、全屏行为时，尽量说明验证平台和系统版本。

## 反馈与交流

- GitHub Issues：<https://github.com/sqmw/desk_tidy_sticky/issues>
- QQ 反馈群二维码：`../.github/screenshots/qq_group.png`

如果你只是想提一个想法，也完全可以。很多好改动都来自一句“这里感觉不顺手”。
