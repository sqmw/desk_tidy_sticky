# Project STEPS

主 STEPS：承载正在推进的 Task 的宏观步骤序列与执行位置。任务级状态只在 [Project TODO](TODO.md) 维护，本文件只维护步骤状态。

活跃步骤块数量：**4**

步骤状态取值：`未开始` / `进行中` / `受阻` / `已完成` / `已跳过`

---

## 活跃步骤块

### T-PLUGIN-HOST · 第三方插件宿主 @v1

<a id="t-plugin-host"></a>

所有者Codex /root；single-writer；2026-09-11。回链：[Task](TODO.md#t-plugin-host)。目的：在主程序实现受限首包安装链路；授权与边界见D-EXT-004及[基线](plugins/timetable-v01.md)。

```tracking-step
{"id":"T-PLUGIN-HOST/S1","name":"官方课表包与原生安装边界","task_id":"T-PLUGIN-HOST","task_version":"v1","number":1,"status":"已完成","evidence":["主程序已实现完整包摘要预检/权限确认/原子独立状态；篡改包与坏状态拒绝测试通过；iOS产品内实际导入官方包、确认权限并安装启用"]}
```

```tracking-step
{"id":"T-PLUGIN-HOST/S2","name":"插件运行入口与课表使用界面","task_id":"T-PLUGIN-HOST","task_version":"v1","number":2,"status":"已完成","evidence":["插件页和Worker运行已接入；iOS安装后出现课表入口；修正独立滚动，完整课表保存/提醒验收待继续","iOS文件选择器noWindowsAvailable，Window激活重试无效；Android Emulator不被CUA识别；已请求最小用户操作/ADB授权","2026-09-11 D-EXT-006恢复：先在Mac实现管理/使用分离；旧移动工具阻塞保留为历史证据，不阻塞当前阶段。","D-EXT-006 Mac本批：管理/课表分离、工作台动态入口、完整导入预览/确认保存、进程重开课程保留、停用入口隐藏与提醒队列清空均有原生实测；浏览器反向交互通过，见mac-product-flow.md。移动及完整提醒门仍未验收。"]}
```

```tracking-step
{"id":"T-PLUGIN-HOST/S4","name":"插件主窗口接入方案","task_id":"T-PLUGIN-HOST","task_version":"v1","number":3,"status":"已完成","evidence":["主窗口接入方案v1含三产品官方来源、页面/草稿合同、源码路由、实施顺序、反例验收与恢复边界；文档review及链接/追踪校验通过，不代表代码实施"]}
```

主窗口方案先明确页面、草稿与验收边界；本轮只整理文档。后续实施须取得开始代码工作的指令，不把本执行作为代码实施证据。

```tracking-step
{"id":"T-PLUGIN-HOST/S5","name":"Mac主窗口接入与交互验收","task_id":"T-PLUGIN-HOST","task_version":"v1","number":4,"status":"未开始","evidence":[]}
```

获准实施后按[方案第6节](plugins/workspace-integration-plan.md#6-拟实施顺序与验收)先保护草稿，再接入页面并复跑Mac闭环；不以前轮独立窗口证据替代。本阶段期间不推进移动适配。

```tracking-step
{"id":"T-PLUGIN-HOST/S3","name":"产品移动构建与生命周期回归","task_id":"T-PLUGIN-HOST","task_version":"v1","number":5,"status":"未开始","evidence":[]}
```

```tracking-execution
{"id":"T-PLUGIN-HOST/E-001","name":"课表插件产品接入基线与最小安装链路","task_id":"T-PLUGIN-HOST","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户要求主程序可安装课表v0.1及双模拟器闭环；任意第三方开放前保留安全门；2026-09-11 用户批准D-EXT-006：先在Mac落实插件入口、安装及独立课表导入使用","scope":"受限首包安装、权限确认、打开/停用/卸载、错误显示；产品按模块重做，不整包复制Probe","steps":["T-PLUGIN-HOST/S1","T-PLUGIN-HOST/S2","T-PLUGIN-HOST/S3"],"evidence":["a30f4ed已实现主程序受限包安装/权限/生命周期、Worker和课表页；60 Rust/34Node/check0错误/双端产品构建通过","iOS产品内实际预检、权限确认、安装启用和重开安装状态保留通过；最新课表导入与完整提醒矩阵因工具点击阻塞未完成，见产品检查点","用户反馈文件选择完成并选择手动Android；iOS复核安装仍有效、错误包输入被拒绝，native revision1/data=null/notificationIds空；恢复CUA仍noWindowsAvailable，未宣称保存或通知通过","2026-09-11 D-EXT-006恢复后完成Mac S2产品流程；原生安装/文件导入/预览/保存/进程重开/侧栏直达/停用入口同步及数据保留通过。37前端、check0/0、五组DOM/真实Worker通过。S3移动与整个Task安全/提醒验收未宣称完成；旧原生改动保留未混入本批前端提交。"],"stop_reason":null}
```


阶段顺序补充（D-EXT-006）：S2当前验收管理与课表入口、导入预览/保存/重开；不推进S3移动构建，也不扩大通知适配。Task整体安全与生命周期验收不减少。

阶段顺序补充（D-EXT-007）：用户批准主窗口方向的方案整理；S1→S2的旧证据保留，插入S4方案和S5主窗口接入，再回到原S3移动阶段。原S3 ID不变，仅顺序号3→5；不重启已终态E-001。目标/范围仍归Task@v1，变更的是当前承载方式和阶段顺序。

```tracking-execution
{"id":"T-PLUGIN-HOST/E-002","name":"插件主窗口接入方案整理","task_id":"T-PLUGIN-HOST","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户：就按照你的调研结果整理方案文档；仅文档、计划和决策记录，不改代码/应用/用户数据","scope":"记录同主窗口产品设计、草稿保护、复用导航、实施顺序与验收；同步索引和任务记录，保留独立窗口旧证据","steps":["T-PLUGIN-HOST/S4"],"evidence":["已交付docs/plugins/workspace-integration-plan.md@v1并登记D-EXT-007；索引/TODO/STEPS对齐，旧独立窗口合同与实测保留；本轮仅文档，代码/应用/用户数据未改","已review方案与源码路由；本地链接检查、tracking_check及git diff --check通过。S5代码接入未开始，须后续启动实施。"],"stop_reason":null}
```


### T-MOBILE-BASE · Android 与 iOS 基础客户端 @v2

<a id="t-mobile-base"></a>

所有者Codex /root；single-writer；2026-09-11。回链：[Task](TODO.md#t-mobile-base)。按D-EXT-004实现主程序薄移动启动和插件页，不复制实验壳、不实现完整手机版；宿主包合同先确定后交错实现，依赖任务未完成不等于整体验收放行。

```tracking-step
{"id":"T-MOBILE-BASE/S1","name":"产品移动入口与构建","task_id":"T-MOBILE-BASE","task_version":"v2","number":1,"status":"已完成","evidence":["主产品薄移动启动与平台依赖分离完成；Android APK/iOS模拟器app构建成功，iOS已启动产品页；完整功能验收仍在宿主/集成Task"]}
```

```tracking-execution
{"id":"T-MOBILE-BASE/E-001","name":"产品移动入口与构建","task_id":"T-MOBILE-BASE","task_version":"v2","status":"succeeded","authorization":"2026-09-11 用户明确要求课表v0.1产品接入与双模拟器闭环；D-EXT-004","scope":"按D-EXT-004实现主程序薄移动启动和插件页，不复制实验壳、不实现完整手机版","steps":["T-MOBILE-BASE/S1"],"evidence":["a30f4ed产品启动分离与双端工程生成/构建完成；不复制Probe壳；未宣称完整手机版或Android界面闭环已验收"],"stop_reason":null}
```

### T-TIMETABLE-PLUGIN · 课表插件与 JSON 规范 @v1

<a id="t-timetable-plugin"></a>

所有者Codex /root；single-writer；2026-09-11。回链：[Task](TODO.md#t-timetable-plugin)。按固定包合同实现学期/节次/周次/课程/提前提醒及每日视图；高级例外仍未完成；宿主包合同先确定后交错实现，依赖任务未完成不等于整体验收放行。

```tracking-step
{"id":"T-TIMETABLE-PLUGIN/S1","name":"课表 v0.1 包与规则","task_id":"T-TIMETABLE-PLUGIN","task_version":"v1","number":1,"status":"已完成","evidence":["官方JS包实现版本化学期/节次/显式周次/课程/提前提醒/每日数据；3条新增Node规则回归通过；产品交互与高级例外未据此宣告完成"]}
```

```tracking-execution
{"id":"T-TIMETABLE-PLUGIN/E-001","name":"课表 v0.1 包与规则","task_id":"T-TIMETABLE-PLUGIN","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户明确要求课表v0.1产品接入与双模拟器闭环；D-EXT-004","scope":"按固定包合同实现学期/节次/周次/课程/提前提醒及每日视图；高级例外仍未完成","steps":["T-TIMETABLE-PLUGIN/S1"],"evidence":["a30f4ed课表v0.1包及构建摘要、JSON样例和规则测试完成；保留32条计划/两时区限制，主程序使用闭环待宿主验收"],"stop_reason":null}
```

### <a id="steps-t-stk-p0-data-safety"></a>T-STK-P0-DATA-SAFETY · 贴纸数据安全 P0 修复 · 定义版本 v1

- 回链 TODO 条目：[T-STK-P0-DATA-SAFETY](TODO.md#todo-t-stk-p0-data-safety)
- 块所有者：Claude Code 会话 `97c43058`
- 写入模式：`single-writer`
- 执行授权：`implicit` — 来源：用户 2026-08-10 指令“开始修复”，紧接在上一轮“P0 四条要不要本轮落地”的提问之后；范围：扫描文档 P0 批次 A1/A2/A3/A4 加同函数的 A5/C1。四项均为可逆代码修复，不触及冻结基线与架构取舍，故不升级为 `explicit`。
- 最近更新：2026-08-10

**目的意图**：把 `docs/issues/2026-08-10-sticky-full-scan.md` 判定为 P0 的四条数据安全缺陷从"有台账"推进到"已修复且有自动化回归"，消除贴纸尺寸单调膨胀、隐藏贴纸丢失可见锚点、隐藏态切层级后贴纸永久失踪、块编辑器静默丢内容这四类用户不可逆损失。顺带并入 A5、C1 两条与 P0 同文件同函数、独立提交反而增加噪音的修复。明确不含 B1 混合 DPI 坐标空间口径、B2 macOS 窗口生命周期取舍、F4 devtools 发布策略，这三条需要先与用户定方向。

**宏观步骤**

| # | 步骤 | 状态 | 完成判据 | 实测结果 |
| --- | --- | --- | --- | --- |
| 1 | A2 + A3：后端隐藏态守卫与坐标回收 | 已完成 | `hide_note_to_edge_unlocked` 对 hidden 幂等；`clear_auto_hide_runtime` 在 hidden 时回收 `x/y`；三条仍保留活窗口的命令先唤回再改层级；新增 Rust 测试覆盖幂等与坐标回收 | 新增 `is_already_hidden` 守卫与 `reveal_hidden_note_before_state_change`；Rust 测试 19 → 24 全绿 |
| 2 | A1：控制态预留量归口前端 | 已完成 | 新增预留量运行态与上报命令；`persist_note_window_size` 扣除预留后再写盘；前端在扩窗/收窗两处上报；新增 Rust 测试覆盖扣减与缺省回落 | 新增 `StickyWindowReserveState` + `set_note_window_reserve` + `note_body_extent`；前端改为单一 `getAppliedControlsReserve()` 算式并由 `$effect` 上报；Rust 测试 24 → 31 全绿。已知残留：收起动画期间约 1ms 的上报/缩窗非原子窗口，记入扫描文档第 8 节 |
| 3 | A4 + A5 + C1：块编辑器写入路径 | 已完成 | 分块/追加/合并三处检查保存返回值并回滚草稿；`activeBlockInitialDraft` 三处补清；图片粘贴改走 `setEditorDraft`；新增前端测试覆盖保存失败回滚 | 抽出 `block-structural-commit.js` 纯函数（`block-note-editor-controller.js` 依赖 `$lib` 别名，`node --test` 无法加载，故另立模块）；前端测试 15 → 18 全绿 |
| 4 | 自动化验证与文档回写 | 已完成 | `make check`、Rust 测试、前端测试、`git diff --check` 全绿；扫描文档六条标记状态 | svelte-check 0 error / 0 warning；`cargo check` 无警告；31 项 Rust + 18 项前端测试通过；扫描文档新增第 8 节修复记录 |
| 5 | 实机冒烟验收 | 未开始 | 扫描文档第 8 节列出的 5 项冒烟全部通过；通过后 TODO 条目转 `done` 并按归档规则移出本块 | — |

**步骤变更记录**

- 2026-08-10 建块，绑定定义版本 v1。
- 2026-08-10 步骤 1-4 完成。追加步骤 5：自动化门禁不覆盖窗口几何、层级切换与存储恢复态这三类真实运行行为，任务在实机冒烟前不转 `done`。定义版本不变（未改变任务边界与完成定义，只把原本隐含的验收拆成显式步骤）。

---

## 挂起步骤块

### T-PROJECT-REVIEW-FIX · 全量审查缺陷整改 @v1

<a id="t-project-review-fix"></a>

回链：[Task](TODO.md#t-project-review-fix)。所有者 Codex /root；single-writer；2026-09-10。

目的意图：先形成可执行整改方案，再按批次修复 R01–R12；保留现有数据与架构，原审查证据不覆盖。与 Task@v1 对账：不含未确认登录现场根因及跨进程隔离迁移。授权：用户本轮要求编写方案并按文档开始处理，覆盖实现、测试与提交。

Step 1：继续全量审查缺陷整改，编辑保存与冲突安全。先按[方案](plans/2026-09-10-review-remediation.md)核对本批合同，再实现并验证对应反例；本批完成后才推进下一批。产出、验收、边界与风险见方案同序行，代码改动须回归并审查。

```tracking-step
{"id":"T-PROJECT-REVIEW-FIX/S1","name":"编辑保存与冲突安全","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","number":1,"status":"已完成","evidence":["R01/R02/R03/R06 已实现；24 前端+32 Rust 测试通过，Svelte 0/0；review 校验关闭不删数据、锁内 expectedText 和来源事件；真实 DOM 双窗交互留 S5 验收"]}
```

Step 2：继续全量审查缺陷整改，偏好与笔记存储完整性。先按[方案](plans/2026-09-10-review-remediation.md)核对本批合同，再实现并验证对应反例；本批完成后才推进下一批。产出、验收、边界与风险见方案同序行，代码改动须回归并审查。

```tracking-step
{"id":"T-PROJECT-REVIEW-FIX/S2","name":"偏好与笔记存储完整性","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","number":2,"status":"已完成","evidence":["R04/R05/R07 实现；24 前端/36 Rust 回归通过；review 确认三个偏好写入口共用锁内 patch，坏文件不覆盖；原子替换抽为 runtime 独立模块"]}
```

Step 3：继续全量审查缺陷整改，Markdown 往返与刷新渲染。先按[方案](plans/2026-09-10-review-remediation.md)核对本批合同，再实现并验证对应反例；本批完成后才推进下一批。产出、验收、边界与风险见方案同序行，代码改动须回归并审查。

```tracking-step
{"id":"T-PROJECT-REVIEW-FIX/S3","name":"Markdown 往返与刷新渲染","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","number":3,"status":"已完成","evidence":["R08/R09/R12 实现；28 前端/38 Rust 通过、Svelte 0/0；review 对照旧导出兼容、成功提交后事件及URL只转义一次"]}
```

Step 4：继续全量审查缺陷整改，自启门禁与混合 DPI。先按[方案](plans/2026-09-10-review-remediation.md)核对本批合同，再实现并验证对应反例；本批完成后才推进下一批。产出、验收、边界与风险见方案同序行，代码改动须回归并审查。

```tracking-step
{"id":"T-PROJECT-REVIEW-FIX/S4","name":"自启门禁与混合 DPI","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","number":4,"status":"已完成","evidence":["R10/R11 实现；30 前端/41 Rust 通过、Svelte 0/0；review 基于 Tao macOS 源码保留其逐屏反转换，仅 Windows 统一 scale；平台实机验收留 S5"]}
```

Step 5：继续全量审查缺陷整改，综合验证与收口。先按[方案](plans/2026-09-10-review-remediation.md)核对本批合同，再实现并验证对应反例；本批完成后才推进下一批。产出、验收、边界与风险见方案同序行，代码改动须回归并审查。

```tracking-step
{"id":"T-PROJECT-REVIEW-FIX/S5","name":"综合验证与收口","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","number":5,"status":"受阻","evidence":["R01–R12 源码与自动回归完成；31 前端、41 macOS Rust、43 Windows 原生测试通过；Windows 59 Rust/配置文件 SHA256 对齐","Svelte 0/0、前端生产构建、macOS release cargo check 通过；六条真实浏览器组件 DOM 场景通过","review 修正失焦/关闭并发、失败可重试及冲突旧文档操作边界；仍待正式登录托盘唤醒、Windows 实机多屏隐藏/拖动验收，步骤保留进行中","E-002：1.2.6 原生构建/签名/安装完成，真实 LaunchAgent 重载后 running；原生新建编辑关闭通过；26 条原笔记业务内容保持","现场门：托盘点击工具无法定位系统区域，已询问结果；Windows仅1块活动物理屏；真正重启未执行"]}
```

```tracking-execution
{"id":"T-PROJECT-REVIEW-FIX/E-001","name":"整改方案落地与分批修复","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","status":"succeeded","authorization":"2026-09-10 用户：整理好方案文档，然后按照文档开始处理review发现的问题","scope":"R01–R12 实现、验证、文档与分批提交；不操作真实用户数据/进程/登录项","steps":["T-PROJECT-REVIEW-FIX/S1","T-PROJECT-REVIEW-FIX/S2","T-PROJECT-REVIEW-FIX/S3","T-PROJECT-REVIEW-FIX/S4","T-PROJECT-REVIEW-FIX/S5"],"evidence":["方案先行提交 1952bc7；S1 4bcbbd3、S2 9138ce6、S3 db9ce89、S4 1451b90；S5 组合修复及验证见本执行收口提交","本轮实现和可执行验证完成；31 前端/41 macOS Rust/43 Windows Rust、六条 DOM、release check；Task 因平台实机验收未转 done"],"stop_reason":null}
```

E-002 目的意图：把已验证源码推进到实际安装和自启使用；用户追加授权覆盖 E-001 曾排除的本机生命周期/登录项操作。Task 目标与验收不变，仍推进 S5；按“盘点备份 → 构建安装 → 自启/窗口与屏幕验证”执行，保留旧工件，不自动覆盖用户笔记。

```tracking-execution
{"id":"T-PROJECT-REVIEW-FIX/E-002","name":"正式构建安装与平台验收","task_id":"T-PROJECT-REVIEW-FIX","task_version":"v1","status":"paused","authorization":"2026-09-10 用户：你直接继续推进，给你所有权限；覆盖本任务正式构建、本机备份安装、相关应用退出启动、自启登记和平台验收；不对外发布","scope":"继续 S5，部署本机正式构建并验证真实启动链；保留备份和用户数据；Windows 实际屏幕能力先取证","steps":["T-PROJECT-REVIEW-FIX/S5"],"evidence":["源码 e4c254a，正式1.2.6安装版签名核验通过，二进制SHA d107715c69397a05364093f74d33acb591e953ecfd2ff3bb707fddf6035a9d11","原生新建→编辑→关闭样例成功并归档，26条原笔记正文/业务状态及原偏好保持；备份完整","现有LaunchAgent正确路径未变；首次OS_REASON_CODESIGNING后bootout/bootstrap重新登记，PID5687稳定running","Windows WMI仅1活动物理显示器；系统托盘UI不可定位，已请求一次用户点击结果；详情见 releases/2026-09-10-local-1.2.6-acceptance.md"],"stop_reason":"恢复条件：取得托盘直接点击结果与真实登录验收窗口，并具备Windows混合DPI双屏；无需重复授权本任务已获批操作"}
```


## 关闭步骤块

- [当前项目全量审查执行证据](archive/2026-09-10-project-review-execution.md#t-project-review)

已关闭步骤块归档至 `docs/archive/steps-closed.md`（首次归档时创建）。
