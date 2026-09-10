# 当前项目全量审查 · 2026-09-10

审查任务：[T-PROJECT-REVIEW](../TODO.md#t-project-review) @v1。对象：`029a6231414f4fee6a481a85f1955b25398227d3`，开始时工作区干净。

工程审查结论：**needs_changes**。发现 8 项 P1、4 项 P2；P1 是优先处理的数据丢失/一致性问题，P2 是功能或平台边界缺陷。本次未发现有足够证据应定为 P0 的问题。

本次由当前 Codex 会话审查，已接触既有结论，不宣称独立审核或发布放行。报告不修改业务实现。处置状态唯一来源：[T-PROJECT-REVIEW-FIX](../TODO.md#t-project-review-fix)；本文件的 R01–R12 是发现编号，不是第二套任务状态。

## 覆盖与证据边界

“全量”按项目全部主要功能域组织审查；不是对 208 个源码/测试路径逐行形式化证明，也不是实机全流程验收。按入口追踪关键调用、共享状态和错误路径，低风险样式、图标与历史文档不逐行展开。

| 功能域 | 主要检视对象 | 证据与限制 |
| --- | --- | --- |
| 笔记 CRUD、恢复与迁移 | `notes/model/domain/service/repository/store`、`compat/flutter_legacy` | 原模块 Rust 隔离样例；现有原子替换/锁测试通过；R07 |
| 偏好、任务与统计持久化 | `preferences/*`、前端 preferences-store、workspace focus-actions | 双 WebView 队列模拟；坏文件原模块验证；R04/R05 |
| 编辑与详情 | note route、BlockNoteContent、workspace inspector/actions、block ops/controller | 模拟调用与实际回调函数抽取；R01–R03/R06；未做真实 DOM 操作 |
| Markdown 存储 | import/export/attachments/model/commands 与设置 UI | 原模块无图片往返；前端调用验证；R08/R09 |
| 窗口、拖拽、层级、隐藏 | panel/tray、sticky/*、note-window-frame、window-sync、Windows WorkerW、macOS adapter | 静态链路与现有几何测试；R11；Windows 原生分支未在本轮编译运行 |
| 启动、自启、单实例与本地化 | lib.rs、tauri.conf、locale、startup-actions、锁定版本插件源码 | R10；未将 8 月机器状态冒充 9 月现状；登录现场未复现 |
| 专注、提醒、回顾 | focus timer/runtime/task/model、FocusHub effects、break watchdog/overlay lifecycle、review selectors | 静态检查；专注数据持久化受 R04/R05 影响；无时钟/休眠/多屏端到端测试 |
| 渲染、安全与权限 | Markdown renderer/inline-style、theme bundle/custom CSS、capabilities、asset protocol | R12；未确认可利用脚本注入；宽 asset scope 与 CSP 空值仅列加固风险 |
| 构建、分发、测试与文档 | Makefile、双平台 task scripts、portable script、package/lock/Tauri config、docs 索引 | check/test/frontend build 通过；不打包发布，不验证 Windows 安装包 |

## P1：数据安全与一致性

### <a id="r01"></a>R01 · 关闭新建详情会永久删除已保存笔记

- 定位：[workspace-inspector-actions.js](../../src/lib/workspace/controllers/workspace-inspector-actions.js) 73–77、112–114 行；[workspace 页面](../../src/routes/workspace/+page.svelte) 466–478 行。
- 触发：工作台创建框留空 → 创建笔记进入详情 → 输入内容并成功保存 → 点击详情关闭按钮。
- 根因：创建时设置 `pendingEditorDraft`，保存成功没有清除此标记。`handleInspectorClose` 只比较 ID，随后调用 `permanently_delete_note`，不检查是否已有正式内容；删除绕过回收站。
- 实测：直接加载真实 inspector-actions，以模拟命令创建 `new`，模拟已成功保存正文，再调用关闭；捕获到 `permanently_delete_note("new")`。全仓库检索确认清除标记仅在 discard 路径，不在保存路径。
- 修复边界/验收：进入整改时应让成功保存结束临时草稿生命周期，并限制空白取消删除；已保存笔记关闭后仍存在，真正未编辑草稿取消策略保持明确。此项直接阻止误删，属于优先修复，不是可选优化。

### <a id="r02"></a>R02 · 工作台保存失败被子编辑器当成成功

- 定位：[workspace 页面](../../src/routes/workspace/+page.svelte) 466–478 行；[BlockNoteContent.svelte](../../src/lib/components/note/BlockNoteContent.svelte) 247–255 行；[block-structural-commit.js](../../src/lib/note/block-structural-commit.js) 23–31 行。
- 触发：工作台编辑笔记时写入失败或进入 `recovery_required`，随后提交、回车分块或 Backspace 合并。
- 根因：父层 `updateInspectorNoteText` 捕获异常后返回 `undefined`；子层只把 `false` 视为失败，故清空编辑会话或不执行草稿恢复。组件并未接入工作台冲突回调。
- 实测：从当前 Svelte 文件原样抽取该保存函数，注入失败 invoke，与真实 `applyStructuralTextChange` 组合；返回 `true`、restore 未调用。
- 同类边界：`use-note-commands.js` 的 `saveDoneLog` 捕获保存异常而不向调用方传失败，`WorkspaceFocusHub.svelte` 的 `saveFocusCompletedReviewPrompt` 随后清空输入提示；应在同一错误合同回归中覆盖。
- 修复边界/验收：整改应让调用方收到明确失败；故障注入时正文未变、草稿仍可复制/重试、界面有失败提示。只单测 helper 返回 false 不能覆盖真实父层吞错。

### <a id="r03"></a>R03 · 工作台被外部更新时直接取消未提交草稿

- 定位：[workspace 页面](../../src/routes/workspace/+page.svelte) 847–853 行；[BlockNoteContent.svelte](../../src/lib/components/note/BlockNoteContent.svelte) 105–110 行；[WorkspaceNoteInspector.svelte](../../src/lib/components/workspace/WorkspaceNoteInspector.svelte) 68–77 行。
- 触发：工作台正编辑一块且尚未提交；贴纸或其他入口更改同笔记的该块，或改变其之前的行数。
- 根因：`notes_changed` 导致工作台重新载入 notes，effect 无条件替换 `inspectorDraftText`；block ID 包含行号和内容，找不到原 ID 时 `cancelActiveBlock()` 清稿。详情没有接入 `hasUnsavedDraft`/外部变更提示协议。
- 证据：实际 parser 对原文和外部新文产生不同 ID；组件取消条件与工作台赋值链经静态对账。未宣称做过 DOM 端到端复现。
- 修复边界/验收：整改应保护活跃草稿并显式处理外部文本冲突；两个编辑入口交替修改时未提交文字保留，元数据更新不误报冲突。

### <a id="r04"></a>R04 · 独立 WebView 的偏好队列仍会丢失更新

- 定位：[preferences-store.js](../../src/lib/preferences/preferences-store.js) 23–36 行；[preferences/commands.rs](../../src-tauri/src/preferences/commands.rs) 3–11 行。
- 触发：mini 保存语言/贴纸开关时，workspace 同时保存专注任务或统计。
- 根因：每个 WebView 各自执行 get → merge → set 全量偏好；前端队列仅在本窗口串行。两窗口可读取同一旧快照，最后一方整体写回覆盖另一方的修改。后端没有原子 patch/版本校验。
- 实测：加载两份真实 preferences-store 模块，只替换广播；屏障保证两次 get 使用同一快照。分别更新 `language` 和 `focusTasksJson` 后，最终语言退回旧值，两项不能同时保留。
- 修复边界/验收：整改应把共享读改写事务放到后端，覆盖设置、快捷键和 Markdown 配置等所有写入口；并发修改不同字段都保留，不能只给前端队列加锁。

### <a id="r05"></a>R05 · 偏好损坏后修改存储目录会覆盖专注数据

- 定位：[markdown_storage/model.rs](../../src-tauri/src/markdown_storage/model.rs) 149–152 行；[preferences/model.rs](../../src-tauri/src/preferences/model.rs) 233–236 行。
- 触发：偏好文件解析失败/暂不可读时，用户应用 Markdown 存储设置。
- 根因：`read_preferences().unwrap_or_default()` 将读取失败替换为空默认值，再整体写回。该文件保存 `focusTasksJson`、`focusStatsJson` 和休息会话。写入本身直接 `fs::write`，缺少原子替换与备份，进程中止/磁盘错误也可能产生损坏。
- 实测：在临时数据目录写入坏 JSON，调用真实 `apply_storage_preferences`，结果文件变为可解析的默认偏好，任务字段为空。未注入操作系统断电，不把非原子写入的故障窗口称为断电实测。
- 修复边界/验收：整改应阻止坏文件被默认值覆盖，并独立保证偏好原子写入；读取失败后文件字节不变、原始数据可恢复，错误不能伪装成设置成功。

### <a id="r06"></a>R06 · 750ms 回声抑制把其他窗口修改也丢弃

- 定位：[sticky-note-interaction.js](../../src/lib/note/sticky-note-interaction.js) 14–18 行；[note 页面](../../src/routes/note/[id]/+page.svelte) 642–650、1320–1338 行；[notes/service.rs](../../src-tauri/src/notes/service.rs) `update_note_text`。
- 触发：贴纸保存后 750ms 内，工作台更新同一笔记；贴纸随后基于旧内容再次保存。
- 根因：事件没有来源/请求 ID，仅按时间把同笔记所有更新都判为 `local`。被丢弃的外部内容不会重新拉取；后端更新只收 id/text，没有 expected revision，故下一次旧快照可覆盖新内容。
- 实测：真实分类器在已有未保存稿、同 note 的外部 text 事件和抑制窗口内返回 `local`。后续覆盖路径为源码证明，未驱动两个真实窗口。
- 修复边界/验收：整改应只过滤自身回声并对文本写入校验版本；连续双窗口更新时外部事件不能被静默忽略，过期提交明确冲突。

### <a id="r07"></a>R07 · 当前笔记文件复用宽松迁移解析器，坏条目被静默丢弃

- 定位：[notes/repository.rs](../../src-tauri/src/notes/repository.rs) 35–37 行；[flutter_legacy.rs](../../src-tauri/src/notes/compat/flutter_legacy.rs) 279–295、344–355 行。
- 触发：主 `notes.json` 仍是合法 JSON 数组，但其中一个元素损坏/结构不符合 Note。
- 根因：主文件使用 `load_notes_best_effort`；非对象条目跳过，只记录 stderr，读取返回成功，恢复门禁不触发。对象字段类型不匹配时还有补默认值的迁移回退。下一次常规保存将过滤后的列表整体写回。
- 实测：临时主文件包含一个合法 Note 和一个字符串坏条目；真实 service 加载成功只返回一条，再修改合法笔记后主文件只剩一条。首个备份可能保留坏条目原文，但之后正常写入会更新该单份备份，不能作为可靠恢复保证。
- 修复边界/验收：整改应区分旧数据尽力导入与当前真源严格校验；主文件局部损坏时进入恢复态且任何写入不改变文件，兼容迁移规则保持在专用入口。

### <a id="r08"></a>R08 · 导出再导入会把已完成普通笔记变成未完成

- 定位：[markdown_storage/export.rs](../../src-tauri/src/markdown_storage/export.rs) `export_kind` / `render_markdown_document`；[import.rs](../../src-tauri/src/markdown_storage/import.rs) 327–335、361–369 行。
- 触发：普通笔记标为完成（`recordKind=note,isDone=true`）→ 导出 Markdown → 原样导入。
- 根因：导出保留 `completed_at` 但普通笔记 `record_kind` 仍是 note；导入只把 done_log/review 当完成，忽略普通笔记的 completed_at，然后覆盖已有笔记的 is_done/completed_at。回顾记录因此消失。
- 实测：Rust harness 直接引用原 model/domain/service/repository/import/export，在临时目录完整往返；输出 `isDone=false,completedAt=None`。只替换图片复制依赖为无操作，测试正文不含图片。
- 修复边界/验收：整改应保留完成状态的明确数据表示；普通已完成笔记与 done log 分别往返，状态、完成时间及回顾归属保持一致。

## P2：功能与平台边界

### <a id="r09"></a>R09 · Markdown 导入成功不通知笔记窗口刷新

- 定位：[markdown_storage/commands.rs](../../src-tauri/src/markdown_storage/commands.rs) 34–39 行；[workspace-storage-actions.js](../../src/lib/workspace/controllers/workspace-storage-actions.js) 73–80 行。
- 触发：设置页面导入新文件或覆盖已存在笔记。
- 根因：后端写盘后没有发 `notes_changed`，前端只显示 summary，没有 loadNotes/syncWindows；现存列表/详情/贴纸保持旧内容。
- 证据：真实前端控制器模拟成功导入，仅调用 `import_markdown_from_storage_root`；后端代码确认缺少广播。更新现存笔记时还会扩大 R06 的旧快照覆盖风险。
- 整改验收：成功后可见列表立即显示导入结果，其他窗口收到文本变更并保留自身草稿；失败不发成功事件。

### <a id="r10"></a>R10 · 开发模式允许覆盖正式自启目标

- 定位：[lib.rs](../../src-tauri/src/lib.rs) 91–94 行；[workspace-startup-actions.js](../../src/lib/workspace/controllers/workspace-startup-actions.js) 21–31 行；[tauri.conf.json](../../src-tauri/tauri.conf.json) 5–8 行。
- 触发：通过 `pnpm tauri dev` 打开软件并启用自启。
- 根因：无构建模式门禁，锁定的 autostart 2.5.1 以 package name 命名 LaunchAgent 并记录 current_exe；dev 会登记调试二进制。登录项并不会启动 Vite，而 devUrl 依赖开发服务器。
- 证据：源码/锁定插件实现及本会话 8 月 plist 取证一致；本轮未重写或重读系统启动项，也未复现登录现场。
- 整改验收：开发操作不能意外替换正式登录目标；正式启动目标需用实际选定安装位置核验，不硬编码所有用户都装在 `/Applications`。
- 注意：相同标识带来的单实例互斥本身属于设计行为，不能独立当成菜单栏失效根因；仅拆 socket 而继续共用业务数据，会引入跨进程写入风险。

### <a id="r11"></a>R11 · 混合 DPI 屏幕被转换到不一致的坐标空间

- 定位：[auto_hide.rs](../../src-tauri/src/desktop/sticky/auto_hide.rs) 103–116、143–170 行。
- 触发：Windows 左屏 1920px、100%，右屏从 x=1920 开始、125%；贴纸位于右屏靠左位置。
- 根因：window rect 除窗口 scale，monitor rect 各除各的 scale，比较时没有统一空间。右屏原点变成 1536，而左屏仍覆盖 0–1920；右屏部分坐标落入左屏，`find` 可能选错显示器，隐藏/唤回位置随之错误。
- 证据：数值反例与源码；复核既有 8 月扫描 B1，未重复统计为两个缺陷。Windows 真实混合 DPI 行为待验收。
- 整改验收：边缘计算统一空间；覆盖 100%/125% 相邻屏和负坐标屏，贴纸应隐藏到所在屏幕且可唤回，不只测单屏 f64 矩形。

### <a id="r12"></a>R12 · 图片 URL 被双重 HTML 转义

- 定位：[renderer.js](../../src/lib/markdown/renderer.js) 210–215 行；`buildImageTag` 96–97 行。
- 触发：Markdown 图片地址含多个查询参数，例如 `![photo](https://example.org/a.png?x=1&y=2)`。
- 根因：整段先 escapeHtml，捕获到 `&amp;` 后 buildImageTag 再转义，输出 `&amp;amp;`。浏览器解码一层后请求参数变为 `amp;y`，签名图片/鉴权图片可能加载失败。
- 实测：直接调用真实 renderer，输出 `<img src="https://example.org/a.png?x=1&amp;amp;y=2" ...>`；未发送网络请求。
- 整改验收：对原始 URL 做一次属性转义；`&`、引号和实体字面量均有明确输入/输出测试，既保正确请求也不削弱 HTML 转义。

## 待验证与既有风险（不混入已确认数量）

- macOS 菜单栏登录后不弹窗：目前没有故障现场 PID、实际 executable、窗口可见性及 show/focus 结果。历史关于 Accessory → Regular 顺序“确定错误”的说法过强，本轮撤回此确定性判断；该顺序仍是可测试候选，不能据此直接改行为。
- 控制态 reserve 上报与原生 resize 的异步竞态：既有扫描已记录。源码不能支持“约 1ms”或“只会发生一次”的定量保证；窗口受 IPC/动画/调度影响，需特定时序测试。保留已有修复证据，不把 A1 宣称为覆盖全部竞态。
- macOS order_out 保留 WebView 与 900ms 轮询：生命周期代码仍符合原扫描 B2/E1 描述；CPU/IPC 实测及暂停/销毁取舍未做，未把保留窗口本身定义成错误。
- `use-window-sync` 创建 Promise 无超时、overlay 创建与关闭交错、后台 reminder 发送先去重后订阅就绪：保留为窗口/提醒故障注入候选，尚无足够端到端证据给出本轮确定归因。
- 宽 asset scope、CSP 空值、自定义 CSS 与 release devtools：应结合产品信任边界评估；没有构造出可利用链，不虚构高危漏洞。
- 文档：主 TODO 混有旧完成正文；活跃代码地图不足；旧 P0 文档把 helper 单测通过等同整个工作台保存链修复，R02 表明仍有缺口。结构治理是非当前阻塞项，不在本轮顺手迁移历史文档。

## 验证与后续边界

已完成：`CARGO_BUILD_JOBS=2 make check`（Svelte 0/0、cargo check 成功）、`CARGO_BUILD_JOBS=2 make test`（18 前端、31 Rust 全通过）、`make build-frontend`（成功）。这些检查不覆盖本报告所有用户场景。

文档验证：新增审查记录的 29 个本地文件链接有效；业务项目 Task/Step/Execution 校验通过（首次发现本轮 acceptance 字段类型和标题形状不匹配，修正记录后通过）；`git diff --check` 通过。全局规范仓库的 `make doc-check` 也通过，仅有既有体量提醒；它不替代业务项目检查。增量结构复审：本报告仅承载审查证据和源码导航，主 TODO 只加任务与摘要，未复制业务源码或重排既有历史。

隔离验证：Node 调用真实 JS 模块、双实例模块和从 Svelte 原样抽取的保存函数；Rust 直接引用原模块，以专用临时目录替代数据根目录。Rust harness 首次因自身 re-export 可见性编译失败，修正为 pub(crate) 后通过；业务源码没有修改。文件/图片复制不在 Rust probe 的主张范围。

未完成的产品验收：Windows 原生构建/混合 DPI、macOS 真登录启动、真实 DOM 交互、休眠/多屏全屏遮罩、发布包安装与恶意输入安全测试。测试通过不能授权发布。

若进入整改，优先 R01/R02（正常编辑即可误删/丢稿），随后 R03–R08（多写入者和持久化完整性），再处理 R09–R12；目标是先阻止已确认数据损失。具体实现与验证由 AI 承担，成功句柄是报告对应反例不再丢数据且旧功能通过，典型失败是仅 helper 全绿、真实调用方仍吞错。该排序是待授权整改建议，不是已经实施的工作。
