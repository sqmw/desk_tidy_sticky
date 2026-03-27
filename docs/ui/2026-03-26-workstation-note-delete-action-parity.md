# 2026-03-26 Workstation 笔记删除入口补齐

## 判定

- 类型：Bug/回归
- 结论：`workstation` 内笔记卡片缺少删除入口，不是设计行为

## 问题

当前项目存在两类笔记使用场景：

1. 简洁模式面板
2. workstation 模式

其中 workstation 模式下又有至少两种笔记视图：

1. 普通卡片网格
2. 四象限卡片

问题在于：

- 回收站视图有删除能力
- 其他工作台笔记卡片没有暴露删除按钮
- 导致 workstation 内笔记能力与其他视图不一致

## 根因

文件：`src/lib/components/panel/WorkbenchSection.svelte`

普通工作台卡片与四象限卡片的操作栏只保留了：

- 编辑
- 完成/取消完成
- 标签/Q1~Q4
- 置顶/层级（部分视图）
- 归档

但没有把现有的 `deleteNote(note)` 暴露到 UI 上。

也就是说：

- 删除逻辑已经存在
- 只是 workstation 卡片操作栏漏挂了入口

## 修复

在 `WorkbenchSection` 中补齐删除按钮：

1. 四象限卡片操作栏新增 `删除`
2. 普通工作台卡片操作栏新增 `删除`
3. 继续复用现有 `deleteNote(note)`，不引入新的删除语义

说明：

- 非 `trash` 视图下，`deleteNote(note)` 仍走现有“删除到回收站”逻辑
- `trash` 视图下才是永久删除

## 涉及文件

- `src/lib/components/panel/WorkbenchSection.svelte`

## 回归验证

1. 在 workstation 普通卡片视图打开任意笔记卡片，操作栏应出现删除按钮
2. 在 workstation 四象限视图打开任意卡片，操作栏应出现删除按钮
3. 点击删除后，笔记应从当前视图消失并进入回收站
4. 回收站视图既有永久删除行为不受影响
