# 2026-02-08 Sticky 磨砂效果控制（与透明度并列）

## 目标
当桌面颜色与贴纸文字接近时，提高可读性；新增“磨砂强度”可调控件，交互与透明度一致。

## 功能设计
1. 新增 `frost` 持久化字段（0 ~ 1），用于控制磨砂强度。  
2. 透明度与磨砂都具备默认值：
   - `opacity` 默认 `1.0`
   - `frost` 默认 `0.22`
3. UI 放在透明度按钮旁边，支持：
   - 点击展开滑条
   - 鼠标悬浮图标直接滚轮微调
   - 实时百分比反馈

## 后端改动
- `src-tauri/src/notes.rs`
  - `Note` 新增 `frost: Option<f64>`
  - 新建便笺默认写入 `opacity`/`frost` 默认值
- `src-tauri/src/notes_service.rs`
  - 新增 `update_note_frost(...)`
- `src-tauri/src/lib.rs`
  - 新增命令 `update_note_frost(...)`
  - 支持 `emit_event` 参数（与透明度一致）

## 前端改动
- `src/routes/note/[id]/+page.svelte`
  - 新增磨砂状态、按钮、弹层、滚轮与保存逻辑
  - 贴纸容器增加磨砂渲染：
    - `backdrop-filter: blur(...)`
    - 覆盖层 `::before` 叠加轻度亮化，提升文字对比度

- `src/lib/strings.js`
  - 新增中英文文案：`frost`

## 验证
1. `cargo check` 通过（仅既有 warning）。  
2. `npm run check` 通过（0 errors / 0 warnings）。
