# 2026-07-05 Heading Enter 续接与边界光标导航

## Situation

类型：`Bug或回归`

用户反馈：

1. `### 蛋白质序列` 后点击 active block 右下角 `+` 可以正常创建下一行同级 heading marker，但普通 `Enter` 不能。
2. 光标位于 `###` 最左侧时，继续使用键盘无法移动到上一块。

根因：

- `+` 入口通过 `getSameBlockInsert()` 单独复制 heading marker。
- 普通 `Enter` 走 `getDraftSplitAtCursor()`，只按光标拆分 Markdown 文本，没有为 heading 下一块补同级 `#` marker。
- active block textarea 之前没有跨 block 的方向键导航；在 textarea 起点继续按左 / 上方向键时，原生光标已经没有更早位置可移动。

## Task

目标：

1. heading block 内普通 `Enter` 与 `+` 保持同级 heading continuation 语义。
2. 新 heading block 的光标落在 marker 后面，方便继续输入标题。
3. 方向键只在 textarea 原生移动到块边界时接管跨 block 导航，避免影响行内编辑。

## Action

- `src/lib/components/note/BlockNoteContent.svelte`
  - `getEnterSplit()` 为 `heading` 增加专门拆分逻辑：下一块自动补同级 `#` marker。
  - pending 打开下一块时支持显式 `caretOffset`，heading continuation 的光标落在 `### ` 后。
  - 增加 `getNextEditableBlock()` 和边界方向键导航：
    - `ArrowLeft` / `ArrowUp` 在块首进入上一可编辑块末尾。
    - `ArrowRight` / `ArrowDown` 在块尾进入下一可编辑块开头。
  - pending start line 找不到目标块时清理 pending 状态，避免残留。

## Result

预期行为：

```md
### 蛋白质序列
```

光标在行尾按 `Enter` 后：

```md
### 蛋白质序列
### 
```

且新光标位于第二行 `### ` 之后。

边界导航：

- 光标在 `###` 最左侧时，`ArrowLeft` / `ArrowUp` 进入上一块末尾。
- 光标在当前块末尾时，`ArrowRight` / `ArrowDown` 进入下一块开头。
- 光标不在边界时，方向键仍使用 textarea 原生移动。

回归关注：

- command suggestion 打开时，方向键仍优先移动建议项。
- heading 中间拆分时，后半段继续作为同级 heading。
- paragraph / list / task 的 `Enter` 行为不回退。

验证：

- `git diff --check`
- `make check`
- `make build`
- 临时 Vite 页面可启动到 `http://127.0.0.1:5177/`；普通浏览器环境缺少 Tauri IPC，创建 / 保存便笺会因 `window.__TAURI__.invoke` 不存在而失败，因此未把浏览器页面验证记为完整实机验证。
