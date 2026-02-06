# Desk Tidy Sticky

> 📝 **Windows 极简便签助手** — 随手记录，灵感不丢失

**🇨🇳 中文** | **🇬🇧 English**

## ✨ 功能特性

- **极速唤醒**：全局快捷键 `Ctrl + Shift + N`，系统托盘一键呼出
- **简约设计**：磨砂质感 UI，滚轮调节透明度
- **笔记管理**：活动/归档/回收站视图，支持拼音搜索
- **滑动操作**：左滑删除，右滑归档/恢复（与 Flutter 版一致）
- **拖拽排序**：手动排序模式下可拖动笔记调整顺序
- **置顶/置底**：已钉住便笺可切换置顶或贴在底部
- **开机自启**：设置中可开启开机自动启动
- **启动时显示**：可选择启动时是否显示主窗口
- **单实例**：重复启动会激活已有窗口
- **快捷操作**：`Ctrl + Enter` 保存并置顶，`Esc` 隐藏面板

## ⌨️ 快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl + Shift + N` | 唤醒/隐藏主面板 |
| `Ctrl + Shift + O` | 贴纸：切换鼠标交互（穿透/可点） |
| `Ctrl + Enter` | 保存并固定到桌面 |
| `Esc` | 隐藏面板（不保存） |

## 🖼️ 截图

| 主界面 | 贴纸 | 列表 |
|:---:|:---:|:---:|
| ![hero](.github/screenshots/hero.png) | ![desktop](.github/screenshots/desktop_mode.png) | ![list](.github/screenshots/list_page.png) |

## 🔧 技术栈

- **框架**: Tauri 2 + SvelteKit
- **后端**: Rust
- **数据存储**: 本地 JSON

## 📦 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 构建
pnpm tauri build
```

## 📂 数据迁移

从 Flutter/Dart 版本迁移：数据存储在 `%APPDATA%\..\desk_tidy_sticky\notes.json`（Dart 版本）或 `%APPDATA%\com\desk_tidy\desk_tidy_sticky\notes.json`（本版本）。可手动复制 `notes.json` 到新路径。

## 🧭 迁移记录

- `docs/migration/2026-02-06-flutter-to-tauri.md`

## 📄 开源协议

MIT License
