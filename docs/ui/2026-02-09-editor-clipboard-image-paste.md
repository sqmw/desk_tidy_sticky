# 2026-02-09 贴纸编辑器剪贴板图片粘贴

## 问题
贴纸编辑态中，用户从系统剪贴板粘贴图片时无响应，无法快速插入图片。

## 方案
在编辑器 `textarea` 上接入 `paste` 事件：
1. 识别 `clipboardData.items` 中的图片文件。
2. 将剪贴板图片传给后端命令 `save_clipboard_image`，落盘到本地 `assets` 目录。
3. 使用 `convertFileSrc` 转成可渲染 URL。
4. 在当前光标处插入 Markdown 图片语法：`![pasted-xxx](asset://...)`。
5. 插入后自动聚焦并恢复光标位置，触发保存防抖。

## 实现位置
- `src/routes/note/[id]/+page.svelte`
 - `onEditorPaste(event)`
 - `blobToBase64(blob)`
 - `textarea` 增加 `onpaste={onEditorPaste}`
- `src-tauri/src/notes_service.rs`
 - `save_clipboard_image(note_id, mime_type, data_base64)`：保存图片文件并返回绝对路径
- `src-tauri/src/lib.rs`
 - 暴露 `save_clipboard_image` Tauri command
- `src-tauri/tauri.conf.json`
 - `app.security.assetProtocol.enable = true`
 - `app.security.assetProtocol.scope = ["**"]`

## 体验收益
1. 支持截图工具和系统复制图片后的直接粘贴。
2. 不需要手动上传或输入图片链接。
3. 操作链路更短，符合快速记录场景。
4. 不再把图片内容直接塞进笔记文本，避免笔记 JSON 膨胀。

## 注意
1. 图片会保存到应用数据目录下的 `assets/YYYY/MM`。
2. 历史数据中的 `data:image...` 仍保持兼容渲染，不做破坏性迁移。
