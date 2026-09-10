# Project Decisions

仅保存当前有效产品/架构决策。Task 与 Milestone 的状态只在 [TODO](TODO.md)；候选方案不是生效决策。

## D-EXT-003 · 分阶段实施与默认拒绝门禁

<a id="d-ext-003"></a>

- 日期：2026-09-10；状态：accepted（用户授权按候选方向开始实施，非运行容器冻结）。
- 归属：T-PLUGIN-PLATFORM-VALIDATION @v1 / E-001。
- 决定：先落地 Rust manifest/能力准入纯模块，随后验证隔离容器、调用身份和移动提醒；无生产安装入口、无用户数据迁移。首批格式为 `manifestVersion: 1`、`hostApi: 1` 的开发合同，未发布稳定 SDK。
- 依据：Tauri 官方说明 Android/Linux 无法区分嵌入 iframe 与窗口的 IPC 来源，且应用 invoke_handler 命令默认对全部窗口开放。因此否决“现有特权页面内嵌 iframe + SDK 包装即可开放安装”，不否决所有隔离 Web 方案。
- 安全门：平台支持、发行策略、用户授权取交集；声明不产生授权；后端实际调用仍需绑定身份与重新检查。
- 回退：首批模块未接入运行路径，可通过反向提交撤销，无数据回迁。后续侵入移动壳实验另建 Probe，真实证据后再决策。
- 方案与来源：[实施基线](plugins/implementation-baseline.md)、[Tauri capabilities](https://v2.tauri.app/security/capabilities/)。

## D-EXT-001 · 插件、双移动端与课表的产品范围

<a id="d-ext-001"></a>

- 日期：2026-09-10。
- 状态：accepted（产品范围已确认；不冻结具体运行技术）。
- 来源：用户提出三项里程碑目标；随后分别回答 Android 和 iOS、用户首期就能安装第三方插件、先手动导入导出而自动同步后续单独做。
- 结论：新增第三方插件安装能力；移动端覆盖 Android 与 iOS；课表作为首个实际插件，通过本产品版本化 JSON 规范导入并设置提醒；首期跨端数据采用手动导入导出。
- 排除：不能以只有内置模块开关代替第三方安装；不能只做单一手机平台而宣称目标完成；自动同步、账号云服务不混入首期。
- 产生上下文：[T-PLUGIN-MOBILE-PLAN](TODO.md#t-plugin-mobile-plan)。
- 影响实体：[M-EXT-01](TODO.md#m-ext-01) 及归属任务，见 [规划草案](plans/2026-09-10-plugins-mobile-timetable.md)。
- 尚未裁决：iOS 分发渠道；插件运行包形态及允许能力；现有课表 JSON 样例（仓库未发现规范）；发行最低系统版本。
- 后续补充：iOS 首期是否上 App Store 已由 [D-EXT-002](#d-ext-002) 明确；具体开发签名/设备安装方式仍待验证。
- 关键边界：第三方不等于任意权限或任意原生代码；商店审核可行性须实证，不能以“套一层宿主 API”承诺审核通过。
- 关联提交：本条所在提交。

## D-EXT-002 · iOS 当前非商店首发与未来上架预留

<a id="d-ext-002"></a>

- 日期：2026-09-10。
- 状态：accepted（首期产品/分发意图，不冻结未来选择或插件容器技术）。
- 来源：用户明确“没这个计划，但是仅仅目前这么打算，以后怎么看又是一回事，所以要综合考虑下”，回应 iOS 首发 App Store 问题。
- 结论：本里程碑不以 App Store 首发审核作为交付目标；方案要保留未来上架的可演进空间，不能据此记录成永久不上架。
- 产生上下文：[T-PLUGIN-MOBILE-PLAN](TODO.md#t-plugin-mobile-plan) / E-002。
- 影响实体：[M-EXT-01](TODO.md#m-ext-01)、T-PLUGIN-PLATFORM-VALIDATION、T-PLUGIN-HOST、T-MOBILE-BASE。
- 不改变：Android+iOS、首期第三方插件可安装、手动导入导出、后续单独自动同步。
- 不由本决策推出：JS/TS 插件获得任意系统权限、iOS 签名/沙箱限制消失、未来现有插件均免改动上架。
- 否决解释：把当前不上架当作永久决定；以未来上架为由把首期第三方插件收窄为内置开关。
- 候选实现与后续触发：见[规划 v2](plans/2026-09-10-plugins-mobile-timetable.md)；未来决定上架时重新核对规则与实际候选，必要的能力或安装方式变化另行决策。
- 关联提交：本条所在提交。
