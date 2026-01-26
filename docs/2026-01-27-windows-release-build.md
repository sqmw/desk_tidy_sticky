# 2026-01-27 — Windows Release 构建：cpp_client_wrapper 缺失

## 现象
`fvm flutter build windows --release` 时报错类似：
- `...windows/flutter/ephemeral/cpp_client_wrapper/core_implementations.cc: No such file or directory`

## 原因（常见）
`windows/flutter/ephemeral/cpp_client_wrapper` 在正常情况下应由 Flutter 生成（或通过 symlink 指向 SDK 的 wrapper 源码）。
在某些 Windows 环境下，symlink/生成步骤会失败，导致目录只有 `include/`，缺少 `.cc` 源文件。

## 解决
从 Flutter SDK 的 engine artifacts 复制 wrapper 源码到项目的 ephemeral 目录：

```bat
robocopy ^
  C:\Users\19519\fvm\versions\3.38.7\bin\cache\artifacts\engine\windows-x64\cpp_client_wrapper ^
  f:\language\dart\code\desk_tidy_sticky\windows\flutter\ephemeral\cpp_client_wrapper ^
  /E
```

然后重新构建：
```bat
fvm flutter build windows --release
```

## 备注
- `windows/flutter/ephemeral` 属于生成目录，不建议手动修改后提交版本控制；这个文档仅用于记录排障与复现步骤。
