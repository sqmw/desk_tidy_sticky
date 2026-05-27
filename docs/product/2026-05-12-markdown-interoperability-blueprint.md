# Markdown 互操作蓝图（2026-05-12）

日期：2026-05-12  
范围：`notes / review -> import / export / storage-root`  
状态：进行中（`storage root`、首版 Markdown 导出 / 导入、首版附件搬运已落地）  
优先级：高

关联文档：

- [回顾 Tab / 已办记录 MVP TODO（2026-05-08）](/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/product/2026-05-08-review-tab-mvp-todo.md)
- [回顾页下一阶段：检索、关联与洞察蓝图（2026-05-11）](/Users/sunqin/study/language/rust/code/desk_tidy_sticky/docs/product/2026-05-11-review-retrieval-association-insight-blueprint.md)

---

## 1. 结论

当前互操作能力的正式方向是：

> `Desk Tidy Sticky` 第一版只做 `Markdown-first` 的导入 / 导出与目录共存，不做格式转换，不做重型第三方双向同步。

换句话说：

1. 我们的内容主格式就是 `.md`
2. 用户可以把保存目录放到外部工具工作区里一起用
3. 我们优先保证 `Obsidian / Typora / Notion` 能直接消费 Markdown
4. 当前阶段不负责把各家私有语法、数据库结构或块语义互相转换

---

## 2. 背景与需求判断

这项能力不是可选增强，而是项目级必备能力。原因有三类：

1. 用户需要长期可迁移
   - 笔记和回顾记录都属于长期资产，不能锁死在应用内部。
2. 用户需要与外部工具协作
   - 典型对象包括 `Obsidian`、`Typora`、`Notion`。
3. 项目自身需要可持续
   - Markdown 是当前最稳的文本互操作基线，比私有格式更适合跨工具、跨版本、跨平台共存。

所以这里的目标不是“多支持几种导出格式”，而是：

1. 让用户放心把内容带走
2. 让用户能把现有 Markdown 内容带进来
3. 让保存位置可以直接与外部工具共存

---

## 3. 边界收紧

这一版必须明确不做下面这些事：

1. 不做 `JSON / CSV` 导入导出
2. 不做格式转换
   - 不负责把 Notion 专有块结构转换成 Obsidian 私有语法
   - 不负责把 Obsidian 私有语法转换成 Typora 样式
3. 不做第三方 API 双向同步
4. 不把某个外部工具的私有语法当成我们自己的主存储格式

这条边界的目的，是防止“互操作”从可控的 Markdown 路线，膨胀成一个难以收口的兼容工程。

---

## 4. 外部工具兼容判断

### 4.1 Obsidian

判断：

1. 最适合共存
2. 最适合作为“用户自定义保存目录”的目标

原因：

1. Obsidian Vault 本质就是文件夹
2. 核心内容就是 Markdown 文件
3. 用户可以直接把我们的保存目录指向 Vault 或其子目录

官方参考：

- [Obsidian：Import Markdown files](https://obsidian.md/help/import/markdown)

### 4.2 Typora

判断：

1. 非常适合消费我们导出的 Markdown
2. 非常适合作为“用别的软件继续编辑”的目标

原因：

1. Typora 本质上直接处理 Markdown 文件
2. 对标准 Markdown、图片引用、导出链都比较友好

官方参考：

- [Typora：Markdown Reference](https://support.typora.io/Markdown-Reference/)
- [Typora：Export](https://support.typora.io/Export/)

### 4.3 Notion

判断：

1. 适合作为“导入 / 导出对象之一”
2. 不适合作为我们的主语义锚点

原因：

1. Notion 支持 Markdown 导入导出
2. 但它并不是 Markdown 原生存储工具
3. 数据库、块、嵌套结构在导出时会带上它自己的限制

官方参考：

- [Notion：Import data into Notion](https://www.notion.com/help/import-data-into-notion)
- [Notion：Export your content](https://www.notion.com/help/export-your-content?slug=export-your-content)

---

## 5. 产品决策

### 5.1 主存储策略

当前建议正式定为：

1. 主存储格式：`Markdown`
2. 主工作目录：用户可配置
3. 内容组织：目录 + `.md` 文件 + 相对路径附件
4. 不把某个外部工具私有能力作为默认主格式

### 5.2 保存位置策略

用户需要能够：

1. 使用默认应用数据目录
2. 手动指定一个外部目录
3. 直接把目录指向 `Obsidian Vault` 或其子目录

这意味着后续实现必须支持：

1. 可配置 storage root
2. 路径合法性检查
3. 目录存在 / 不存在时的初始化策略
4. 相对路径附件组织

### 5.3 Markdown 语义策略

这一版建议统一使用：

1. `front matter`
2. 正文 Markdown
3. 相对路径附件引用

不建议：

1. 默认生成 `[[wikilink]]`
2. 默认生成 Obsidian 私有 callout
3. 默认生成依赖某个工具插件才能读懂的语法

我们可以做到“兼容它们”，但不应该做到“被它们绑死”。

---

## 6. 第一版能力矩阵

### 6.1 必做

1. Markdown 导出
   - 单篇笔记导出为 `.md`
   - 长文档导出为 `.md`
   - 回顾记录导出为 `.md`
2. Markdown 导入
   - 导入单个 `.md`
   - 导入目录中的 `.md`
3. 自定义保存目录
   - 支持用户把保存根目录设到外部目录
4. 最小字段映射
   - `title`
   - `body`
   - `tags`
   - `created_at`
   - `updated_at`
   - `completed_at`
   - `record_kind`

### 6.2 可以后补

1. 附件批量迁移
2. 冲突处理 UI
3. 导入预检报告
4. 外部目录实时监听

### 6.3 当前明确不做

1. Notion API 双向同步
2. Obsidian 插件化深度集成
3. Typora 专项适配层
4. 格式转换器

---

## 7. 目录与文件组织建议

第一版建议目录结构保持稳定、简单、可读：

```text
<storage-root>/
  notes/
  review/
  attachments/
```

说明：

1. `notes/`
   - 所有普通文档统一落在这里
   - 当前不再按“笔记 / 长文档”拆成两套存储目录
2. `review/`
   - 已办 / 回顾相关 Markdown 记录
3. `attachments/`
   - 图片和其他静态附件

这样做的收益是：

1. 外部工具容易读
2. 人类和 AI 都容易定位
3. 后续即使加导入 / 导出 UI，也不需要重写底层组织策略

---

## 8. 实现规格（一）：`storage root`

### 8.1 配置模型

第一版建议把保存根目录收成一个明确的两态模型：

1. `app_default`
   - 使用应用默认数据目录
   - 适合不关心文件落点的普通用户
2. `custom_directory`
   - 用户手动指定一个目录
   - 可以直接指向 `Obsidian Vault` 或其子目录

设计原则：

1. 配置项只记录“根目录”
2. 内部相对子目录结构固定推导，不让用户逐项配置 `notes / review / attachments`
3. 路径解析基准统一是 `storage root`
4. 不把机器专属绝对路径写进代码、模板或默认文档示例

建议的持久化结构：

```json
{
  "storage_mode": "app_default | custom_directory",
  "storage_root": "/user/chosen/path/or/null"
}
```

说明：

1. `Obsidian Vault` 不需要做成单独的存储模式
2. 它只是 `custom_directory` 的一种使用场景
3. 这样模型更稳，也更不容易把我们绑到某个外部工具上

### 8.2 初始化与回退策略

第一版需要明确下面 4 个行为：

1. 当 `storage root` 不存在时
   - 允许创建
2. 当目录存在但缺少子目录时
   - 自动补齐 `notes / review / attachments`
3. 当目录不可写时
   - 阻止切换并提示用户
4. 当外部目录后续不可用时
   - 保留原配置
   - 启动时提示不可访问
   - 不静默切回默认目录

原因：

1. 对外部工作区共存来说，路径稳定性比“偷偷兜底”更重要
2. 如果静默切目录，用户会误以为数据丢失

### 8.3 当前已落地

当前代码已经落地下面这组最小闭环：

1. 偏好模型新增：
   - `markdownStorageMode`
   - `markdownStorageRoot`
2. 后端新增专用命令：
   - `get_markdown_storage_snapshot`
   - `set_markdown_storage_preferences`
3. 设置页新增：
   - `存储与互操作` 区块
   - 存储模式切换
   - 自定义目录输入
   - 当前实际根目录与派生子目录预览
4. 应用保存路径时会自动补齐：
   - `notes / review / attachments`
5. 目录模型已按当前产品设计收口：
   - 普通笔记与长文档统一进入 `notes/`
   - 只额外区分 `review/`
6. 设置页已接入首版“导出 Markdown”
   - 当前会把所有非删除内容导出到 `notes/` 与 `review/`
   - 会把 Markdown 图片里的本地附件复制到 `attachments/`
   - 并把正文里的本地图片路径改写成相对路径
7. 设置页已接入首版“导入 Markdown”
   - 当前会扫描 `notes/` 与 `review/`
   - 带 `note_id` 的文件按已有 note 更新
   - 没有 `note_id` 的外部 Markdown 先按新增内容导入
   - 会把 Markdown 图片里的本地附件重新复制回应用资产目录
   - 并把正文里的图片路径改写成应用内可显示的 `file://` URL
8. 设置页已接入首版“导入预检与确认”
   - 导入前会先扫描 `notes/` 与 `review/`
   - 预先展示：扫描文件数 / 新增导入数 / 覆盖更新数 / 附件恢复数 / 缺少 `note_id` 的文件数
   - 用户确认后才真正写入

当前有意未做：

1. 原生目录选择器
2. 导出历史旧文件 / 旧附件清理
3. 更细粒度的冲突解决策略（当前仍只有预检提示，没有逐文件合并）

---

## 9. 实现规格（二）：文件命名与路径归类

### 9.1 文件命名规则

第一版建议文件名按“时间戳 + 稳定短 id”生成，保证可重复导出时路径稳定。

推荐形式：

```text
2026-05-12-152500-d604623f.md
2026-05-12-094000-a13f91b2.md
```

规则：

1. 以前缀时间保证排序稳定
2. 以后缀短 id 保证同一条内容重复导出时路径稳定
3. 文件名不依赖标题变化，避免标题修改后遗留旧文件
4. 标题的人类可读性由 front matter 承担，不强依赖文件名

原因：

1. 对 Obsidian、Typora、git 和跨平台同步都更稳
2. 减少空格、特殊符号和编码差异带来的兼容问题

### 9.2 路径归类规则

第一版建议按内容主语义落目录：

1. 普通短笔记 -> `notes/`
2. 长文档 -> `notes/`
3. 已办 / 回顾记录 -> `review/`
4. 附件 -> `attachments/`

当前不建议：

1. 不按标签建目录
2. 不按年月拆多层目录
3. 不按外部工具来源拆独立目录

原因：

1. 第一版要优先稳，而不是追求花哨组织
2. 目录规则越简单，越容易长期维护

当前首版限制：

1. 不会自动清理已删除或改名后的历史导出文件
2. 当前只处理 Markdown 图片语法 `![alt](src)` 的本地附件搬运
3. 没有 `note_id` 的外部 Markdown 文件，首版会按“新内容导入”处理，不做路径级去重
4. 首版导入后图片链接会被改写为应用内 `file://` 形式，而不是继续保留原始相对路径

---

## 10. 实现规格（三）：最小字段契约

建议第一版 front matter 先只收最稳定的一层：

```yaml
---
title: 论文精读 2 篇
tags:
  - 论文
  - 阅读
created_at: 2026-05-12T15:25:00+08:00
updated_at: 2026-05-12T15:40:00+08:00
completed_at: 2026-05-12T15:25:00+08:00
record_kind: review
source: desk_tidy_sticky
note_id: d604623f-9f78-4c5b-bac7-3b570a6e8f40
---
```

正文则保持为普通 Markdown。

设计原则：

1. 字段少而稳
2. 能支撑回放与检索
3. 缺字段时仍能只靠正文保底

字段约束：

1. `title`
   - 可空，但导出时尽量补齐
2. `tags`
   - 可空数组
3. `created_at`
   - 必须保留
4. `updated_at`
   - 必须保留
5. `completed_at`
   - 仅 `review` 相关记录需要
6. `record_kind`
   - 第一版枚举建议：
     - `note`
     - `review`
7. `source`
   - 默认写 `desk_tidy_sticky`
   - 后续导入外部文件时可改写成来源标识
8. `note_id`
   - 当前由 `Desk Tidy Sticky` 自己导出的文件会写入
   - 导入时优先用它做幂等更新

正文策略：

1. 正文保持纯 Markdown
2. 不再额外定义第二套私有块结构
3. 如果 front matter 已有 `title`，正文不强制重复写成 H1
4. 摘要、反思、错题等内容都先视为普通正文

这样最符合当前已经确认的边界：只做 Markdown，不做格式转换。

---

## 11. 实现规格（四）：导入 / 导出入口

### 11.1 第一版入口位置

第一版建议把入口放在 `workstation` 的设置相关区域，而不是散到每张卡片上。

推荐入口：

1. `设置 -> 存储与互操作`
   - 配置保存目录
   - 查看当前 `storage root`
2. `设置 -> 存储与互操作 -> 导入 Markdown`
3. `设置 -> 存储与互操作 -> 导出 Markdown`

不建议第一版放的位置：

1. 不放在每条已办卡片上
2. 不放在 mini 模式主界面
3. 不做多入口重复暴露

原因：

1. 这是系统级能力，不是单条记录的高频动作
2. 放在设置里更符合“存储策略”和“互操作策略”的语义

### 11.2 回顾页辅助入口

如果后续需要给回顾页补一个更近的入口，建议只加轻入口：

1. `回顾` 页工具栏里放一个 `导出当前筛选结果`

但这不属于第一版必须项。  
第一版优先把“全量导入 / 导出 + 保存目录”收稳。

---

## 12. 导入规则建议

第一版导入规则建议尽量简单：

1. 读 `.md` 文件
2. 尝试解析 front matter
3. 若 front matter 缺失：
   - 用文件名 / 首行 / 正文生成保底信息
4. 若 front matter 存在：
   - 只消费我们认可的稳定字段
   - 其他未知字段保留但不参与核心语义

这样做的好处：

1. 可以兼容普通 Markdown 文件
2. 不需要先做转换器
3. 不会因为外部文档里多了私有字段就导入失败

---

## 13. 实现顺序建议

建议按下面顺序推进：

1. 先定 storage root 模型
2. 再定 Markdown 文件组织结构
3. 再定 front matter 契约
4. 先做导出
5. 再做导入

原因：

1. 导出更容易验证
2. 导入天然更复杂，需要处理边界和不规范内容
3. 如果先把导出规范定稳，导入实现会更有参照系

---

## 14. 验收标准

第一版落地后，至少要满足：

1. 用户可以把一条笔记导出成 `.md`
2. 用户可以把保存目录指向一个外部 Markdown 工作区
3. 用户可以从一个 Markdown 文件夹导入内容
4. 导出的 Markdown 能被 Obsidian / Typora / Notion 以普通 Markdown 方式消费
5. 不依赖格式转换器，也不依赖第三方 API

---

## 15. 当前结论摘要

当前已经确认的真相是：

1. 这项能力必须做
2. 第一版只做 `Markdown`
3. 第一版不做格式转换
4. 最优路线是 `Markdown-first + 可配置保存目录 + 稳定字段契约`
5. Obsidian 是最适合“目录共存”的对象
6. Typora 是最适合“继续编辑”的对象
7. Notion 是“交换对象之一”，但不是我们的主语义锚点
