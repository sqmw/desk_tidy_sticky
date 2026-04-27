# Windows 贴纸编辑退出后底部逐次轻微变长（2026-04-27）

## 背景

- 用户反馈：Windows 上贴纸进入编辑态再退出后，窗口能正常收回，但底部会每次多长一点点。
- 现象特征：
  - 只发生在 Windows；
  - 顶部位置不变；
  - 每次只是底部向下多出约 1px 级别；
  - 多次进入/退出编辑后会逐渐累积。

## 判定

- 类型：`Bug / 回归`
- 最短依据：
  - 顶层贴纸在编辑/控制态之间会通过 `syncWindowHeightForOutsideToolbar()` 主动调整窗口高度；
  - 退出后虽然能收起，但展开态期间 Windows 回报的轻微舍入高度被继续写回成新的基础收起高度；
  - 这是基础高度在展开态被漂移污染，不是编辑态没有退出。

## 根因

文件：`src/routes/note/[id]/+page.svelte`

原逻辑问题：

1. 外置工具栏展开/收回时，会主动调用 `resizeWindowHeight(...)`；
2. Windows 会在这类程序化 resize 后回报带轻微舍入误差的 `innerHeight`；
3. 原逻辑在贴纸处于展开态时，`handleViewportResize()` 仍会持续执行：
   - `collapsedWindowHeight = currentHeight - reserve`
4. 这意味着即便只是工具栏导致的内部高度变化，Windows 返回的 1px 级误差也会被写回基础收起高度；
5. 下一轮展开/收回再以这个污染后的基础高度计算，导致底部逐步累积变长。

## 修复方案

思路：除了区分“工具栏驱动的内部 resize”和“用户真实调整窗口尺寸”，还要停止在展开态持续回写基础收起高度。

新增状态：

- `toolbarManagedResizeTargetHeight`
- `toolbarManagedResizeHoldUntil`

策略：

1. 当因为外置工具栏而触发程序化 `setSize` 时：
   - 记录目标高度；
   - 短时间标记为“toolbar managed resize”。
2. 在 `handleWindowResizePersistence()` 中：
   - 如果当前 `resize` 属于这次内部工具栏调整，则跳过：
     - `handleViewportResize()`
     - `scheduleWindowSizePersist()`
3. 在 `handleViewportResize()` 中：
   - 当贴纸处于展开态时，不再持续执行 `collapsedWindowHeight = currentHeight - reserve`
   - 也就是不再信任 Windows 在展开态实时回报的高度作为新的基础高度
4. 只有真正属于用户手动调整窗口大小且当前不在工具栏展开态时，才允许更新：
   - `collapsedWindowHeight`
   - 持久化尺寸

## 结果

- 工具栏展开/收起不再污染基础窗口高度。
- Windows 下反复进入/退出编辑态后，底部不会再出现 1px 级累计增长。
- 用户手动调整窗口尺寸的行为保持原样，仍会正常持久化。

## 验证

### 静态验证

```bash
pnpm -s check
```

### 手动回归建议

1. 在 Windows 打开一张顶层贴纸。
2. 连续执行多次：
   - 进入编辑态
   - 退出编辑态
3. 观察窗口底部是否仍然逐次轻微变长。
4. 再手动拖动窗口高度，确认手动改尺寸仍可正常生效并保持。
