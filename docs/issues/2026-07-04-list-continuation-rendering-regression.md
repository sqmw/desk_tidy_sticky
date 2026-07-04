# 2026-07-04 List Continuation Rendering Regression

## Situation

用户反馈便笺中如下内容渲染层级错误：

```md
# 生物信息学
1. 中心法则 dna rna protein
a. rrna trna mrna
```

第三行 `a. rrna trna mrna` 不是新的顶层 paragraph，而是上一条有序列表项的续行；渲染时应保留字面 `a.`，并显示在同一个 `<li>` 内。

## Task

本轮修复 Markdown block parser / renderer 对 list continuation 的归属判断，并核查 active block 右下角 `+` 对 ordered list 的同类追加能力不回退。后续补充修复编辑态 `Tab` 行缩进，保证续行可以在 textarea 中直接向右缩进并保留可见空位。

## Action

- 新增 `src/lib/markdown/blocks/list-block.js`，集中处理 list marker 识别和 list item 聚合。
- `block-parser.js` 解析 bullet / ordered list 时吸收非空续行，直到遇到空行或异类 list marker。
- `block-renderer.js` 渲染 list block 时把续行并入前一个 `<li>`，续行之间用 `<br/>` 保留原始文本展示。
- 新增 `src/lib/markdown/editor-indent.js`，提供纯文本行缩进 / 反缩进 helper。
- `BlockNoteContent.svelte` 在命令补全未打开时接管 `Tab` / `Shift+Tab`：`Tab` 缩进当前行或选中多行，`Shift+Tab` 反缩进；命令补全打开时 `Tab` 仍用于选择命令。
- 用 Node smoke 验证示例会解析为 `heading + ordered_list`，且 `a. ...` 不再输出为独立 `<p>`。
- 同一 smoke 验证在该 ordered list 草稿后追加 `2. ` 后仍保持单个 ordered list block，覆盖 `+` 追加数字序号的核心数据形态。
- 用 Node smoke 验证单行缩进、多行缩进和反缩进的 selection 位置回写。

## Result

- 问题分类：`Bug或回归`。
- 根因：单活跃块 parser 只把连续数字序号行归为 `ordered_list`，没有吸收 Markdown list item 的续行。
- 回归关注：
  - `a. ...` 这类字母加点应保持字面文本，不当作新列表 marker。
  - ordered list 的 `+` 应继续基于最后一个数字 marker 追加下一条数字序号。
  - 编辑态 `Tab` 缩进不能抢走焦点；命令补全弹出时 `Tab` 仍应优先选择命令。
