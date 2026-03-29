# 2026-03-29 Flutter 笔记历史提交兼容审计

## 判定
- 类型：`Bug或回归`
- 最短依据：
  - 旧 Flutter 分支中，`Note` 的 JSON 字段是逐步演进的。
  - 兼容层若只按当前 Tauri `Note` 严格反序列化，会跳过早期字段不全的旧笔记条目，导致“只能读到部分旧笔记”。

## 审计范围
- 分支：`origin/dev-flutter`
- 文件：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/lib/models/note_model.dart`（历史版本）
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/lib/services/notes_service.dart`（历史版本）

## 关键提交结论

1. `912b0ed`（最早）
- `Note` 只包含：`id/text/createdAt/updatedAt/isPinned/isArchived/isDone/x/y/width/height`
- 不包含：`isDeleted/isAlwaysOnTop/customOrder`

2. `de09973`
- 新增：`customOrder`
- 仍不包含：`isDeleted/isAlwaysOnTop`

3. `1f8c5d4`
- 新增：`isDeleted`
- 仍不包含：`isAlwaysOnTop`

4. `48fb9fe` 及后续（含 `96d22c0`、`50946ef`）
- 才补齐：`isAlwaysOnTop`

## 存储路径结论
- `notes_service.dart` 历史实现一直使用：
  - `getApplicationSupportDirectory()`
  - `parent/desk_tidy_sticky/notes.json`
- 在 Windows 上，`ApplicationSupportDirectory` 的具体中间层目录可能受运行时/安装信息影响，所以旧路径可能落在：
  - `%APPDATA%\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%\\<company>\\desk_tidy_sticky\\notes.json`
  - `%LOCALAPPDATA%\\...\\desk_tidy_sticky\\notes.json`

## 当前修复策略（已落地）
- 路径层：
  - 不再只尝试单一路径，改为扫描一组 Windows 旧路径候选并逐个读取。
- 数据层：
  - 不再对旧条目做严格结构反序列化。
  - 改为“best-effort”映射：缺失字段使用默认值，坏条目跳过，其他条目继续导入。
  - 如果旧条目缺少 `id`，会用内容和时间字段生成稳定哈希 UUID，防止反复导入重复。
  - 合并完成后会按稳定签名去重，修复因历史导入产生的重复笔记。
- 安全层：
  - 旧路径读取失败只记日志，不影响当前 Tauri 笔记加载。
  - 合并后回写当前路径时，保留原子写和 Windows 覆盖兜底。

## 风险边界
- 对“已经损坏且无法解析”的旧条目，仍无法恢复其内容；系统只会跳过，不会影响其余正常条目。
- 若历史数据被用户手工改写为非 JSON 或非数组结构，仅支持：
  - 顶层数组
  - 顶层对象且 `notes` 字段为数组

## 回归验证建议（Windows）
1. 准备一个早期字段版本的旧 `notes.json`（缺少 `isDeleted/isAlwaysOnTop`）。
2. 同时保留当前 Tauri 路径 `notes.json`。
3. 启动 Tauri。
4. 预期：
   - 旧条目不再因为缺字段被整批跳过。
   - 当前与旧版笔记按 `id` 合并展示。
   - 当前路径回写为合并后的集合。
