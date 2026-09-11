# 跨端插件可行性历史执行

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
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S3","name":"双移动端安装与提醒验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":3,"status":"受阻","evidence":["E-004 持久化门通过后进入移动前置准备：adb无设备，Android两项API35 AVD与Rust targets存在；iOS无可用模拟器与编译target；尚未运行手机端或验证通知","E-005 Probe34b8a94：Android15模拟器真实导入/重开/系统后台提醒/取消/坏输入与越权反例通过","E-006 Probee106caf：iOS构建/安装/启动/通知权限通过，文件选择器工具无法交互，等待最小人工操作；双端和真机未验收","E-006已解除选文件阻塞，Probee79ec60补齐iOS同JS/JSON导入/持久化重开/后台通知/取消；Android与iOS均有最小模拟器闭环，真机/渠道/撤权/设备重启及完整平台矩阵仍未完成","v1结束时完整真机/安全矩阵未验收；保留未通过结论，v2另按用户批准的模拟器基线裁决"]}
```

S3 产出：Android/iOS 安装渠道、文件选择、后台/锁屏/撤权/取消通知的设备证据；模拟器和真机结果分开。工具链缺失不判定产品不可行。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-006","name":"iOS 课程提醒同例验证","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户要求Android样例后以同样例验证iOS，补必要环境，不扩完整手机版","scope":"独立Probe同JS/JSON在iOS模拟器承载、Rust持久化与系统通知；必要runtime/编译target准备；不承诺真机签名或App Store审核","steps":["T-PLUGIN-PLATFORM-VALIDATION/S3"],"evidence":["Probee106caf：共用JS/JSON、Rust C ABI与iOS UIKit/JavaScriptCore/系统通知适配已构建和签名；iPhone16模拟器iOS26.5安装启动，通知权限页面授权通过","官方iOS运行时8.52GB与Rust模拟器target准备完成；Android共用桥交叉构建与既有14项/2子进程回归仍通过","系统UIDocumentPicker可见但CUA无内部AX元素，坐标点击noWindowsAvailable；激活窗口/完整树/Tab未恢复，已请求用户最小选文件","未取得iOS课程导入/持久化/后台提醒/取消结果；为保留现场，最后一版弹窗收口修正仅编译未覆盖运行app","用户反馈加载完成后，CUA实际确认“外部 JS 已就绪”；已打开课程JSON选择器并看到course.json，但坐标点击仍报noWindowsAvailable。尚未导入课程。","续接实测：用户完成选JS/JSON后，页面与Rust快照确认课程；批准JS与Android共用样例SHA256一致","iOS后台/锁屏出现真实课程通知；取消10:44:14 UTC计划后截止时间之外无课程通知","安装最新构建，进程10009→48619，重开读取课程成功；最新构建10:49:07通知出现，取消10:50:07计划后10:50:41之后无通知","Probee79ec60保存逐项证据，安装二进制SHA b2d274121d359f05a4500c9cdb1346e63079394ffb47d2f06778239832a6ac9c；本轮无源码变更、无产品Promotion；仅最小模拟器闭环，不关闭Task"],"stop_reason":null}
```

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-005","name":"Android 课程提醒最小样例","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-11 用户要求手机可操作最小课程提醒样例：先Android，外部JS/JSON、保存/后台提醒/取消，再同样例iOS；不扩建框架","scope":"在独立Probe构建安装可操作Android样例，模拟器实测文件导入、Rust持久化及系统提醒；不修改安装版/真实数据，不扩大商店或升级体系","steps":["T-PLUGIN-PLATFORM-VALIDATION/S3"],"evidence":["Probe34b8a94：arm64 Android APK构建/签名/模拟器安装通过；系统文件选择器导入外部JS和课程JSON，经Rust保存并重开读取","Android15 API35模拟器后台16:45:25通知显示；16:47:15计划取消，16:47:29无新增通知；坏JSON不覆盖、直接桥接伪造身份/原生命令/提醒请求拒绝","修复Android文件锁适配及UI结果可读性；既有14项测试和2次子进程入口仍通过；未改变Parent产品源码或安装版","原Android镜像缺system.img，使用校验过的官方替代镜像置于仓库外缓存；iOS runtime下载及后续同例验证转E-006，不能宣称双端完成"],"stop_reason":null}
```

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S4","name":"证据审查与运行路线决策","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","number":4,"status":"已跳过","evidence":["旧阶段裁决由v2/S5承接，已知安全不足仍约束任意第三方安装"],"skip_authorization":"D-EXT-004用户批准模拟器验收及受限首包接入，裁决迁移至v2/S5；不宣称v1安全门通过"}
```

S4 根据 S2/S3 证据选择容器，记录限制与后续任务放行；缺任一关键平台证据不关闭 Task。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-001","name":"跨端插件最小闭环落地","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v1","status":"succeeded","authorization":"2026-09-10 用户：整理方案文档、更新项目状态和执行文档、开始落地；覆盖可行性实现及验证，不发布或迁移用户数据","scope":"本次完成首批 S1 后端合同与移动环境预检；完整运行闭环由后续 S2/S3 推进，不重写现有宿主","steps":["T-PLUGIN-PLATFORM-VALIDATION/S1"],"evidence":["规划 v3、实施基线 v1、D-EXT-003、TODO/STEPS/上下文同步；首批 Rust 模块及 fixture/反向测试落地","49 Rust 与31前端测试通过；自审补强未声明能力反例；无安装/数据/权限迁移","Android SDK/targets/AVD 已有但无连接设备；iOS 无可用模拟器与 Rust target；未做移动运行或通知实测","本执行成功仅指启动实施并交付 S1；S2–S4 未完成，Task/Milestone 保持 in_progress"],"stop_reason":null}
```





## v2 收口审阅

```tracking-step
{"id":"T-PLUGIN-PLATFORM-VALIDATION/S5","name":"模拟器证据与已知边界裁决","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v2","number":1,"status":"已完成","evidence":["双模拟器功能链路已有实测；D-EXT-004确认受限首包接入，iOS资源控制不足继续阻止任意第三方开放"]}
```

用户批准D-EXT-004：双模拟器证明功能可行性，真机不再阻塞；任意第三方隔离/资源边界尚不完整，该负面结论继续阻止开放安装。旧v1 Steps状态按历史保留，不改写为已完成。

```tracking-execution
{"id":"T-PLUGIN-PLATFORM-VALIDATION/E-007","name":"可行性结论审阅与受限晋升","task_id":"T-PLUGIN-PLATFORM-VALIDATION","task_version":"v2","status":"succeeded","authorization":"2026-09-11 用户批准模拟器验收并将成果在产品重新实现，保留任意第三方安全门","scope":"审阅既有双端证据与已知不足，结束Probe功能可行性阶段；不声称安全放行","steps":[],"evidence":["Android与iOS模拟器同JS/JSON链路已有e79ec60证据；明确iOS不能抢占恶意循环、内存边界未完成；D-EXT-004受限官方首包路线"],"stop_reason":null}
```
