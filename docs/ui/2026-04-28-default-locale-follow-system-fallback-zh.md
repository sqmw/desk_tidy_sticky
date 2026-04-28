# 2026-04-28 默认语言改为跟随系统，回退中文

## 背景

- 之前项目默认语言写死为英文：
  - `src/lib/workspace/preferences-service.js`
  - `src/routes/+page.svelte`
  - `src/routes/workspace/+page.svelte`
  - `src/routes/note/[id]/+page.svelte`
- 这会让中文系统上的首次启动体验不自然，并且在偏好尚未加载完成时出现英文初始文案。

## 目标

- 首次启动时优先跟随系统语言
- 当前仅支持：
  - `zh`
  - `en`
- 当系统语言不是中英文，默认回退到中文
- 一旦用户手动切换过语言，继续以保存的偏好为准

## 方案

### 1. 增加统一 locale 解析入口

- 新增：
  - `src/lib/i18n/locale.js`

提供三层能力：

- `normalizeStoredLocale(locale)`
  - 只接受 `en / zh`
- `detectSystemLocale()`
  - 优先读 `navigator.languages`
  - 再回退 `navigator.language`
  - 识别不到时回退中文
- `resolveAppLocale(storedLocale)`
  - 有合法偏好时返回偏好
  - 否则跟随系统语言

### 2. 同步修正同步默认值

以下页面入口不再以 `"en"` 作为初始状态：

- `src/routes/+page.svelte`
- `src/routes/workspace/+page.svelte`
- `src/routes/note/[id]/+page.svelte`

这样可以避免首次渲染先闪英文、再切到中文。

### 3. 同步修正偏好回退值

- `src/lib/workspace/preferences-service.js`
- 当 `prefs.language` 为空时，不再直接回退英文
- 改为统一走 `resolveAppLocale(...)`

## 当前行为

- 用户未设置语言偏好时：
  - 中文系统：默认中文
  - 英文系统：默认英文
  - 其他系统语言：默认中文
- 用户已手动设置语言后：
  - 始终以用户偏好为准

## 验证建议

1. 清空或删除已有语言偏好
2. 在中文系统启动：
   - 应直接以中文显示，不应先闪英文
3. 在英文系统启动：
   - 应直接以英文显示
4. 手动切换语言后重启：
   - 应保持用户上次选择
