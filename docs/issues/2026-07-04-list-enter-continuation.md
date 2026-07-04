# 2026-07-04 列表 Enter 续写与空项退级

## Situation

类型：`设计增强`

单活跃块编辑器已经支持右下角 `+` 按钮追加同类型空白内容，但列表类内容只靠点击按钮仍然不够顺手。用户提出保留 `+` 方案，同时让普通 `Enter` 恢复更接近 Markdown 编辑器的键盘体验：

```md
1. xxx
    a. xxx
```

光标位于 `a. xxx` 行末时，第一次 `Enter` 续写为 `b. `；如果 `b. ` 仍为空，再按一次 `Enter`，退到上一层并生成 `2. `。

## Task

目标：

1. `Enter` 在列表行内优先执行行级 continuation，不再只能提交当前 block 并插入 paragraph。
2. `a. / b.` 这类字母 marker 继续按字面文本渲染在父级 ordered list item 内，但编辑态能按用户预期续写。
3. 空列表项再次 `Enter` 时退一级；顶层空列表项再次 `Enter` 时退出列表。
4. 保留现有 `+` 按钮追加方案，作为鼠标入口和非键盘 fallback。

## Action

- 新增 `src/lib/markdown/editor-enter.js`：
  - `parseEditorListMarker()` 识别 task、bullet、数字 ordered、字母 marker。
  - `applyListEnterContinuation()` 处理普通 `Enter`：
    - 非空列表行插入下一 marker。
    - 空缩进项寻找上级 marker，并生成上级下一项。
    - 顶层空项移除 marker，退出列表。
- `src/lib/components/note/BlockNoteContent.svelte`：
  - 普通 `Enter` 分支先尝试 `applyEditorListEnterContinuation()`。
  - helper 未命中时继续走既有 block split / commit 行为。
- 文档同步更新单活跃块编辑器架构说明和主 TODO Done 记录。

## Result

核心行为：

```md
1. xxx
    a. xxx|
```

按一次 `Enter`：

```md
1. xxx
    a. xxx
    b. |
```

在空 `b. ` 再按一次 `Enter`：

```md
1. xxx
    a. xxx
2. |
```

回归关注：

- `Shift+Enter` 仍保留为 textarea 原生换行。
- 命令补全弹出时，`Enter` 仍优先选择命令。
- 普通 paragraph / heading 的 `Enter` 拆块行为不应回退。
- `+` 按钮追加同类型内容仍保留。

## 验证

- Node smoke：覆盖 `a. -> b. -> 2.`、顶层空项退出列表、bullet continuation、numeric continuation、task continuation。
- `git diff --check`
- `make check`
- `make build`
