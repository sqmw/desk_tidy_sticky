# 2026-01-27 — .gitignore 与 desk_tidy 对齐

## 变更
将 `desk_tidy_sticky/.gitignore` 与同级项目 `desk_tidy/.gitignore` 的重叠项保持一致，避免两边依赖/构建产物策略不一致导致的提交噪音。

## 本次新增忽略项
- `.flutter-plugins`
- `pubspec.lock`
- `code_lib/`
- `.agent/`
