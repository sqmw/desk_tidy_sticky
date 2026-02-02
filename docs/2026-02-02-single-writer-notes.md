# Notes 单写入者（Single Writer）架构

## 目标
- 解决多进程（panel / overlay / note-window）同时读写 `notes.json` 时的“脏数据回写”问题：
  - A 进程把某贴纸取消钉住并写盘成功；
  - B 进程仍持有旧缓存（isPinned=true），随后做任意写操作，把旧状态又写回盘；
  - 结果表现为“已取消钉住的贴纸又冒出来”。

## 核心思路
- **panel 进程是唯一写入者（source of truth）**：
  - 只有 panel 进程执行 Notes 的落盘写操作；
  - 其他窗口进程（overlay / note-window）只发送“命令”，不直接写盘。
- panel 写入完成后再广播刷新/关闭通知，各窗口只负责渲染与本地交互。

这相当于：
- Command：用命令表达“我要做什么”（toggle pin / delete / update text ...）
- Observer：panel 写入后通知其他窗口刷新
- Single Source of Truth：状态在 panel 进程内统一收敛

## 代码结构
- 命令模型：`lib/models/notes_command.dart`
  - `NotesCommandType` + `NotesCommand`（带 `v` 版本号，便于后续扩展兼容）
- 客户端分发器（非 panel 进程使用）：`lib/services/notes_command_dispatcher.dart`
  - 通过 `WindowMessageService.sendToPrimaryPanel('notes_command', ...)` 发送命令
  - 如果 panel 不可用，降级为本地直接写盘（best-effort fallback）
- panel 侧处理器：`lib/services/notes_command_handler.dart`
  - 执行真实写入
  - 返回 `NotesCommandResult` 指定是否需要刷新 panel/overlay/note-window，或关闭特定 note-window
- 路由与广播：`lib/services/window_message_service.dart`
  - 仅当 `scope == 'panel'` 时处理 `notes_command`
  - 写入完成后按需发送 `refresh_notes` / `close_overlay`

## 命令协议（IPC Method）
- method：`notes_command`
- args（Map）：
  - `v`: 1
  - `type`: `toggle_pin` / `toggle_done` / `toggle_z_order` / `delete_note` / `update_text` / `update_position`
  - `noteId`: string
  - `text`: string?（update_text）
  - `x`, `y`: number?（update_position）

## 为什么不用“每个进程共享一份内存状态”？
- `desktop_multi_window` 的模式是多进程/多 engine：每个窗口进程都有自己的内存空间，默认做不到“天然共享同一份内存对象”。
- 因此要么：
  - 选择 **单写入者**（本方案，最稳、维护成本最低）；要么
  - 做强一致的并发控制（锁 + revision/CAS/数据库事务）；要么
  - 做 Windows 共享内存 + mutex（成本高）。

## 手动验证
1. 在主面板取消钉住贴纸 A，确认 A 窗口关闭。
2. 在贴纸 B 窗口点击“完成/置顶”等任意写操作。
3. A 不会再次复活；重启应用后 A 仍保持未钉住。

