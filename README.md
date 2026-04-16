# Desk Tidy Sticky

> 跨平台桌面便笺与专注工作台。mini 模式用于快速记录与桌面贴纸，workstation（工作台）模式用于任务、专注与休息节奏。

[English](README.en.md) · [参与开发](docs/contributing.md) · [加入群](#加入群) · [GitHub](https://github.com/sqmw/desk_tidy_sticky) · 喜欢的话欢迎点 Star

## 介绍视频

想先快速了解使用场景和核心功能，可以看 B 站介绍视频：

[▶ 在 B 站观看 Desk Tidy Sticky 介绍视频](https://www.bilibili.com/video/BV1Ckd8BhES1/)

## 为什么做它

很多便笺工具只解决“写下来”，很多番茄钟只解决“开始计时”。Desk Tidy Sticky 更关注日常工作里的连续动作：在 mini 模式里快速记录和钉贴纸，在 workstation（工作台）模式里整理任务、进入专注、适时休息。

它适合这些场景：

- 看论文、写代码、看视频时，把关键想法悬浮在桌面上。
- 临时记录待办，再按活动、归档、回收站持续整理。
- 把当天任务放进 workstation（工作台）模式，用番茄和休息提醒维持节奏。
- 在 macOS 和 Windows 之间保持接近一致的贴纸层级体验。

## 核心能力

### mini 模式：便笺与桌面贴纸

- 全局快捷键 `Ctrl + Shift + N` 唤醒 mini 面板。
- 支持活动、归档、回收站，带拼音搜索。
- 支持标签、优先级、拖拽排序和 Markdown 基础渲染。
- 便笺可钉在桌面，支持置顶、置底、贴到壁纸层、贴在图标上层。
- 置顶贴纸可双击进入编辑状态，日常显示时保持干净。

### workstation（工作台）模式：任务与专注

- workstation（工作台）聚合笔记、任务、专注计时和休息控制。
- 支持任务规划、番茄统计、任务开始提醒。
- 支持独立短休、长休、全屏休息遮罩和推迟策略。
- 支持主题预设、自定义 CSS、缩放、字号和侧边栏布局。

完整模式说明见：`docs/product/2026-03-29-tauri-modes-overview.md`

## 截图

### mini 模式

| mini 面板 | 桌面贴纸 | mini 列表 |
|:---:|:---:|:---:|
| ![mini 面板](.github/screenshots/hero.png) | ![桌面贴纸](.github/screenshots/desktop_mode.png) | ![mini 列表](.github/screenshots/list_page.png) |

### workstation（工作台）模式

| 笔记 | 专注 | 休息 |
|:---:|:---:|:---:|
| ![工作台笔记](.github/screenshots/workspace_notes.webp) | ![专注计时](.github/screenshots/workspace_focus.webp) | ![休息控制](.github/screenshots/workspace_break.webp) |

## 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl + Shift + N` | 唤醒或隐藏 mini 面板 |
| `Ctrl + Shift + O` | 切换贴纸鼠标交互 |
| `Ctrl + Enter` | 保存并钉到桌面 |
| `Esc` | 隐藏面板 |

## 开发

- Node.js + pnpm
- Rust stable
- Tauri 2 所需系统依赖

```bash
pnpm install
pnpm tauri dev
pnpm tauri build
```

常用检查：

```bash
pnpm check
cargo check --manifest-path src-tauri/Cargo.toml
```

Windows 开发与同步约定见：`AGENTS.md`

## 参与开发

欢迎一起把它打磨成更顺手的桌面工具。比较适合贡献的方向：

- 修复 macOS / Windows 桌面层级、贴纸交互、窗口行为差异。
- 优化 workstation（工作台）、番茄钟、休息控制和 Markdown 编辑体验。
- 补充文档、截图、复现步骤和跨平台测试记录。
- 提出更清晰的产品交互建议。

开始前建议先读：`docs/contributing.md`

## 加入群

遇到问题、想提建议、想参与开发，都可以扫码加入反馈交流群。

<img src=".github/screenshots/qq_group.png" alt="QQ 交流群" width="260">

## 支持项目

如果这个项目帮到了你，欢迎在 GitHub 点一个 Star。Star 会让更多需要桌面便笺和专注工具的人看到它，也会让我更容易判断哪些方向值得继续投入。

GitHub 仓库：<https://github.com/sqmw/desk_tidy_sticky>

## 数据迁移

从 Flutter/Dart 版本迁移时，Windows 版本会尝试扫描旧版 `notes.json`，并按 `id` 合并进当前 Tauri 数据。坏文件、旧字段或异常条目会被跳过，不影响当前笔记加载。

迁移记录：

- `docs/migration/2026-02-06-flutter-to-tauri.md`
- `docs/migration/2026-03-29-flutter-notes-auto-import-compat.md`

## 技术栈

- Tauri 2
- SvelteKit / Svelte 5
- Rust
- 本地 JSON 存储

## 开源协议

MIT License
