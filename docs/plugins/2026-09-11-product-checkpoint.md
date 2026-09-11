# 课表v0.1产品接入检查点

代码提交：a30f4ed；基线：D-EXT-004。不是整批验收完成。

## 已实测

- 主仓库Tauri产品构建：Android arm64 debug APK、iOS arm64模拟器app均成功。主程序身份分别为com.desk_tidy.sticky / com.desk-tidy.sticky，不是Probe包名。
- 60项macOS Rust测试、34项Node前端测试、Svelte check零错误和前端生产构建通过。旧笔记/权限/数据安全测试保留。
- iOS主程序实际显示插件安装页，系统文件选择器选timetable.dtplugin，主程序预检通过，显示“课表0.1.0”和存储/提醒权限。勾选权限后安装成功，出现“已启用”、打开/停用/卸载及课表导入区。
- 系统重开产品构建后安装状态仍保留。此前旧页面不可滚动，已在插件页独立scroll容器修复并重建/重装；没有修改全局桌面overflow规则。

## 尚未完成与阻塞

最新iOS构建当前停在课程文件选择器，product-smoke-2.json可见；坐标点击反复返回noWindowsAvailable，激活与Window菜单选择当前窗口均未恢复。已请求用户点击一次该文件，不要求重新安装包。时间样例可能过期，恢复后要更新测试课程时间，不能把过期计划无通知算通过。

Android最新APK已构建，首次产品APK安装完成，dtplugin与JSON已复制到Download。CUA应用清单不含Android Emulator，按已知qemu路径选择返回Invalid app。用户明确选择手动完成Android操作，不使用ADB代点界面；之后只按用户结果与允许的只读日志核对，不以安装成功代替交互成功。

用户反馈iOS文件选择完成后的复核：产品仍显示“课表0.1.0已启用”，把课表JSON送入插件包入口的请求被正确拒绝，未损坏安装状态。原生state.json显示revision=1、data=null、notificationIds=[]，即尚未保存课表。CUA重置并按Simulator bundle ID重新绑定后，滚动仍返回noWindowsAvailable。当前需要在下方课表区域手动校验/保存，不再要求重新安装包；旧近期样例的提醒时间已过，不能据此判断通知成功或失败。

因此产品内“显示课程→保存→重开→后台提醒→修改/停用取消→卸载”双端矩阵未完成；Probe的成功不能补作产品证据。当前不交付为完整可用版本、不开放任意第三方。

## 实现/安全自审

按完整包字节摘要验证，不信任包自报ID；预检/安装/打开均检查。包换行由gitattributes固定，防止跨平台checkout改变摘要。Worker只加载已批准源码，UI不注入插件HTML；这仍不是任意代码硬内存隔离保证。

数据独立保存于Tauri app_data_dir的plugins-v01/state.json，native窗口来源、状态版本及enabled在锁内校验；生命周期取消宿主分配的通知ID，插件不提供系统ID。原生移动通知调用放到异步命令执行，避免阻塞WebView线程。取消/保存失败会显示错误或未生效状态，不隐瞒跨系统非原子边界。

限制：只允许当前审查过的官方包；v0.1时区Asia/Shanghai/UTC、最多32条未来提醒；桌面定时提醒尚未接入。升级/任意第三方/复杂同步没有借此放行。

本机安装版及其真实笔记未修改。iOS旧构建app已移到仓库外previous-builds目录保留，未删除历史产物。生成工程缓存/密钥/JNI链接/DerivedData不入Git。
