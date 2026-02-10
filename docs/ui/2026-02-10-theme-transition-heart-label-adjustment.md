# 主题切换命名修正：爱心扩散 -> 柔和扩散

## 背景
- 第二种主题切换动画当前视觉并非清晰的“爱心轮廓扩散”。
- 使用“爱心扩散”会让用户预期与实际效果不一致。

## 调整
- 更新文案键：`themeTransitionHeart`
  - zh: `爱心扩散` -> `柔和扩散`
  - en: `Heart wipe` -> `Soft bloom`

## 影响文件
- `src/lib/strings.js`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`
