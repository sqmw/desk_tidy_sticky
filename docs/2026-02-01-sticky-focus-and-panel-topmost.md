# 贴纸焦点与主窗口置顶问题修复

**日期**: 2026-02-01

## 问题描述

两个关联问题:
1. **贴纸无法获得焦点**: 点击贴纸窗口时，焦点自动跑到主窗口，无法正常编辑
2. **主窗口无法取消置顶**: 取消置顶后点击其他窗口，主窗口又自动弹回顶层

## 根本原因

### 问题1: 贴纸无法获得焦点

`note_window_page.dart` 中始终使用 `WindowZOrderService.showNoActivate()` 显示窗口，这会阻止窗口获得焦点。即使用户双击进入编辑模式，窗口也从未被激活。

### 问题2: 主窗口无法取消置顶

`panel_page.dart` 的两处代码导致问题:

1. **`onWindowBlur()`**: 当 overlay 运行且窗口失焦时，无条件调用 `setAlwaysOnTop(true)`，无视用户的置顶偏好
2. **`_updateAlwaysOnTop()`**: 多个延时后强制设置 `setAlwaysOnTop(true)`，同样无视用户设置

## 解决方案

### 贴纸焦点修复 (`note_window_page.dart`)

1. **onEdit 回调**: 添加 `await windowManager.focus()` 激活窗口获取键盘焦点
2. **_applyMouseModeAndZOrder**: 编辑模式时使用 `windowManager.show()` 而非 `showNoActivate()`

```dart
// onEdit 回调
onEdit: () async {
  if (_clickThrough) {
    _overlayController.setClickThrough(false);
  }
  // 激活窗口以接收键盘焦点
  await windowManager.focus();
  setState(() {
    _isEditing = true;
    _textController.text = note.text;
  });
},

// _applyMouseModeAndZOrder
if (_isEditing) {
  await windowManager.show();
} else {
  await WindowZOrderService.showNoActivate();
}
```

### 主窗口置顶修复 (`panel_page.dart`)

1. **onWindowBlur**: 添加 `_windowPinned` 条件检查，仅当用户明确启用置顶时才强制置顶
2. **_updateAlwaysOnTop**: 延时重设前检查 `shouldBeTop` 和 `_windowPinned`

```dart
// onWindowBlur - 添加 _windowPinned 条件
if (_windowPinned && _overlayManager.isRunning && !TrayMenuGuard.instance.isMenuOpen.value) {
  Future.delayed(const Duration(milliseconds: 500), () {
    if (mounted && _windowPinned) {
      windowManager.setAlwaysOnTop(true);
    }
  });
}

// _updateAlwaysOnTop - 提前返回检查
if (!shouldBeTop) return;

await Future.delayed(const Duration(milliseconds: 300));
if (!mounted || !_windowPinned) return;
await windowManager.setAlwaysOnTop(true);
```

## 修改的文件

- `lib/pages/panel/panel_page.dart`
- `lib/pages/note_window/note_window_page.dart`

## 关键点

- `showNoActivate()` 用于避免窗口抢夺焦点，但编辑场景需要激活窗口
- Z-order 管理需要尊重用户置顶偏好，避免自动行为覆盖用户设置
- 延时重设 always-on-top 时需要双重检查条件（mounted + 用户偏好）

## 验证方法

1. 创建贴纸，双击编辑，验证可正常输入
2. 取消主窗口置顶，点击其他窗口，验证主窗口不再自动弹回
3. 重启应用，验证主窗口默认不置顶

---

## 补充修复 (2026-02-01 11:30)

### 问题
1. 主窗口置顶状态被持久化保存，重启后保持置顶
2. 启动时虽然置顶图标未选中，但窗口实际是置顶的

### 原因
- `_loadPreferences()` 读取持久化的 `windowPinned` 值
- `_updateAlwaysOnTop()` 在 overlay 运行时无条件设置置顶（无论是否 clickThrough 模式）

### 修复
1. **移除持久化**: 不再保存/读取 windowPinned 状态，每次启动默认不置顶
2. **精确判断 overlay 交互模式**: 只有当 overlay 处于交互模式（非 clickThrough）时才强制主窗口置顶

```dart
// 只有交互模式下才强制置顶
final overlayInteractive = overlayActive && 
    !OverlayController.instance.clickThrough.value;
final shouldBeTop = _windowPinned || overlayInteractive;
```
