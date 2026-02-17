# Markdown 标题扩展：支持 H1-H6

## 背景
用户反馈当前 Markdown 标题仅支持到 `h3`，输入 `####` 到 `######` 时不会被解析成标题。

## 根因
渲染器 `src/lib/markdown/renderer.js` 中标题正则只匹配 `#{1,3}`，并且段落收集停止条件也只识别到 `h3`。

## 修复方案
1. 标题解析规则从 `#{1,3}` 扩展到 `#{1,6}`。
2. 段落收集停止条件同步扩展到 `#{1,6}`，避免 `h4-h6` 被错误并入段落。
3. 预览样式补齐 `h4-h6`，避免解析后样式缺失：
   - `src/lib/components/note/NotePreview.svelte`
   - `src/lib/components/workspace/WorkspaceNoteInspector.svelte`

## 影响范围
- `src/lib/markdown/renderer.js`
- `src/lib/components/note/NotePreview.svelte`
- `src/lib/components/workspace/WorkspaceNoteInspector.svelte`

## 验证建议
1. 在便笺或工作台详情中输入：
   - `# H1`
   - `## H2`
   - `### H3`
   - `#### H4`
   - `##### H5`
   - `###### H6`
2. 确认全部按标题渲染，且字号层级递减。
3. 复测普通段落、列表、代码块不受影响。
