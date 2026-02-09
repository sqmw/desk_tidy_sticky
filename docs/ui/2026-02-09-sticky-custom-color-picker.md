# 2026-02-09 Sticky 调色板支持自定义取色

## 背景
原有背景色与文字色仅支持固定预设色点，不支持用户选择任意颜色，灵活性不足。

## 目标
1. 背景色面板支持任意颜色选择。
2. 文字色面板支持任意颜色选择。
3. 与现有预设色点共存，不破坏原交互。

## 实现
### 1) 调色板新增取色器
- 文件：`src/routes/note/[id]/+page.svelte`
- 在 `.color-popover` 和 `.text-color-popover` 中新增：
  - `input[type="color"]`
  - 自定义标签文案（`customColor`）

### 2) 状态与兼容
- 新增 `toColorPickerHex(value, fallback)`：
  - 兼容 `#rgb` 转 `#rrggbb`
  - 非法值自动回退到默认色，保证取色器可用
- 新增：
  - `backgroundPickerValue`
  - `textPickerValue`

### 3) 保存策略
- `setBackgroundColor` / `setTextColor` 新增参数 `closePopover`。
- 预设色点仍然“点击即保存并关闭”。
- 自定义取色器“选择即保存但不自动关闭”，便于连续试色。

### 4) 文案
- 文件：`src/lib/strings.js`
- 新增：
  - `customColor`（`en`: `Custom`, `zh`: `自定义`）

## 用户体验收益
1. 可直接选择任意颜色，不再受限于固定色板。
2. 保留快速预设色点，兼顾效率与自由度。
3. 取色器不强制关闭，连续调色更顺畅。
