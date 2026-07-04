# 2026-07-04 列表边界与便笺滚动位置回归

## Situation

类型：`Bug或回归`

用户反馈便笺中 `## 数据库` 没有按标题渲染，并且标题后的序号也被并进上一组有序列表；同时在中间位置编辑并按 `Enter` 后，便笺滚动位置会回到顶部。

## Task

目标：

1. list continuation 只能吸收真正的续行，不能跨越 Markdown 块级起始行。
2. `## 数据库` 这类 heading 应从前一个 ordered list 中断开，后续 ordered list 重新按自身 marker 渲染。
3. active block 编辑回写文本时，便笺滚动容器保持原 scroll position，不因局部输入跳回顶部。

## Action

- `src/lib/markdown/blocks/list-block.js`
  - 新增块级边界判断：task、heading、blockquote、code fence、image、hr、table header 都会终止当前 list block。
  - 保留缩进空白行作为 list continuation，继续支持连续 `Shift+Enter` 的同项硬换行。
- `src/lib/markdown/blocks/block-parser.js`
  - list block 扫描时传入下一行，用于识别 table header 边界。
- `src/routes/note/[id]/+page.svelte`
  - 给 `.note-block-surface` 增加 DOM 引用。
  - `updateTextFromPreview()` 在 text 回写和保存前后恢复 `scrollTop / scrollLeft`，避免 `Enter` 后跳回顶部。

## Result

预期：

```md
6. 抽象理解
## 数据库
1. 核酸数据库
2. 蛋白质数据库
```

会解析为：

1. 一个 ordered list block。
2. 一个 heading block。
3. 一个新的 ordered list block。

回归关注：

- `1. xxx` 后紧跟 `a. xxx` 仍应作为 list continuation，不拆成 heading / paragraph。
- 缩进空白 continuation 行仍应留在当前 list item 内。
- 在便笺中部按 `Enter`、`Shift+Enter` 或触发 task 回写时不应滚回顶部。

## 验证

- Node smoke：覆盖编辑态 `Enter` / `Shift+Enter` helper 的核心行为。
- `git diff --check`
- `make check`
- `make build`
