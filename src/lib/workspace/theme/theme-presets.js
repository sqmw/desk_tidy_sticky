export const DEFAULT_WORKSPACE_THEME_PRESET = "light";

/**
 * @typedef {{
 *   id: string;
 *   appearance: "light" | "dark";
 *   labelKey: string;
 *   vars: Record<string, string>;
 * }} WorkspaceThemePreset
 */

/** @type {WorkspaceThemePreset[]} */
const WORKSPACE_THEME_PRESETS = [
  {
    id: "light",
    appearance: "light",
    labelKey: "workspaceThemePresetLight",
    vars: {
      "--ws-text-strong": "#0f172a",
      "--ws-text": "#334155",
      "--ws-muted": "#64748b",
      "--ws-accent": "#1d4ed8",
      "--ws-panel-bg": "rgba(255, 255, 255, 0.86)",
      "--ws-card-bg": "#fdfefe",
      "--ws-btn-bg": "#fbfdff",
      "--ws-btn-hover": "#f4f8ff",
      "--ws-btn-active": "linear-gradient(180deg, #edf2fb 0%, #e2e8f0 100%)",
      "--ws-badge-bg": "#e8f0ff",
      "--ws-badge-border": "#d7e5ff",
      "--ws-border": "#dce5f3",
      "--ws-border-soft": "#d9e2ef",
      "--ws-border-hover": "#c6d5e8",
      "--ws-border-active": "#94a3b8",
      "--ws-scrollbar-track": "rgba(148, 163, 184, 0.14)",
      "--ws-scrollbar-thumb": "rgba(71, 85, 105, 0.45)",
      "--ws-scrollbar-thumb-hover": "rgba(51, 65, 85, 0.62)",
      "--ws-input-bg": "#fbfdff",
      "--ws-input-border": "#d9e2ef",
      "--ws-input-text": "#0f172a",
      "--ws-workspace-bg":
        "radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.09), transparent 35%), radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.08), transparent 32%), linear-gradient(165deg, #edf3ff 0%, #f7faff 46%, #fff8f1 100%)",
    },
  },
  {
    id: "dark",
    appearance: "dark",
    labelKey: "workspaceThemePresetDark",
    vars: {
      "--ws-text-strong": "#e5ecf7",
      "--ws-text": "#c6d0dd",
      "--ws-muted": "#94a3b8",
      "--ws-accent": "#7aa2ff",
      "--ws-panel-bg": "rgba(16, 23, 36, 0.85)",
      "--ws-card-bg": "#152033",
      "--ws-btn-bg": "#1a2740",
      "--ws-btn-hover": "#233454",
      "--ws-btn-active": "linear-gradient(180deg, #1d2f50 0%, #263a5a 100%)",
      "--ws-badge-bg": "#1a2c49",
      "--ws-badge-border": "#2f4a75",
      "--ws-border": "#2b3a54",
      "--ws-border-soft": "#31445f",
      "--ws-border-hover": "#415981",
      "--ws-border-active": "#6389c9",
      "--ws-scrollbar-track": "rgba(148, 163, 184, 0.14)",
      "--ws-scrollbar-thumb": "rgba(148, 163, 184, 0.42)",
      "--ws-scrollbar-thumb-hover": "rgba(186, 201, 224, 0.58)",
      "--ws-input-bg": "#12233a",
      "--ws-input-border": "#324561",
      "--ws-input-text": "#dbe7f7",
      "--ws-workspace-bg":
        "radial-gradient(circle at 8% 6%, rgba(56, 189, 248, 0.12), transparent 35%), radial-gradient(circle at 92% 90%, rgba(251, 146, 60, 0.12), transparent 32%), linear-gradient(165deg, #0d1728 0%, #0f1d31 46%, #122034 100%)",
    },
  },
  {
    id: "paper",
    appearance: "light",
    labelKey: "workspaceThemePresetPaper",
    vars: {
      "--ws-text-strong": "#1f2937",
      "--ws-text": "#374151",
      "--ws-muted": "#6b7280",
      "--ws-accent": "#0f766e",
      "--ws-panel-bg": "rgba(255, 252, 244, 0.88)",
      "--ws-card-bg": "#fffdf7",
      "--ws-btn-bg": "#fffef8",
      "--ws-btn-hover": "#faf7ef",
      "--ws-btn-active": "linear-gradient(180deg, #fef7e4 0%, #f8edcf 100%)",
      "--ws-badge-bg": "#f6f3e8",
      "--ws-badge-border": "#e4dcc7",
      "--ws-border": "#e6dfcf",
      "--ws-border-soft": "#ebe6d8",
      "--ws-border-hover": "#d9cfb8",
      "--ws-border-active": "#a88957",
      "--ws-scrollbar-track": "rgba(156, 163, 175, 0.18)",
      "--ws-scrollbar-thumb": "rgba(107, 114, 128, 0.48)",
      "--ws-scrollbar-thumb-hover": "rgba(75, 85, 99, 0.62)",
      "--ws-input-bg": "#fffef8",
      "--ws-input-border": "#e7dfc9",
      "--ws-input-text": "#1f2937",
      "--ws-workspace-bg":
        "radial-gradient(circle at 10% 10%, rgba(251, 191, 36, 0.1), transparent 38%), radial-gradient(circle at 90% 88%, rgba(14, 165, 233, 0.08), transparent 34%), linear-gradient(165deg, #fbf7ee 0%, #fffaf1 48%, #f6efe2 100%)",
    },
  },
  {
    id: "forest",
    appearance: "dark",
    labelKey: "workspaceThemePresetForest",
    vars: {
      "--ws-text-strong": "#ecfdf5",
      "--ws-text": "#c6f6de",
      "--ws-muted": "#9ccbb4",
      "--ws-accent": "#34d399",
      "--ws-panel-bg": "rgba(9, 26, 20, 0.88)",
      "--ws-card-bg": "#103328",
      "--ws-btn-bg": "#154135",
      "--ws-btn-hover": "#1c5344",
      "--ws-btn-active": "linear-gradient(180deg, #1a5543 0%, #216149 100%)",
      "--ws-badge-bg": "#174836",
      "--ws-badge-border": "#2d6a4f",
      "--ws-border": "#23513f",
      "--ws-border-soft": "#2f644d",
      "--ws-border-hover": "#3f7c62",
      "--ws-border-active": "#5dbb8a",
      "--ws-scrollbar-track": "rgba(110, 231, 183, 0.16)",
      "--ws-scrollbar-thumb": "rgba(45, 123, 92, 0.55)",
      "--ws-scrollbar-thumb-hover": "rgba(95, 190, 145, 0.62)",
      "--ws-input-bg": "#123d31",
      "--ws-input-border": "#336b54",
      "--ws-input-text": "#ecfdf5",
      "--ws-workspace-bg":
        "radial-gradient(circle at 12% 8%, rgba(74, 222, 128, 0.14), transparent 34%), radial-gradient(circle at 86% 90%, rgba(45, 212, 191, 0.12), transparent 30%), linear-gradient(165deg, #071d17 0%, #0b261f 48%, #123227 100%)",
    },
  },
  {
    id: "sunset",
    appearance: "light",
    labelKey: "workspaceThemePresetSunset",
    vars: {
      "--ws-text-strong": "#3f1d4b",
      "--ws-text": "#5f335f",
      "--ws-muted": "#8c648a",
      "--ws-accent": "#d946ef",
      "--ws-panel-bg": "rgba(255, 246, 255, 0.88)",
      "--ws-card-bg": "#fff8ff",
      "--ws-btn-bg": "#fff2ff",
      "--ws-btn-hover": "#fce9ff",
      "--ws-btn-active": "linear-gradient(180deg, #f8e3ff 0%, #f2d8ff 100%)",
      "--ws-badge-bg": "#f9e8ff",
      "--ws-badge-border": "#ebccf7",
      "--ws-border": "#ecd8f7",
      "--ws-border-soft": "#e6d4f2",
      "--ws-border-hover": "#d8b7ec",
      "--ws-border-active": "#ba7ad9",
      "--ws-scrollbar-track": "rgba(216, 180, 236, 0.22)",
      "--ws-scrollbar-thumb": "rgba(149, 75, 174, 0.5)",
      "--ws-scrollbar-thumb-hover": "rgba(126, 34, 206, 0.64)",
      "--ws-input-bg": "#fff2ff",
      "--ws-input-border": "#ead1f5",
      "--ws-input-text": "#4a1f58",
      "--ws-workspace-bg":
        "radial-gradient(circle at 16% 12%, rgba(244, 114, 182, 0.15), transparent 38%), radial-gradient(circle at 86% 88%, rgba(251, 146, 60, 0.12), transparent 33%), linear-gradient(165deg, #fff1f8 0%, #fff7ff 46%, #fff2eb 100%)",
    },
  },
];

const THEME_PRESET_INDEX = new Map(WORKSPACE_THEME_PRESETS.map((preset) => [preset.id, preset]));

/**
 * @param {unknown} value
 */
export function normalizeWorkspaceThemePreset(value) {
  const key = String(value || "").trim().toLowerCase();
  if (THEME_PRESET_INDEX.has(key)) return key;
  return DEFAULT_WORKSPACE_THEME_PRESET;
}

/**
 * @param {unknown} value
 */
export function getWorkspaceThemePreset(value) {
  const id = normalizeWorkspaceThemePreset(value);
  return THEME_PRESET_INDEX.get(id) || WORKSPACE_THEME_PRESETS[0];
}

/**
 * @param {unknown} value
 */
export function isWorkspaceThemeDark(value) {
  return getWorkspaceThemePreset(value).appearance === "dark";
}

/**
 * @param {unknown} value
 */
export function resolveWorkspaceThemeToggleTarget(value) {
  return isWorkspaceThemeDark(value) ? "light" : "dark";
}

/**
 * @param {unknown} value
 */
export function buildWorkspaceThemeVarStyle(value) {
  const preset = getWorkspaceThemePreset(value);
  return Object.entries(preset.vars)
    .map(([name, token]) => `${name}: ${token};`)
    .join(" ");
}

/**
 * @param {Record<string, string>} strings
 */
export function getWorkspaceThemePresetOptions(strings) {
  return WORKSPACE_THEME_PRESETS.map((preset) => ({
    value: preset.id,
    label: strings[preset.labelKey] || preset.id,
    appearance: preset.appearance,
    previewBg: preset.vars["--ws-card-bg"] || "#ffffff",
    previewText: preset.vars["--ws-text-strong"] || "#0f172a",
    previewAccent: preset.vars["--ws-accent"] || "#1d4ed8",
  }));
}
