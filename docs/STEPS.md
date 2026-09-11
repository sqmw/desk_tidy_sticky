# Project STEPS

主 STEPS：承载正在推进的 Task 的宏观步骤序列与执行位置。任务级状态只在 [Project TODO](TODO.md) 维护，本文件只维护步骤状态。

活跃步骤块数量：**1**

步骤状态取值：`未开始` / `进行中` / `受阻` / `已完成` / `已跳过`

---

## 活跃步骤块

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

### T-PLUGIN-PLATFORM-VALIDATION · 跨端插件运行与分发可行性 @v1

<a id="t-plugin-platform-validation"></a>

回链：[Task](TODO.md#t-plugin-platform-validation)。所有者 Codex /root；single-writer。

目的意图：落实第三方包的验证合同，再验证移动容器与系统提醒；不改用户数据、安装版或当前窗口权限。授权：2026-09-10 用户要求整理方案、更新项目状态与执行文档并开始落地。正式纯模块与回归测试保留在主项目；可能破坏主线的移动壳实验须另建 Probe。

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S1","name":"执行基线与包准入合同","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":1,"status":"已完成","evidence":["Rust manifest 严格解析与平台/渠道/用户能力交集已实现；8 项新增正反测试；49 Rust、31 前端测试通过","review 核对未注册命令、未修改 capability、未执行入口；补强未声明但已授权能力不泄露反例；git diff --check 与 tracking_check 通过"]}
```

S1 产出：版本化 manifest、后端解析/能力准入、恶意输入测试。通过是缺权限或非法包明确拒绝；失败是声明即授权或校验过程执行代码。详细边界见[实施基线](plugins/implementation-baseline.md)。

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S2","name":"隔离运行与宿主身份验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":2,"status":"已完成","evidence":["E-002：可信 Rust 会话、严格请求分派、内存命名空间、配额原子失败和生命周期撤销已实现；9项新增测试，58 Rust/31前端通过","自审补强 reauthorize 失败仍撤销旧授权；候选安装失败保留旧会话是独立语义；真实 JS 容器、传输来源绑定、持久化及移动运行仍未验证","E-004 Probe3e85be7：外部JS读写持久化、真实Rust进程重启（49755→49758）、旧句柄重放及存活JS旧回调拒绝；14项主测试+2次子进程入口通过","S2完成限定最小Probe链路，不代表产品IPC接入、移动容器或内存硬上界通过；剩余平台/容器裁决在S3/S4"]}
```

S2 产出：独立 JS 包运行、宿主绑定身份、独立存储及越权反例；原生命令、父页面与其他插件访问均须拒绝。未通过前不开放安装入口。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-004","name":"插件持久化与重启验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"用户确认下一批补持久化，验证数据保留且旧会话不复活，再进入S3；仅独立Probe测试数据，不迁移用户数据","scope":"S2 Probe文件持久化、写入失败保护、真实Rust进程重启与旧会话拒绝；核对S3前置条件","steps":["T-PLUGIN-PLATFORM-VALIDATION/S2","T-PLUGIN-PLATFORM-VALIDATION/S3"],"evidence":["Probe3e85be7：持久化与真实进程重启通过，旧权限不落盘且重放被拒绝；14项主测试通过，ignored入口被显式启动两次各通过","自审修正悬空符号链接误当空数据；替换前失败回滚、替换后不确定阻止调用、坏文件不覆盖、排他锁与删除持久化通过","S3前置环境复核已开始；尚无移动安装、导入或通知结果；未做断电/引擎漏洞/内存硬上界审计","暂停Probe实验操作后仅回写Parent记录，不进行源码Promotion；安装版和用户笔记未改动"],"stop_reason":null}
```

E-003 使用同级独立工程 `desk_tidy_sticky--probe--js-connection`（P-JS-CONNECTION-01）验证外部 JS → JavaScriptCore 子进程 → 专属管道 → Rust broker。Parent base 为 `6233f8653c66ff60a80fc0b2c50a71cbb0486c34`；Probe 期间主项目只读，不接产品 IPC。选择系统 JS 引擎避免新增在线依赖，不冻结 Android 路线；身份、绕过 SDK、停用、超时分别实测，持久化与移动仍是后续门。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-003","name":"真实 JS 插件与可信连接验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-10 用户明确要求独立验证工程、真实外部 JS 与可信 Rust 连接及越权反例；不影响安装版和用户数据","scope":"S2 独立 Probe 实现、实际管道身份验证与样例；不将桌面/内存证据代替持久化或移动结果","steps":["T-PLUGIN-PLATFORM-VALIDATION/S2"],"evidence":["Probe P-JS-CONNECTION-01 提交518d2ed，外部entry.js实际通过JavaScriptCore子进程/固定会话管道调用Rust broker；6项集成测试两次通过","A/B隔离、伪造身份与任意命令拒绝、无环境DOM/Node/Tauri绑定、停用后存活JS旧回调撤销、无限循环与调用配额终止均有实测","自审核对三个规则快照SHA256与base相同、无通用原生导出、固定连接Session、超时及自建进程清理；未做OS沙箱/引擎漏洞审计","实验操作暂停后仅回写Parent状态/证据入口，无源码Promotion；Probe仍active/pending，S2仍进行中；持久化、内存上界及双移动端未验证"],"stop_reason":null}
```

E-002 先实现容器无关的可信会话与受控调用模块：身份由宿主连接持有，不从消息取 pluginId；撤销串行生效；测试内存存储不代替产品持久化。此纯模块不改变主线可用性，不属于侵入式 Probe；原生容器验证仍按 Probe 门禁。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-002","name":"插件隔离运行与身份验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-10 用户：可以，继续推进；续接既有可行性实现授权，不发布或迁移用户数据","scope":"推进 S2 可信会话、调用撤销、插件独立数据空间与反向测试；运行容器和真实 IPC 验证不以纯模块结果替代","steps":["T-PLUGIN-PLATFORM-VALIDATION/S2"],"evidence":["交付 broker 及9项反例测试；会话不接受消息身份、停用撤销不删内存数据、跨插件同键隔离、超限不覆盖","自审发现策略变更须与失败安装区别处理，新增先撤销再准入接口及三层策略回归；58 Rust/31前端、tracking_check、diff检查通过","实施基线/导航/TODO同步；无新依赖，无安装版、真实数据或 IPC 权限修改；本批只完成 S2 会话层，不宣告容器可用"],"stop_reason":null}
```

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S3","name":"双移动端安装与提醒验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":3,"status":"受阻","evidence":["E-004 持久化门通过后进入移动前置准备：adb无设备，Android两项API35 AVD与Rust targets存在；iOS无可用模拟器与编译target；尚未运行手机端或验证通知","E-005 Probe34b8a94：Android15模拟器真实导入/重开/系统后台提醒/取消/坏输入与越权反例通过","E-006 Probee106caf：iOS构建/安装/启动/通知权限通过，文件选择器工具无法交互，等待最小人工操作；双端和真机未验收"]}
```

S3 产出：Android/iOS 安装渠道、文件选择、后台/锁屏/撤权/取消通知的设备证据；模拟器和真机结果分开。工具链缺失不判定产品不可行。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-006","name":"iOS 课程提醒同例验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"paused","authorization":"2026-09-11 用户要求Android样例后以同样例验证iOS，补必要环境，不扩完整手机版","scope":"独立Probe同JS/JSON在iOS模拟器承载、Rust持久化与系统通知；必要runtime/编译target准备；不承诺真机签名或App Store审核","steps":["T-PLUGIN-PLATFORM-VALIDATION/S3"],"evidence":["Probee106caf：共用JS/JSON、Rust C ABI与iOS UIKit/JavaScriptCore/系统通知适配已构建和签名；iPhone16模拟器iOS26.5安装启动，通知权限页面授权通过","官方iOS运行时8.52GB与Rust模拟器target准备完成；Android共用桥交叉构建与既有14项/2子进程回归仍通过","系统UIDocumentPicker可见但CUA无内部AX元素，坐标点击noWindowsAvailable；激活窗口/完整树/Tab未恢复，已请求用户最小选文件","未取得iOS课程导入/持久化/后台提醒/取消结果；为保留现场，最后一版弹窗收口修正仅编译未覆盖运行app"],"stop_reason":"等待用户在当前iPhone模拟器选择entry.js并确认加载；收到反馈后续接E-006，核对现场并部署最新构建、导入同course.json验证提醒；无需重建任务或重复询问既有授权"}
```

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-005","name":"Android 课程提醒最小样例","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户要求手机可操作最小课程提醒样例：先Android，外部JS/JSON、保存/后台提醒/取消，再同样例iOS；不扩建框架","scope":"在独立Probe构建安装可操作Android样例，模拟器实测文件导入、Rust持久化及系统提醒；不修改安装版/真实数据，不扩大商店或升级体系","steps":["T-PLUGIN-PLATFORM-VALIDATION/S3"],"evidence":["Probe34b8a94：arm64 Android APK构建/签名/模拟器安装通过；系统文件选择器导入外部JS和课程JSON，经Rust保存并重开读取","Android15 API35模拟器后台16:45:25通知显示；16:47:15计划取消，16:47:29无新增通知；坏JSON不覆盖、直接桥接伪造身份/原生命令/提醒请求拒绝","修复Android文件锁适配及UI结果可读性；既有14项测试和2次子进程入口仍通过；未改变Parent产品源码或安装版","原Android镜像缺system.img，使用校验过的官方替代镜像置于仓库外缓存；iOS runtime下载及后续同例验证转E-006，不能宣称双端完成"],"stop_reason":null}
```

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S4","name":"证据审查与运行路线决策","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":4,"status":"未开始","evidence":[]}
```

S4 根据 S2/S3 证据选择容器，记录限制与后续任务放行；缺任一关键平台证据不关闭 Task。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-001","name":"跨端插件最小闭环落地","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-10 用户：整理方案文档、更新项目状态和执行文档、开始落地；覆盖可行性实现及验证，不发布或迁移用户数据","scope":"本次完成首批 S1 后端合同与移动环境预检；完整运行闭环由后续 S2/S3 推进，不重写现有宿主","steps":["T-PLUGIN-PLATFORM-VALIDATION/S1"],"evidence":["规划 v3、实施基线 v1、D-EXT-003、TODO/STEPS/上下文同步；首批 Rust 模块及 fixture/反向测试落地","49 Rust 与31前端测试通过；自审补强未声明能力反例；无安装/数据/权限迁移","Android SDK/targets/AVD 已有但无连接设备；iOS 无可用模拟器与 Rust target；未做移动运行或通知实测","本执行成功仅指启动实施并交付 S1；S2–S4 未完成，Task/Milestone 保持 in_progress"],"stop_reason":null}
```



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
