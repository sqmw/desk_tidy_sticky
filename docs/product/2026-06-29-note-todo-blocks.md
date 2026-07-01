# 笔记 Todo 块设计与首版落地

关联架构方案：

- `docs/architecture/2026-06-29-single-active-block-editor.md`

## Situation

便笺窗口和工作台笔记 inspector 共用同一种笔记内容语义，只是容器不同：

- 便笺：可悬浮、可贴桌面、独立窗口。
- 工作台：列表、详情 inspector、编辑区。

Todo 能力不能成为便笺专属模型，否则同一篇笔记在两个入口会出现行为分裂。

## Task

本轮目标：

1. 文本持久化仍然使用标准 Markdown。
2. `/todo` 作为编辑输入命令，不作为持久化语法。
3. 自研 Markdown renderer 把标准 task list 渲染成更好的 Todo 块 UI。
4. 便笺预览和工作台 inspector 共享勾选、追加行的回写能力。

不做：

- 不新增 Todo 数据表。
- 不新增 note 字段。
- 不引入私有 block JSON。
- 不做拖拽排序、任务级提醒、任务级标签。

## Action

### 存储格式

唯一持久化格式仍是 Markdown：

```md
- [ ] 写文档
- [x] 跑检查
```

`/todo` 在编辑器里只负责插入：

```md
- [ ] 
```

### 渲染策略

连续 task list 行会被 renderer 合并成一个 Todo 块：

```md
- [ ] A
- [x] B
```

渲染为一个 `.task-block`：

- checkbox 可点击切换。
- 已完成项使用弱化和删除线样式。
- 预览态不显示追加 `+`；新增待办通过进入块编辑态追加空行，或使用 `/todo` 命令创建。

### 回写策略

交互层只做 Markdown 行级文本变换：

- 勾选：`- [ ] A` -> `- [x] A`
- 取消：`- [x] A` -> `- [ ] A`
- 追加：编辑态在当前连续 task block 内插入 `- [ ] `

持久化继续走现有 `update_note_text`。

### 块编辑边界

Todo 块在渲染态可以直接勾选；单击 Todo 块正文时进入该连续 task list 的 Markdown slice 编辑态。

当前普通 `Enter` 的策略是：

- 在普通 paragraph / heading 内：按光标位置拆成当前块和下一块，下一块成为唯一编辑态。
- 在 Todo/list/code/table 等结构块内：先保留当前结构块完整，再在块后创建空 paragraph，避免把连续 task list 或 fenced code 拆坏。
- `Shift+Enter` 才表示块内换行。
- `Backspace` 在 active block 开头会回到上一块；空块会被删除，非空块会合并到上一块后面。

### 入口

- 便笺窗口：复用 `BlockNoteContent`，Todo 勾选和追加仍按整篇 Markdown 行号回写。
- 工作台 inspector：复用 `BlockNoteContent`，接入同一套行级回写。
- active block textarea：当前先编辑 Markdown slice；`/` 命令建议已恢复，图片粘贴后续再迁移到局部块编辑能力。

## Result

首版能力：

- `/todo` 出现在命令建议中。
- `@todo` / `@done` 继续兼容。
- Markdown task list 预览态可勾选。
- Todo 块预览态不显示追加 `+`，避免非编辑状态出现悬浮创建入口。
- 便笺与工作台 inspector 行为一致。

验证：

```bash
make check
make build
```

回归关注：

1. 普通 Markdown 列表不应被误渲染成 Todo 块。
2. `@todo` / `@done` 保存后仍展开为标准 Markdown task list。
3. 点击 checkbox 不应触发便笺进入编辑态或拖拽窗口。
4. 工作台列表卡片仍以预览为主，不应出现误触式编辑。
5. active block 命令弹层不应遮挡正文输入或导致失焦误提交。
