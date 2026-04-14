# 前端结构整理手工回归清单

日期：2026-04-14
阶段：回归验证第一轮
状态：真实 Tauri UI 第一轮回归已完成，通过

## S：背景

2026-04-14 这一轮前端结构整理已经完成多轮代码拆分，当前最重要的不是继续大拆，而是确认以下重构没有引入可见行为回归：

- `note/[id]` 详情页动作拆分
- `workspace/sidebar` 表现层拆分
- `workspace/focus hub` 运行时拆分
- `workspace/+page.svelte` 装配层桥接拆分
- `settings dialog`、`NotesSection`、`theme template` 等 P4 表现层拆分

## T：任务

本轮目标不是继续改代码，而是提供一份可以直接照着执行的真实 UI 回归清单，确保：

- 启动命令明确
- 验证顺序明确
- 每个步骤的关键观察点明确
- 后续出现问题时能直接回写到 TODO / issue 文档

## 启动方式

说明：`pnpm tauri dev` 已做低负载命令链路验证，CLI 帮助可正常返回。由于这条命令会启动 dev server + Rust/Tauri 开发进程，属于明显高负载场景，建议放到外部终端执行，不要在 IDE 内部长时间占用。

推荐启动命令：

```bash
pnpm tauri dev
```

运行信号：

- 正常情况下会先看到前端 dev server / tauri dev 的持续输出。
- 随后会拉起桌面窗口。
- 如果长时间没有新输出且窗口也未出现，再视为可能卡住。

## 执行顺序

### 1. P0 `note/[id]` 详情页

建议先验证详情页，因为这块拆分最深、交互最碎。

步骤：

1. 打开任意便笺详情页。
2. 修改文本并等待自动保存或触发保存动作。
3. 粘贴一张图片。
4. 输入命令触发建议列表，验证键盘导航与插入。
5. 拖拽便笺窗口。
6. 依次测试 `pin/topmost/wallpaper`。
7. 调整颜色、透明度、毛玻璃。

重点观察：

- 文本保存后内容未丢失。
- 图片粘贴后能正常落入编辑内容。
- 命令建议不会错位、卡死或插入错误。
- 窗口拖拽流畅，不出现跳动或错位。
- `pin/topmost/wallpaper` 状态切换后视觉和层级正确。

### 2. P1 `workspace/sidebar`

步骤：

1. 打开 workspace。
2. 切换 `main tab`。
3. 切换 `view mode` / `sort mode`。
4. 切换 `tag filter`。
5. 验证 deadline action 是否能驱动 focus 相关行为。
6. 手动拖动 sidebar 内部分区。
7. 切换 compact / collapsed 状态。

重点观察：

- 过滤和排序后列表内容正确刷新。
- deadline action 触发后不会丢状态。
- 手动分区不会出现高度异常、圆角裁切或分隔条假触发。
- compact / collapsed 下内容不重叠、不溢出。

### 3. P2 `focus hub`

步骤：

1. 开始一个 focus task。
2. 暂停 / 恢复。
3. 切换任务、删除任务。
4. 让一个番茄周期完整结束或用测试态快速值验证完整流程。
5. 验证 break reminder、fullscreen overlay、postpone/skip。
6. 刷新或重启后验证恢复。
7. 打开 settings，修改并保存。

重点观察：

- timer 状态切换正确。
- task draft / task actions 没有丢接线。
- break overlay 能正常出现、关闭、延后。
- 刷新恢复后任务、计时和设置状态一致。

### 4. P3 `workspace route`

步骤：

1. 重启 workspace，验证 preferences 恢复。
2. 切换 `auto zoom / manual zoom`。
3. 调整窗口大小，观察高 DPR / 不同宽度下布局表现。
4. 拖动 sidebar splitter。
5. 打开 inspector，编辑后关闭。
6. 新建 note，切换 note view mode。

重点观察：

- preferences 恢复正确。
- zoom 与 text scale 不出现异常跳变。
- sidebar / inspector 拖拽映射准确。
- inspector 草稿与新建 note 状态持久化正常。

### 5. P4 次级表现层

步骤：

1. 打开 settings dialog，切换 general / theme / display。
2. 测试 theme preset、复制完整模板、导入 / 导出。
3. 打开 NotesSection：
   - 切换 `quadrant`
   - 切换 `active/archive/trash`
   - 测试 swipe、priority、pin、reorder

重点观察：

- settings dialog 三段拆分后交互无缺失。
- 复制完整模板内容完整。
- NotesSection 的 quadrant 和 list 两套视图都正常。
- `NotesLinearListItem` 拆分后 swipe / reorder / action row 没有断线。

## 记录方式

建议按以下格式记录结果：

- `P0 note/[id]`: pass / fail，失败点一句话
- `P1 sidebar`: pass / fail，失败点一句话
- `P2 focus hub`: pass / fail，失败点一句话
- `P3 workspace route`: pass / fail，失败点一句话
- `P4 secondary views`: pass / fail，失败点一句话

如果出现失败，优先补充：

- 复现动作最短路径
- 预期行为
- 实际行为
- 是否稳定复现

## R：当前结论

- 启动命令链路已做低负载验证：`pnpm tauri dev --help` 正常。
- 用户已按本清单完成第一轮真实 Tauri UI 回归，当前反馈为“测试了没问题”。
- 当前结论：P0 / P1 / P2 / P3 / P4 本轮回归通过，可进入收敛观察期。
