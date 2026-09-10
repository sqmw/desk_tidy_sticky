# 插件实施基线

版本：v1；驱动 [T-PLUGIN-PLATFORM-VALIDATION @v1](../TODO.md#t-plugin-platform-validation)。[执行位置](../STEPS.md#t-plugin-platform-validation)。这是开发合同，不是已发布 SDK 或冻结容器。

## 首批边界与代码导航

包声明 → Rust 严格解析 → 平台/渠道/用户能力交集 → 后续隔离运行与原生调用门禁。

- `src-tauri/src/plugins/manifest.rs`：版本、ID、平台、入口相对路径、必需/可选能力的纯校验。
- `src-tauri/src/plugins/admission.rs`：可信宿主上下文决定是否满足必需能力；返回可选能力降级原因。
- `src-tauri/src/plugins/tests.rs`：非法版本/路径/字段/重复项、平台拒绝与能力交集反例；`cargo test --manifest-path src-tauri/Cargo.toml plugins::`。
- `tests/fixtures/plugins/manifest.json`：外部 manifest 文件样例；它不是已安装可运行插件。

本批正式基础模块保留在主项目，不依赖 Tauri API、不加入 invoke_handler、不执行 JS、不写盘、不改变 capabilities。完整包解压、签名信任、原子安装、会话身份、存储及通知仍属后续阶段。未验证运行隔离前不得添加用户安装按钮。

## Manifest 开发合同

所有字段必填、未知字段拒绝；大小上限 16 KiB（UTF-8）。`manifestVersion` 与 `hostApi` 目前仅接受整数 1。`version` 为不带前导零的三段非负整数发布版本，暂不接受 prerelease/range；`dataVersion` 为正整数。

`id` 使用小写反向域名形式，至少两段，每段由字母开头、字母或数字结尾，中间可有连字符，总长不超过 128；ID 只标识名称，不证明作者身份。名称 1–80 字符且无控制字符。

`entry` 是包内 `.js` 入口：只允许 ASCII 字母/数字/连字符/下划线/点和 `/` 分段；禁止空段、点段、绝对路径、反斜杠、百分号、URL、Windows 保留设备名。此规则只校验名称，不能取代解压时的符号链接、重名覆盖、大小配额和真实路径检查。UI/资源清单格式在容器验证阶段补充，JS 可由 TS/Vite 构建产生。

`platforms` 非空且不重复：`macos`、`windows`、`android`、`ios`。`permissions.required/optional` 不得重叠或重复；能力词汇暂为 `storage`、`reminders`、`notes.read`、`notes.write`。枚举存在不代表已经实现这些能力；发行版本只能报告实际已验证能力。

## 准入与权限

可信上下文由宿主构造，分别提供当前平台、平台已实现能力、发行允许能力和该插件已获用户授权。不得把插件输入原样用作可信上下文。必需能力缺失返回原因并拒绝；可选能力缺失允许降级但必须显式报告。停用、升级、撤权后不可复用旧检查结果作为长期授权；实际请求须重新检查，平台系统通知权限还需独立验证。

## 运行与移动放行门

1. 外部 JS 包须独立加载；不读取父页面、其他插件或核心笔记，不直接调用任意原生命令；伪造 pluginId 无效。单测准入通过不证明运行沙箱通过。
2. 不在当前特权 WebView 中直接执行第三方脚本。Tauri Android/Linux 对 iframe IPC 来源不可区分，应用注册命令默认开放，不能仅删除 Tauri 全局变量或改变 iframe origin 当作完整隔离。[官方边界](https://v2.tauri.app/security/capabilities/)
3. Android/iOS 各自记录模拟器/真机、系统版本、签名渠道、包导入、锁屏提醒、修改/停用取消、撤权与重启结果；不得用前台计时器替代系统调度。
4. 2026-09-10 环境预检：Android Rust targets 与两项 API 35 AVD 配置已存在，adb 无设备；iOS simctl 可用设备列表为空，Rust iOS target 未安装。这是测试环境缺口，不是两端不可行结论。没有为本批下载大型运行时、替换安装版或改用户数据；adb 查询首次启动了本机 adb server。

S2/S3 的侵入式移动壳验证使用独立 Probe；只有实际验证成立才推进宿主/移动主线，实现结果按常规审查回流。iOS 未来上架保留 D-EXT-002 边界，不承诺任意插件原样获审。

## 验证与恢复

首批验证：Rust 正反测试、现有前端测试、差异检查与任务追踪检查。具体结果写 STEPS；不重复手写 Task 状态。新模块未接运行路径，反向提交即可撤销，无安装版本或数据 schema 迁移。模块接入前移除仅用于待接线阶段的 dead_code 允许，并补真实 IPC 身份测试。
