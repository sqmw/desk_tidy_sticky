import {
  buildModuleDefaultSection,
  buildSelectorIndexSection,
  buildThemeTokenSection,
} from "$lib/workspace/theme/theme-default-template-sections.js";

export function buildWorkspaceDefaultThemeTemplate() {
  const lines = [
    "/*",
    "Desk Tidy Workspace - 自定义主题完整默认模板",
    "",
    "使用方式：",
    "1) 在工作台设置里点击“复制完整模板”并粘贴到“自定义主题”。",
    "2) 模板已包含变量 + 主要组件默认样式，不再是空占位。",
    "3) 优先改变量（全局生效），再按模块改局部。",
    "4) 建议始终使用 .workspace 前缀，避免影响其他页面。",
    "*/",
    "",
    buildThemeTokenSection(),
    buildModuleDefaultSection(),
    buildSelectorIndexSection(),
  ];
  return lines.join("\n");
}
