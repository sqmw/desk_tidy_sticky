# 2026-07-05 引用块渲染视觉缺失

## Situation

类型：`Bug或回归`

用户反馈便笺中 `> 其实就是折叠成为某个形状对应的某个功能` 没有呈现为可辨识的引用块，看起来仍像普通正文。

## Task

目标：

1. `>` 引用块在单活跃块渲染路径中具备明确视觉形态。
2. parser / renderer 支持 Markdown 合法的 0-3 个前导空格再跟 `>`。
3. 不影响 list continuation 的边界判断：`>` 仍应切断前一个 list block。

## Action

- `src/lib/markdown/blocks/block-parser.js`
  - blockquote 识别从 `^>\s+` 扩展为 `^ {0,3}>\s+`。
- `src/lib/markdown/blocks/block-renderer.js`
  - 渲染时剥离 0-3 个前导空格和 `>` marker。
  - 连续 `>` 行合并为同一个 `<blockquote>`，避免每行各自生成独立引用块。
- `src/lib/components/note/BlockNoteContent.svelte`
  - 单活跃块渲染路径中的 `blockquote` 使用正文流里的细左线样式。
- `src/lib/components/note/NotePreview.svelte`
  - 全文预览路径使用同一套低调引用样式。

视觉取舍：

- 不使用卡片背景、圆角和浏览器默认左右大 margin，避免在便笺内显得突兀。

## Result

预期：

```md
> 其实就是折叠成为某个形状对应的某个功能
```

渲染后应显示为独立引用块，而不是普通缩进正文。

回归关注：

- `1. ...` 后紧跟 `> ...` 不应继续并入上一条 ordered list。
- `   > ...` 也应识别为引用块。
- 原有 heading / ordered list 渲染不回退。
