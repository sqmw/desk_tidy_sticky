# 四象限拖拽：50% 覆盖触发占位 + 取消回弹（2026-02-10）

## 问题
1. 拖拽过程中占位切换不符合直觉。  
2. 松手后先回原位，再跳到目标位（回弹感）。

## 修复
1. 50% 覆盖触发
- 以拖拽卡片与目标卡片的垂直重叠比作为主判据：
  - `overlapRatio = overlapHeight / targetCardHeight`
  - 当 `overlapRatio >= 0.5` 时，认为进入该区域，按拖拽卡中心在目标卡上/下半区决定插入前后。
- 未达到 50% 时回退到中线判据。

2. 消除回弹
- 修复 `persistReorderedVisible` 的视图识别：
  - `quadrant/todo` 与 `active` 同组处理（`!archived && !deleted`）。
- 这样四象限拖拽后会先本地即时重排，再异步持久化，不会先回原位。

## 影响文件
- `src/lib/components/panel/WorkbenchSection.svelte`
- `src/lib/panel/use-note-commands.js`

## 验证
- `npm run check` 通过（0 error / 0 warning）。
