# Workspace 专注页崩溃：phaseLabel 读取 undefined

## 现象
- 控制台报错：
  - `Uncaught TypeError: Cannot read properties of undefined (reading 'pomodoroFocus')`
  - 位置：`focus-runtime.js -> phaseLabel`
- 结果：工作台主内容区不渲染，看起来像“内容全没了 / 样式坏了”。

## 根因
- `phaseLabel(phase, strings)` 在字符串对象瞬时未就绪（初始化/热更新时）时，直接访问 `strings.pomodoroFocus`，触发运行时异常。
- 异常发生在渲染链路内，导致整个 focus 主区域中断。

## 修复
- 文件：`src/lib/workspace/focus/focus-runtime.js`
- 处理：
  - 为 `strings` 增加安全兜底对象。
  - 为三种阶段文案增加英文 fallback：
    - `Focus`
    - `Short break`
    - `Long break`

## 验证
- 执行：`npm run check`
- 结果：`0 errors, 0 warnings`

## 说明
- 这次是稳定性防御修复，不会改变正常情况下的中英文文案显示。
