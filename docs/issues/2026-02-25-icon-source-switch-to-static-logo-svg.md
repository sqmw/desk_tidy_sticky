# Icon Source Switch to static/logo.svg (2026-02-25)

## Request
- User explicitly required using `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/static/logo.svg` as the only icon source.
- Goal: remove tauri/scaffold visual leftovers from Dock and top menu bar.

## Decision
- Treat `static/logo.svg` as single source of truth for app/tray/icon assets.
- Regenerate all tauri icon outputs from this SVG.
- Keep Dock icon aligned to dedicated `src-tauri/icons/dock-icon.png` (derived from `static/logo.svg` with safe padding).
- Use a dedicated macOS tray template icon to satisfy menu bar monochrome rules.

## Changes
1. Regenerated icon assets
- Command:
  - `pnpm tauri icon /Users/sunqin/study/language/rust/code/desk_tidy_sticky/static/logo.svg --output /Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons`
- Updated files include:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.icns`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.ico`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/32x32.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/128x128.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/128x128@2x.png`
  - Appx square/logo variants.

2. Cleaned non-project icon byproducts
- Removed auto-generated extras not used by this desktop project:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/64x64.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/android`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/ios`

3. Frontend favicon aligned
- Copied generated icon to:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/static/favicon.png`
- Purpose: remove residual scaffold icon in webview/front-end contexts.

4. Runtime icon loading alignment (already in place)
- Tray icon uses dedicated template image and enables template rendering on macOS menu bar:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Tray template asset:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-template.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-template.png`
- Dock icon on macOS is force-set from dedicated `dock-icon.png` on startup:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/macos_windows.rs`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`
- Dock-specific asset:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`
- Behavior:
  - Menu bar: standard monochrome template style (sticky-note silhouette, no full white block).
  - Dock: colored app icon.

## Follow-up Fix: Menu Bar White Block (2026-02-25)
- 判定: `Bug/回归`。
- 最短依据:
  - 菜单栏图标开启 `icon_as_template(true)` 后，会按 alpha 蒙版渲染。
  - 旧模板图形在 16~18px 下主要呈现“方形轮廓”，视觉上接近白块，和 Dock 彩色图标语义不一致。
- 修复:
  - 重绘专用模板图为“便签轮廓语义（含折角+减号镂空）”，并保持透明背景。
  - 继续与 Dock 图标分离：菜单栏用模板图，Dock 用彩色 `dock-icon.png`。

## Follow-up Fix: Icon Visual Size Alignment (2026-02-25)
- 判定: `视觉规格偏差`（非功能性故障）。
- 依据:
  - 菜单栏模板图有效绘制区域偏小，和同列系统图标相比略小。
  - Dock 彩色图有效绘制区域偏大，和同列应用图标相比略大。
- 修复:
  - 放大菜单栏模板图形主轮廓（减少留白）：
    - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-template.svg`
  - 新增 Dock 专用留白图标（在原 logo 外增加透明安全边距）：
    - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
    - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`
  - 运行时 macOS Dock 改为使用 `dock-icon.png`：
    - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`

## Follow-up Tuning: User Screenshot Based Pass 2 (2026-02-25)
- 输入证据:
  - 用户截图显示：菜单栏图标仍偏小、Dock 图标仍偏大。
- 调整策略:
  - 菜单栏模板图再次增大有效绘制区域（从 `8..56` 扩大到 `4..60` 主边界）。
  - Dock 图标再增加透明边距（缩放从 `0.859375` 调整为 `0.828125`）。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-template.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/tray-template.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`

## Follow-up Tuning: User Screenshot Based Pass 3 (2026-02-25)
- 输入证据:
  - 用户反馈“菜单栏差不多了，但 Dock 仍有偏差”。
- 判定:
  - `视觉规格偏差`（仅 Dock 尺寸占比问题）。
- 调整:
  - Dock 图标再次增加透明边距，缩放从 `0.828125` 调整为 `0.78125`（平移从 `88` 调整到 `112`）。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`

## Follow-up Tuning: User Screenshot Based Pass 4 (2026-02-25)
- 输入证据:
  - 用户继续反馈 Dock 图标“仍明显大于同列图标”。
- 判定:
  - `视觉规格偏差`（仅 Dock 尺寸占比问题）。
- 调整:
  - Dock 图标进一步增加透明边距，缩放从 `0.78125` 调整为 `0.703125`（平移从 `112` 调整到 `152`），保持几何中心不变。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`

## Follow-up Fix: Dock Icon Change Not Applied (2026-02-25)
- 输入证据:
  - 用户反馈 Dock 图标尺寸调整后“看起来没有生效”。
- 判定:
  - `Bug/回归`（资源变更链路不稳定）。
- 根因:
  - 仅改 `dock-icon.png` 时，macOS 仍可能使用 `icon.icns`/tauri context 中的旧图标。
  - 工程默认未显式监听图标文件变更，导致部分构建路径不会因图标改动触发重建。
- 修复:
  - 从当前 `dock-icon.svg` 重新生成 tauri 全套图标，确保 `icon.icns` / `icon.png` 与 Dock 缩放版一致。
  - 增加 `build.rs` 的 `rerun-if-changed`，显式监听核心图标资源。
  - macOS 运行时图标设置增加调度错误日志，便于后续定位未应用原因。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.icns`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.ico`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/build.rs`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/src/lib.rs`

## Follow-up Tuning: User Screenshot Based Pass 5 (2026-02-25)
- 输入证据:
  - 用户反馈新一版 Dock 图标“有点小”。
- 判定:
  - `视觉规格偏差`（仅 Dock 尺寸占比问题）。
- 调整:
  - Dock 缩放回调一档：`0.703125 -> 0.7421875`，中心保持不变（平移 `152 -> 132`）。
  - 同步重新生成 `dock-icon.png`，并再次生成 tauri 运行/打包图标（`icon.icns/icon.png/icon.ico`）确保 Dock 与运行时一致。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.icns`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.ico`

## Follow-up Tuning: User Screenshot Based Pass 6 (2026-02-25)
- 输入证据:
  - 用户反馈 Pass 5 后 Dock 图标“还是有点小”。
- 判定:
  - `视觉规格偏差`（仅 Dock 尺寸占比问题）。
- 调整:
  - Dock 缩放再上调半档：`0.7421875 -> 0.765625`，保持中心对齐（平移 `132 -> 120`）。
  - 同步重新生成 `dock-icon.png`，并再次生成 `icon.icns/icon.png/icon.ico`，确保 Dock 最终显示使用同一版视觉比例。
- 调整文件:
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.svg`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/dock-icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.icns`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.png`
  - `/Users/sunqin/study/language/rust/code/desk_tidy_sticky/src-tauri/icons/icon.ico`

## Validation
- `cargo check` passed (`src-tauri`).

## Regression Checklist
1. Run `pnpm tauri dev`.
2. Verify top menu bar icon is monochrome template style and no longer appears as a white square block.
3. Verify Dock icon matches `static/logo.svg` visual.
4. Hide/minimize app, click Dock icon, confirm window restores.
