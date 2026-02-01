# Desk Tidy Sticky

> 📝 **Windows 极简便签助手** — 随手记录，灵感不丢失

**🇨🇳 中文** | **[🇬🇧 English](README_EN.md)**

<!-- 主界面截图：请将截图放入 .github/screenshots/hero.png -->
![主界面预览](.github/screenshots/hero.png)

---

## ✨ 亮点特性

<table>
<tr>
<td width="50%">

### ⚡ 极速唤醒
- **全局快捷键** `Ctrl + Shift + N`
- 系统托盘一键呼出
- 极速启动，即刻记录
- 自动保存，无需担心数据丢失

</td>
<td width="50%">

### 📌 桌面贴纸
- **图钉模式**：重要事项钉在桌面
- 嵌入桌面底层，不遮挡工作窗口
- 自由拖拽布局
- 支持双击直接编辑

</td>
</tr>
<tr>
<td>

### 🎨 简约设计
- 甚至比系统自带便签更轻快
- 纯净无打扰的输入体验
- 深色/浅色主题适配
- 磨砂质感 UI

</td>
<td>

### 🔍 闪电搜索
- **拼音首字母**快速检索
- 历史笔记一触即达
- 归档管理，井井有条
- 支持标签分类（开发中）

</td>
</tr>
</table>

---

## 🖼️ 界面预览

<!-- 功能截图：请将截图放入 .github/screenshots/ 文件夹 -->
| 快速记录 | 桌面贴纸 | 归档管理 |
|:---:|:---:|:---:|
| ![记录页](.github/screenshots/note_page.png) | ![桌面模式](.github/screenshots/desktop_mode.png) | ![列表页](.github/screenshots/list_page.png) |

---

## 🚀 核心功能

### 📝 快速记录与归档
- 随时随地捕捉灵感
- 快捷键保存：`Ctrl + Enter` 直接保存并挂起
- 右滑归档，保持列表清爽

<!-- 演示：请将 GIF 放入 .github/screenshots/demo.gif -->
![快速演示](.github/screenshots/demo.gif)

### 📌 桌面贴纸模式
告别满屏幕凌乱的便签窗口，随心所欲管理层级：

| 模式 | 场景 | 说明 |
|-----|------|------|
| **⬇️ 沉浸底层** | **作为壁纸的一部分** | 嵌入桌面图标层下，按 `Win + D` 显示桌面时它依然在，不遮挡任何工作窗口 |
| **⬆️ 强力置顶** | **重要事项时刻提醒** | 始终悬浮在所有窗口之上，通过 `Ctrl + Enter` 一键固定，确保不错过紧急待办 |
| **↔️ 自由布局** | **随手拖拽** | 随意拖拽到屏幕角落，自动记忆位置，像真实便利贴一样方便 |
| **🖱️ 穿透模式** | **互不干扰** | 支持鼠标穿透，点击便签下方图标，完全融入桌面 |

### 🗂️ 搜索与管理
- 强大的本地检索引擎
- 毫秒级响应
- 支持按时间、内容、状态筛选

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl + Shift + N` | 唤醒/隐藏主面板 |
| `Ctrl + Enter` | 保存并固定到桌面 |
| `Esc` | 隐藏面板（不保存） |
| `Enter` | 保存笔记（视设置而定） |

---

## 📦 安装

### 方式一：下载安装包（推荐）

| 项目 | 大小 |
|-----|------|
| 安装包 | **10.2 MB** |

从 [Releases](https://github.com/sqmw/desk_tidy_sticky/releases) 下载最新版安装包。

### 方式二：从源码构建

```bash
# 克隆项目
git clone https://github.com/sqmw/desk_tidy_sticky.git
cd desk_tidy_sticky

# 安装依赖
flutter pub get

# 运行
flutter run -d windows --release
```

---

## 🔧 技术栈

- **框架**: Flutter (Windows Desktop)
- **多窗口**: desktop_multi_window
- **嵌入技术**: Win32 WorkerW 注入
- **数据存储**: 本地 JSON / Shared Preferences

---

## 📄 开源协议

MIT License

---

<p align="center">
  <b>⭐ 如果觉得有用，请给个 Star 支持一下！</b>
</p>
