# 全量审查缺陷整改方案 @v1

任务：[T-PROJECT-REVIEW-FIX](../TODO.md#t-project-review-fix)。输入：[R01–R12 审查报告](../reviews/2026-09-10-project-review.md)，实现前基线 `ae7e8cc`。

授权：2026-09-10 用户要求“整理好方案文档，然后按照文档开始处理review发现的问题”。以下为该范围内的实现方案，按主 STEPS 串行推进；本文件保存合同与导航，不维护任务/步骤状态。

## 目标、边界与取舍

保留 Markdown-first、单活动块、多 WebView 和本地 JSON 架构。修复误删、丢稿、失败吞错和跨窗口覆盖，保持现有文件可读取。缺陷属于 Bug/回归，依据见原审查报告；登录现场失响应仍属证据不足。

不拆分 dev/release 的业务数据或单实例身份，不迁移真实用户数据，不修改系统登录项、不启动或结束现有应用、不发布安装包。开发版禁用自启登记；release 使用当前实际可执行路径，已有错误登录项需通过正式版显式开关重新登记。

文本并发采用锁内 expectedText 比较，避免以时间窗口猜测写入归属；不新增持久化 revision、不自动合并草稿。值先变后恢复不造成正文覆盖差异，该合同只保护正文，不替代元数据事务。

R01 关闭策略：关闭详情只关闭视图，已写盘的新笔记（包括尚未编辑的标题占位笔记）均保留；删除由既有显式回收站入口承担，避免跨窗口编辑与条件删除之间的新竞态。

## 有序批次与验收

| 阶段 | 发现 | 实现合同 / 主要导航 | 正反验收 |
| --- | --- | --- | --- |
| S1 编辑安全 | R01/R02/R03/R06 | inspector-actions 管新稿关闭；独立文本提交/同步模块管理基线、写入与冲突；BlockNoteContent 保留草稿；notes service 锁内校验 expectedText；各编辑入口传原文 | 已保存笔记关闭仍在；失败与外部变更后草稿可恢复；外部事件不因750ms被忽略；过期正文写入被拒；正常保存/元数据更新无假冲突 |
| S2 存储完整性 | R04/R05/R07 | preferences 独立 repository 统一锁内 patch、原子写与备份，快捷键和 Markdown 设置均走同入口；当前 notes 严格反序列化，旧迁移保持宽松 | 两字段并发更新均保留；坏偏好/坏笔记拒绝写入且文件字节不变；写入失败保留旧文件；既有合法数据及旧迁移可读 |
| S3 数据往返与展示 | R08/R09/R12 | export/import 明示 is_done，旧导出用 completed_at 兼容；导入成功广播 notes_changed；renderer 图片只转义一次 | 未完成、已完成普通笔记、done log 往返不改状态；导入结果可刷新并触发草稿保护；查询参数、引号和实体字面量安全且不双重转义 |
| S4 启动与几何 | R10/R11 | debug 不注册自启插件，前端显示不可用原因；显示器矩形统一转换到当前窗口 scale 的坐标空间，避免混用各屏 scale | dev 不提供自启写入口；release 沿插件当前路径登记；100%/125%、负坐标屏无重叠误选；单屏几何测试不回归 |
| S5 综合复核 | 全部 | make check/test/build-frontend、差异 review、任务与文档校验 | 本机自动验证通过；逐项记录实测和待实机项；不得把 Windows/登录现场未测写成通过 |

## 导航与职责

- 编辑：`src/lib/workspace/controllers/workspace-inspector-actions.js`、`src/lib/components/workspace/WorkspaceNoteInspector.svelte`、`src/lib/components/note/BlockNoteContent.svelte`、三个 route、`src/lib/note/` 专用保存/事件模块。
- 持久化：`src-tauri/src/notes/{commands,service,repository,store}.rs`、`src-tauri/src/preferences/`、`src/lib/preferences/preferences-store.js`；快捷键/Markdown 配置仅调用共享偏好 patch。
- 往返：`src-tauri/src/markdown_storage/{import,export,commands}.rs`；渲染：`src/lib/markdown/renderer.js`。
- 平台：`src-tauri/src/lib.rs`、`src-tauri/src/desktop/sticky/auto_hide.rs`、`src/lib/workspace/controllers/workspace-startup-actions.js`、两个设置入口。
- 验证：`tests/frontend/` 真实控制器与失败回滚测试，Rust 模块内隔离文件/并发/几何测试；不读写生产存储。

## 兼容、风险与恢复

### S1 实现证据

`text-commit.js` 提供显式布尔保存结果与外部正文保留判据；工作台详情使用独立正文缓冲，冲突/失败提示含“重新加载会放弃草稿”。关闭新建详情仅关闭视图；mini 保存失败也保留对话框。后端 `update_note_text` 要求 expectedText，检查和写入在 NotesStore 锁内完成；文本事件携带 sourceWindow，贴纸不再按时间忽略外部修改。结构保存等待成功后才推进光标，异常也还原快照。

本机 Svelte 0/0，24 前端测试、32 Rust 测试通过；新增测试覆盖真实保存 helper 与结构回滚组合、无自动删除、来源识别、草稿保留和旧正文写入不改变文件。新增 Node 测试遵循项目既有 ts-nocheck 约定，未放宽业务源码检查。真实双窗口 DOM 交互仍列在 S5。

### S2 实现证据

`preferences/repository.rs` 独占进程内偏好锁：前端 `set_preferences({updates})`、快捷键、Markdown 配置均提交字段 patch，后端锁内读取/合并/校验/写入。`runtime/atomic_file.rs` 从现有 notes 实现提取，供两种存储共用同步临时文件与替换；偏好保留 `.json.bak`，坏 JSON 不回退覆盖。首启默认值与 serde 字段默认统一。

当前 notes 支持数组及历史 notes envelope，但条目严格按 Note 校验，拒绝坏类型、空/重复 ID；旧 Flutter 导入继续走专用宽松解析器。本机 24 前端/36 Rust 测试通过，新增并发字段保留、坏偏好/坏笔记不改原文件、默认兼容测试；未读写真实用户存储。

### S3 实现证据

Markdown front matter 新增 `is_done`；兼容旧导出的 completed_at，显式 false 优先。普通笔记完成态与 done log 分别往返测试通过。导入提交成功后后端广播文本更新，工作台显式 reload（复用原 syncWindows）；导入失败不刷新。图片生成恢复本 renderer 自己转义的字符，再在属性边界只转义一次，生成的 image HTML 不参与后续链接/强调正则。

28 前端/38 Rust 测试通过，Svelte 0/0；回归覆盖三类完成状态、旧导出、导入成功/失败刷新、URL 查询参数/引号/实体和图片内 URL 不二次解析。未访问网络图片或真实 Markdown 数据目录。

### S4 实现证据

新增 `desktop/startup.rs` 的能力查询，debug 不注册自启插件，mini/workspace 两处基于后端能力禁用开关并显示原因；release 路径沿插件实际 executable，不自动改用户登录项。测试证明 unavailable 时读/开/关均不调用插件，available 时保留显式开关。

几何计算拆入 `sticky/geometry_space.rs`，Windows 所有 monitor rect 使用 window_rect 捕获的同一 scale。核对锁定 Tao 0.34.5 macOS 实现后确认其 physical position 由全局逻辑坐标乘各屏 scale 构造，因此 macOS 继续按各屏 scale 还原逻辑坐标，避免跨平台误改。该差异是 R11 同一目标内的平台适配细化，不更换数据契约。混合 DPI、负坐标和边界半开区间测试通过。

本机 Svelte 0/0，30 前端/41 Rust 测试通过；Windows 原生编译/多屏与正式登录启动尚待 S5 平台验收，未宣称已复现原菜单栏故障。

### S5 综合复核证据

组合 review 进一步收敛：失焦与显式关闭共享一个保存 Promise，避免重复保存/假冲突；写入中正文只读，结构重写等待结果后再推进光标。详情绑定全量笔记而非过滤后卡片集合，外部文字/标签变更退出搜索结果时不卸载编辑器。冲突详情中的任务操作绑定当前显示文档的 ID/基线；重试保存仍受后端原文校验，重新加载通过显式动作放弃草稿，避免触发失焦回写。

本机：31 项前端、41 项 Rust 测试；Svelte 0 error/0 warning；前端生产构建通过。macOS `cargo check --release --locked` 通过，覆盖正式版自启插件注册分支。浏览器夹具使用真实 Inspector/BlockNoteContent、模拟存储，六条 DOM 场景覆盖关闭等待保存、失败保稿、直接重试、外部冲突显式重载、Enter 成功和失败恢复；截图确认提示与草稿可读。脚本入口及依赖见 [构建文档](../build/make-commands.md)。最初临时 harness 遇到 ESM 解析和 macOS 临时路径符号链接问题，修正夹具解析/realpath 后通过；不是产品运行失败。

Windows：通过既有 SSH 入口连接 Lenovo，先核对 `rust/code/desk_tidy_sticky` 下 59 个 Rust/配置文件与 Mac SHA-256 全部一致，再运行 `cargo test --locked`（并发 2），43 项原生测试通过。构建缓存位于 Windows 仓库外，可重建，不进入 Syncthing；未修改远端源码、服务或用户数据。

仍需实机验收：①用更新后的正式构建验证登录后托盘唤醒，以及正式版重新登记自启的实际路径；②Windows 100%/125% 与负坐标多屏下真实隐藏/唤回/拖动。源码与自动测试完成不表示已安装版本更新，也不代表这两项通过；Task 在这两项有证据前不转 done。

每批独立提交，包含文档与测试；回退使用相应 Git 提交的逆向变更，不自动覆盖用户工作区。已有审查报告与历史验证不改写。

- 严格校验可能揭露过去被宽松解析掩盖的坏记录：进入恢复提示而不是“修好”或覆盖原件。
- expectedText 修改内部命令合同：所有内置文本编辑入口同步迁移；失败保留草稿，禁止自动重试旧正文覆盖新状态。
- 偏好锁只保护本进程，同名应用仍保持单实例；不声称解决任意外部程序同时编辑文件的问题。偏好损坏不自动恢复，备份仅供显式恢复。
- 混合 DPI 使用同一窗口 scale 做运算，数据模型仍沿用现有逻辑像素；不在本批迁移跨显示器持久化格式。真实 Windows 多屏与 macOS 登录行为保持独立验收门。
- 收起动画 reserve 竞态、macOS order_out 生命周期、CSP/devtools 策略及其他未确认项不混入已确认十二项修复。
