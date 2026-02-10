# Workstation 四象限拖拽 `each_key_duplicate` 修复（2026-02-10）

## 问题
- 拖拽结束后出现：
  - `each_key_duplicate`
  - 同一 `note.id` 在同一象限列表内重复，导致渲染崩溃。

## 根因
- 同象限重排时直接对全量 `renderedNotes` 进行锚点插入，边界情况下会产生错误合并。
- Pointer 结束事件存在重入风险，可能触发重复落位。

## 修复
1. 同象限重排改为“象限内重排”
- 先抽取当前象限列表重排，再回写到全量列表对应位置，避免跨象限污染。

2. 落位写入前去重
- 以 `note.id` 做去重保护，避免重复 key 进入渲染层。

3. 防重入
- 增加 `dropInFlight`，一次拖拽只允许一次落位提交。

4. 渲染层容错
- `quadrantNotes` 返回前按 `id` 去重，防止异常状态再次触发 Svelte keyed 崩溃。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
