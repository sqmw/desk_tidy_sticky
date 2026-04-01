# 2026-03-29 Flutter 旧版笔记兼容与渐进迁移

## 判定
- 类型：`设计调整`
- 触发原因：
  1. 当前 Tauri 版笔记只读取自己的 `notes.json` 路径。
  2. Flutter 旧版已经废弃，但仍有存量用户数据。
  3. 继续要求主笔记模块长期理解 Flutter 旧存储细节，会抬高耦合度；更合理的方式是做一个单独的旧版兼容层，只在读盘入口接一次。

## 目标
- 读取当前 Tauri 笔记时，同时兼容 Flutter 旧版 `notes.json`。
- 所有新的增删改统一落到当前 Tauri 路径。
- 对旧 Flutter 数据采用“访问即迁移 + 小批量增量补齐”，避免首次启动全量硬迁。

## 当前实现

### 独立兼容模块
- 新增：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/note_compat.rs`
- 责任：
  - 查找 Flutter 旧版候选路径
  - 读取旧版 `notes.json`
  - 不参与笔记增删改命令，不进入主业务排序/过滤逻辑

### 旧版候选路径
- 当前兼容层已收窄为仅处理 Windows 旧版路径。
- 候选路径：
  - `%APPDATA%\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%\\com.example\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%\\com.sqmw\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%\\sqmw\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%\\..\\desk_tidy_sticky\\notes.json`
  - `%LOCALAPPDATA%\\desk_tidy_sticky\\notes.json`
  - `%LOCALAPPDATA%\\com.example\\desk_tidy_sticky\\notes.json`
  - `%LOCALAPPDATA%\\com.sqmw\\desk_tidy_sticky\\notes.json`
  - `%LOCALAPPDATA%\\sqmw\\desk_tidy_sticky\\notes.json`
  - `%APPDATA%` 与 `%LOCALAPPDATA%` 下一层目录的 `*/desk_tidy_sticky/notes.json`（扫描）

这样做的原因：
- Flutter 旧版只发布过 Windows 版本。
- Flutter 旧版 `NotesService` 的存储逻辑是基于 `ApplicationSupportDirectory.parent/desk_tidy_sticky/notes.json`。
- 真实 Windows 环境里 `APPDATA / LOCALAPPDATA` 的差异会导致旧数据位置不完全一致，所以需要同时兜住。
- Flutter 历史版本 `Note` 字段是逐步演进的，详见：
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/migration/2026-03-29-flutter-notes-history-audit.md`

## 接线位置
- 修改：`/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/notes_service.rs`

### 新规则
1. 读取阶段
   - 先读当前 Tauri 路径下的 `notes.json`。
   - 再扫描所有 Flutter 旧版候选 `notes.json`。
   - 返回给前端的结果仍是“当前 Tauri + 旧 Flutter”的合并视图，保证旧数据继续可见。
2. 旧文件里的单条坏数据不会拖垮整份旧文件：
   - 兼容层逐条反序列化
   - 缺失新字段（如 `isDeleted` / `isAlwaysOnTop`）会按默认值补齐
   - 若旧条目缺少 `id`，会使用内容与时间字段生成稳定的哈希 UUID，避免多次导入产生重复笔记
   - 仍无法解析的条目会被跳过，其余条目继续导入
3. 合并视图会做一次稳定去重：
   - 去重键基于文本、创建/更新时间、位置尺寸与状态字段
   - 避免旧条目缺少 `id` 时反复导入导致数量无限增长
4. 访问即迁移
   - 如果用户编辑、移动、改色、置顶、归档、删除某条仍停留在旧 Flutter 文件里的笔记：
     1. 先把这一条写入当前 Tauri `notes.json`
     2. 回读校验新文件中确实存在该笔记
     3. 成功后再从旧 Flutter 文件中删除该条
   - 这样保证“先写新、后删旧”，避免中途失败导致旧数据丢失。
5. 小批量增量迁移
   - 每次加载笔记时，会额外尝试迁移一小批旧 Flutter 笔记到当前 Tauri 文件。
   - 当前批量大小为 `12` 条，目的是逐步收敛旧数据，而不是首次启动一次性搬空。
6. 若所有旧路径都未命中或都不可读：
   - 直接返回当前笔记集合
7. 两边都没有数据：
   - 返回空数组

## 耦合控制
- Flutter 兼容逻辑只依赖：
  - `Note`
  - 文件路径
  - JSON 读取
- 主笔记服务仍只暴露当前 `Note` 模型，不让 Flutter 特有概念渗透到命令层。
- 兼容层保留“可读旧数据”的能力，但写路径统一收敛到当前 Tauri 存储。

## 风险与边界
- 当前策略会优先保留当前 Tauri 笔记，再把旧版笔记补进来，不会用旧版覆盖已有当前笔记。
- 合并依据是 `note.id`；若两边恰好存在同 id 数据，默认当前 Tauri 版本优先。
- 兼容前提是 Flutter 旧版 JSON 结构仍能反序列化到当前 `Note` 模型；就当前分支比对，核心字段是兼容的。
- 兼容层现在是“best-effort read + gradual migrate”：
  - 旧路径不存在、旧文件损坏、旧文件里只有部分条目损坏，都不应该影响当前 Tauri 笔记加载。

## 回归验证
1. 保留当前 Tauri 路径下的 `notes.json`
2. 保留 Flutter 旧路径下的 `notes.json`
3. 启动 Tauri 版本
4. 预期：
   - 当前笔记和旧版笔记都会被读取出来
   - 首次加载不会强制一次性清空旧 Flutter 文件
   - 修改某条旧笔记后，该条会写入当前 Tauri 路径，并从旧 Flutter 文件中删除
   - 多次打开或操作后，旧 Flutter 数据会按小批量逐步迁移完
