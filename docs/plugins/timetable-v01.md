# 可安装课表插件 v0.1 · 产品接入基线

日期：2026-09-11；依据 D-EXT-004。当前批次：主程序内本地包安装与课表使用，不扩商店、复杂升级、自动同步或完整手机版。任务状态以TODO为准。

当前产品页面与优先级以D-EXT-006及[Mac产品流程](mac-product-flow.md)为准：管理页与课表页分离，先在Mac交付安装、导入和查看。下文保留既有平台接口与证据边界，不代表本批继续扩建平台适配。

后续页面承载以D-EXT-007及[主窗口接入方案](workspace-integration-plan.md)为准：沿用管理/课表分离，改为工作台主内容区切换。本轮只整理方案，代码仍保留独立窗口；不放宽本文件的包、数据和安全合同。

## 放行与不放行

- 本里程碑Android/iOS使用模拟器验收；真机不阻塞，也不伪造为已经测试。
- Probe证明功能链路；未证明iOS恶意无限循环可抢占或任意代码的内存上界。任意第三方安装继续关闭。
- v0.1只接受主程序固定摘要白名单中的官方课表包。白名单匹配完整包字节，不只检查manifest自称ID；这不是作者签名验证，篡改或其他包拒绝。首包随主程序版本审查，改变包需重新审查/更新白名单；不建设在线信任服务。
- 外部包包含真正JS业务代码，非内置课表开关。插件无直接Tauri接口；主程序控制存储、提醒与生命周期，视图使用结构化数据而非注入任意HTML。

## 最小模块与验收顺序

当前顺序由D-EXT-005调整为**Mac完整可用流程优先 → Tauri移动运行 → 仅补暴露出的适配缺口**。下列功能范围保留，但移动构建/验收不再插在Mac基本保存流程之前。停止新增独立原生验证壳。

1. 原生安装与数据边界：包预检→显示权限→确认→原子写入独立目录；打开/停用/卸载；卸载移除代码引用但保留业务数据，避免无确认丢数据。拒绝坏包/坏状态，核心笔记不参与。
2. 官方JS课表：学期开始日、时区、总周数、节次起止、课程/周次、提前提醒；导入整体验证后替换，同一ID重复导入不追加。今日或简单周视图。v0.1先不实现调停课例外编辑/高级合并。
3. 主程序薄移动启动：保留桌面启动逻辑，移动端只开启本批插件页与必要存储/通知；复用同一产品仓库与应用身份，不复制Probe壳冒充正式接入。
4. 在产品构建内复跑Android/iOS模拟器：本地包安装→导入→显示→重开→后台提醒→修改/停用后旧提醒失效；保留坏包、越权与数据安全测试。

## 数据与提醒

JSON含schemaVersion、id、semester（startDate/timeZone/weeks）、periods、courses、reminderMinutes；周次显式整数集合，节次显式引用。课程含稳定id、name、weekday、weeks、periodIds、room。限制输入体量、数组数和引用；非法数据不部分保存。时区不由手机本地时区静默替代。

系统通知ID由宿主分配，不由插件提供。修改或停用先撤销旧计划；失败可见，不声称数据库与系统通知有跨系统原子事务。先限制滚动计划规模，明确平台不足/权限拒绝；不得以页面计时器代替后台提醒。重开须核对业务数据和系统派生计划。

## 回流与恢复

Probe P-JS-CONNECTION-01以已知功能证据及未满足的安全边界结束，结论晋升；代码保留为历史参考，不整包复制。产品按本文件模块重做并测试。新插件数据与notes/preferences分开，无旧数据迁移；受限接入可反向提交撤销，历史Probe和证据保留。

本文件是实施合同，不是完成证明；具体实测与剩余缺口写对应STEPS。

当前产品实测与恢复入口见[产品检查点](2026-09-11-product-checkpoint.md)。

## 当前产品代码导航

- `plugins/timetable-v01/entry.js` / `example.json`：外部JS规则与JSON样例；`scripts/build-timetable-package.mjs`生成dtplugin与经审查后编入宿主的摘要。构建脚本只在开发时运行，安装时不生成信任摘要。
- `src-tauri/src/plugins/package.rs` / `installed.rs` / `commands.rs`：固定包校验、独立状态文件、权限确认/版本冲突和生命周期；不使用Probe持久化文件或其JNI壳。
- `src-tauri/src/plugins/notifications.rs`：宿主通知ID与平台适配。当前桌面仅显示课表，尚无系统定时提醒；移动通知必须在产品内另测。
- `src/lib/plugins/runtime.ts`：已审查代码的独立Worker；4秒执行超时终止，不宣称这是任意代码的硬内存沙箱。
- `src/lib/plugins/wire.js`：JSON消息边界，去除前端响应式Proxy，避免保存/重开时DataCloneError；编码/发送失败不留下超时请求。对应`tests/frontend/plugin-worker-wire.test.js`。
- `src/routes/plugins/+page.svelte`：管理/课表导航容器；具体组件与测试见[Mac产品流程](mac-product-flow.md)。桌面工作台通过独立插件窗口进入，避免切走笔记编辑页面。
- `src-tauri/src/desktop_app.rs` / `mobile_app.rs`：主程序平台启动分离；桌面文件以crate-root include保留原Tauri命令宏作用域。移动页仍属同一Tauri产品，不是改名后的Probe。
- `tests/frontend/timetable-v01.test.js`、Rust plugins测试：周次/节次/时区/坏输入/提醒数量、包篡改与损坏状态拒绝。

v0.1明确边界：Asia/Shanghai与UTC两种时区、每次最多32条未来提醒；更多提醒需重开后重新提交。不能把这种有限计划说明成整个学期无需维护必达。JSON首次不承诺高级调停课例外；安装/停用/卸载数据均留本插件空间。

开发记录：Tauri初始化生成Android/Xcode工程，Gradle与Rust默认生成目录暂使用其标准忽略路径，属于可重建构建产物，不放业务数据库或密钥；数据仍在应用私有目录。iOS初始化自动安装xcodegen及设备工具，遇Homebrew证书依赖链接冲突后未强制覆盖；使用已存在的OpenSSL/证书和已安装依赖完成设备工具安装，并验证idevice_id 1.4.0可运行。此环境处理不作为用户构建命令模板。

构建应共用一次前端产物，再顺序构建双端（后续传`--config '{"build":{"beforeBuildCommand":""}}'`跳过重复前端），避免同时写SvelteKit输出。Xcode脚本显式发现rustup stable的rustc；生成缓存、JNI动态库链接及DerivedData不入Git。Tauri重复iOS打包可能因已有目标目录报错，保留旧app到仓库外备份后重建，不删除历史产物。

初步验证：前端check零错误、34项Node测试及60项macOS Rust测试通过；主程序Android APK与iOS模拟器app构建成功。iOS实际包预检、权限确认和安装入口通过。真实WebView发现全局overflow:hidden使插件页无法滚动，已修正为页内独立滚动；完整保存/提醒/生命周期矩阵仍需复跑，不以构建成功代替。
