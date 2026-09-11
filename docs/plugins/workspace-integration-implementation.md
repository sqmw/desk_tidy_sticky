# 主窗口插件接入 · 实施与验证

日期：2026-09-11；Task：T-PLUGIN-HOST@v1 / S5；Execution：E-003。设计合同见[主窗口接入方案v1](workspace-integration-plan.md)，真实任务状态只在[TODO](../TODO.md#t-plugin-host)与[STEPS](../STEPS.md#t-plugin-host)。

## 实现边界

- 工作台侧栏「插件」「课表」切换现有内容区，使用当前栏目高亮；不再调用`openPluginsWindow`。安装、停用/卸载和放弃导入使用原生HTML dialog（窗内模态层），不创建Tauri业务窗口。
- 笔记面板保留挂载；隐藏时`inert`且停止失焦提交，当前笔记身份、编辑稿、快速输入和DOM内位置保留。鼠标点击导航不会先触发失焦保存；正常键盘移出焦点触发的已有保存会被等待，失败或冲突时不导航。
- 导航串行，目标原生状态查询前后均核对离开条件，避免查询期间新保存与切页竞争。偏好恢复也经同一入口，不直接关闭编辑器。
- 课表首次打开才创建Worker；正常切页保留查看日期与实例，未确认导入需继续/放弃确认；停用或卸载释放实例。安装状态始终回源Rust，事件只提供刷新提示，失效课表入口回管理页。
- 已保存数据、包摘要白名单、外部JS代码/Worker边界、Rust命令权限及提醒接口未改。旧`/plugins`页面和`open-window.js`保留兼容，不关闭用户旧窗口；本批单实例保证针对工作台面板，不声称强制结束旧兼容窗口的所有实例。
- 工作台插件面板不使用整页`100dvh`外壳，独立滚动且复用工作台主题变量，不给主程序增加重复品牌栏。

## 代码与测试导航

| 入口 | 职责/依赖 |
| --- | --- |
| `src/lib/workspace/navigation-guard.js` | 导航互斥、异步目标解析前后离开检查，不自行保存或清空草稿 |
| `src/lib/note/text-commit.js` | single-flight保存增加只等待现有操作的`wait`入口 |
| `src/lib/components/note/BlockNoteContent.svelte` | 导出等待保存接口；不活动时跳过失焦提交 |
| `src/lib/components/workspace/WorkspaceNoteInspector.svelte` / `WorkspaceNotesPane.svelte` | 逐层提供`canNavigate`，冲突/保存失败不放行 |
| `src/routes/workspace/+page.svelte` | 保留笔记面板状态，装配导航守卫与插件面板；核心业务仍在子模块 |
| `src/lib/plugins/WorkspacePluginPanel.svelte` | 管理/课表承载、状态回源、生命周期、导入离开确认 |
| `src/lib/plugins/WorkspacePluginLinks.svelte` / `src/lib/workspace/workspace-tabs.js` | 工作台导航回调、高亮、插件栏目规范化；不建新窗口 |
| `src/lib/plugins/PluginDialog.svelte` | 当前窗口内模态确认、Escape、显式Tab/Shift+Tab焦点循环及关闭后恢复 |
| `PluginManager.svelte` / `TimetablePage.svelte` / `product.css`（同目录） | 复用安装/业务页面，活动状态通知与可嵌入主题样式 |
| `tests/frontend/workspace-navigation.test.js` | 保存失败拒绝导航、只等待不主动保存、目标查询期间重新检查 |
| `scripts/tests/plugin-product-dom.mjs` | 原独立页回归加实际Sidebar/NotesPane/PluginPanel和生产导航守卫的组装回归；不是完整Tauri启动模拟 |

## 实测证据

- `pnpm check`：0错误/0警告；`pnpm test:frontend`：40项通过。
- `pnpm test:browser`：六条原编辑器真实DOM回归通过，含关闭前提交、失败保留、重试、外部更新及结构编辑成功/失败。
- `pnpm test:plugins:browser`：原五组插件交互及新增同窗口组装回归通过；真实外部JS Worker运行，原生IPC使用替身。验证草稿/快速输入往返不隐式保存；移焦保存失败不切页、重试后可进入；日期保持、导入离开确认/Escape；切换后Worker数量1、停用后0、旧入口回管理页。亮暗主题截图人工检查；测试fixture使用产品主题变量，不把测试壳固定浅色底误当产品暗色缺陷。
- Mac原生隔离构建通过。同一`Desk Tidy Workspace`窗口中实测侧栏切换、快速输入保留、插件包权限确认、安装状态、JSON原生文件选择器导入、完整预览、保存、线性代数08:00–09:40/教学楼203显示；停用后课表入口消失。重新启用、退出并重启后课表数据保留；深色主题下课程可读。
- 原生独立测试profile最终状态：revision5，enabled=true，data.id=`semester-2026-autumn`，1门课程，notificationIds与桌面队列均为空。没有把取消后的启用说明成提醒已自动恢复，也没有测试系统提醒实际弹出。
- 文件选择器曾在已选中时短暂禁用Open，刷新后可用并成功导入；保留该过程，不归因为已证实的应用Bug。首轮失败保存测试误用Tab（编辑器将其作为缩进），已改为实际移焦；纠正后通过，未放宽产品断言。

## Review、恢复与剩余边界

- Review检查了草稿所有权、隐藏交互、导航与保存竞态、失效入口、重复Worker、模态错误反馈与兼容路由。新增目标查询后再次检查离开条件；修正Svelte响应式警告、测试Node类型范围及主题fixture。
- 补测发现原生HTML dialog在末项Tab后可把焦点移到浏览器外部，不满足本方案的明确圈定要求；已增加Tab/Shift+Tab首尾循环并保留失败记录，未放宽断言。
- 纯前端接入，无Rust源码/数据格式变更；既有未提交原生通知适配、开发隔离配置和Android修正保留，不混入本次提交。Mac本机验证构建会包含这些既有工作区改动，不把本批前端提交宣称为它们的独立发布审查。
- 本次构建使用不同于已运行开发版的测试应用标识（后缀`.workspace-test`），以已有isolated-dev特性和`DESK_TIDY_DEV_DATA_DIR`指向系统缓存新建目录（前缀`DeskTidySticky-Product/workspace-plugin`）。只预设测试偏好，安装/课表数据来自真实UI。仅重启本次测试应用；安装版和之前开发版未替换、未结束。测试数据/产物保留，业务数据不进入同步仓库。
- 恢复仅在获得撤销授权后反向应用本次前端提交；旧路由保留，无数据库回迁。退出进程后恢复未保存笔记草稿不在本批承诺内；旧原生提醒生命周期文案、长周期提醒、学校专用格式、移动端和任意第三方安全门仍归原任务，未被本次UI验收关闭。
