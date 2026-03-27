# Syncthing 同步配置（desk_tidy_sticky）

## 目标与范围
- 目标：使用 Syncthing 在多台设备间同步项目源码，同时避免同步大型构建产物与临时文件。
- 范围：仅包含项目源码与必要配置文件，构建产物在各设备本地生成。

## 已配置的仓库侧文件
- 根目录新增 `.stignore`：
  - 规则来源：`.gitignore` + `src-tauri/.gitignore`
  - 目的：减少无效同步与冲突风险

### 重点忽略目录/文件（示例）
- `node_modules/`, `build/`, `.svelte-kit/`, `src-tauri/target/`, `src-tauri/gen/schemas/`
- 日志与临时文件：`*.log`, `check_output_*.txt`
- 本机与 IDE 产物：`.DS_Store`, `Thumbs.db`, `Desktop.ini`, `.vscode/*`

## 你需要手动完成的步骤（最小路径）
1. 启动 Syncthing（任意版本均可，建议保持常驻）。
2. 在 Syncthing GUI 添加设备：互相输入 Device ID 并完成配对。
3. 添加文件夹（本机）：
   - Folder Path: `/Users/sunqin/study/language/rust/code/desk_tidy_sticky`
   - Folder ID: `desk_tidy_sticky`（建议保持统一）
   - Folder Type: `Send Only`
   - File Ignore Patterns: `Enabled`（默认开启，自动读取 `.stignore`）
4. 在其他设备接受共享：
   - 选择本机路径
   - 确认 Folder ID 一致
   - Folder Type: `Receive Only`（与本机的 `Send Only` 对应）
5. 等待初次同步完成。

## 使用注意
- 被忽略的构建产物需要在各设备本地生成：
  - 前端依赖：在各设备执行 `pnpm install`（或 `npm install`）
  - Rust/Tauri：在各设备执行对应构建命令
- 如需同步被忽略内容，必须修改根目录 `.stignore`，并重新触发同步。
- `.stignore` 文件**不会被 Syncthing 同步**，因此每台设备都需要自己的 `.stignore`。
  - 可选方案：使用 `#include` 引入一个会被同步的共享忽略文件（例如 `.stignore-shared`），但仍需要每台设备的 `.stignore` 作为入口。

## 回归验证（建议）
1. 在任一设备新建文件 `tmp/syncthing-smoke.txt`（完成后可删除）。
2. 其他设备确认文件出现。
3. 删除该文件，确认删除同步。
