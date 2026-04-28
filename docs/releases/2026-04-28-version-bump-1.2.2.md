# 版本号更新到 1.2.2

## 背景

准备发布 `1.2.2` 时，需要统一前端包信息、Tauri 应用配置与 Rust 包版本，避免打包产物、安装信息和仓库元数据不一致。

## 本轮修改

已统一更新以下版本号入口：

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

## 说明

- 本次仅调整版本号，不包含功能行为变化。
- `pnpm-lock.yaml` 当前不记录项目自身版本号，因此无需修改。
- 若后续执行正式打包，应用包信息应显示为 `1.2.2`。
