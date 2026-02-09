# 2026-02-09 块编辑器 MVP（Notion/Anytype 方向）

## 目标
将贴纸编辑体验从“整块 textarea”升级为“块级编辑”，降低 Markdown 语法负担。

## 核心能力
1. 块模型
 - 段落、H1/H2/H3、Todo、Bullet、Quote、Code
2. `/` 命令
 - 在块开头输入 `/` 弹出类型面板
 - 支持键盘上下选择与回车确认
3. 键盘行为
 - `Enter`：拆分当前块并新建下一块
 - 空块下 `Enter`：从特殊块退回段落
 - `Backspace` 在行首：与上一块合并或退回段落
4. Todo 交互
 - 支持勾选状态并回写 Markdown
5. 图片粘贴
 - 在块编辑输入区直接粘贴图片
 - 走后端本地落盘（assets）并插入 `asset` URL Markdown
6. 块排序与快速新增
 - 通过左侧拖拽手柄重排块顺序
 - 每块提供 `+` 快捷插入下一空段落块
 - 支持 `Alt + ArrowUp / Alt + ArrowDown` 键盘快速上移/下移当前块
7. 单画布所见即所得编辑
 - `blocks` 模式使用 `contenteditable` 块输入，而不是 `textarea + 旁路预览`
 - 视觉和交互更接近 Notion/Anytype 的同屏编辑心智
8. Markdown 快捷输入自动转块
 - 在段落块输入 `# ` / `## ` / `### ` 自动转标题块
 - 输入 `- ` 或 `* ` 自动转 bullet 块
 - 输入 `> ` 自动转 quote 块
 - 输入 `[] ` / `[ ] ` / `[x] ` 自动转 todo 块
 - 输入 `\`\`\` `（三个反引号后接空格）自动转 code 块

## 架构拆分
1. 块模型文件：`src/lib/note/block-model.js`
 - `parseMarkdownToBlocks(markdown)`
 - `blocksToMarkdown(blocks)`
 - `filterBlockCommands(query)`
2. 块编辑组件：`src/lib/components/note/BlockEditor.svelte`
 - 负责块级输入与 `/` 命令交互（`contenteditable`）
3. 页面接线：`src/routes/note/[id]/+page.svelte`
 - 双模式切换：`blocks/source`
 - 保存防抖与窗口逻辑保持不变
4. 块操作抽象：`src/lib/note/block-ops.js`
 - 统一承载拆分、合并、重排、插入等列表操作逻辑
5. 光标工具抽象：`src/lib/note/contenteditable-caret.js`
 - 统一处理 `contenteditable` 的选区偏移读取与恢复
6. 快捷输入解析：`src/lib/note/block-shortcuts.js`
 - 统一管理 Markdown 快捷语法匹配，避免散落在视图层

## 设计说明
1. 块编辑与源码模式可随时切换，避免学习成本陡增。
2. 先保证单层块结构稳定，后续再扩展拖拽重排与嵌套块。
3. 通过模块拆分降低 `+page.svelte` 和块编辑组件膨胀风险。
