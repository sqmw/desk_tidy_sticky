export const DEFAULT_NOTE_COLOR = "#fff9c4";
export const DEFAULT_NOTE_TEXT_COLOR = "#1f2937";
export const DEFAULT_NOTE_OPACITY = 1;
export const DEFAULT_NOTE_FROST = 0.22;

export const NOTE_COLORS = [
  "#fff9c4",
  "#ffe0b2",
  "#ffccbc",
  "#f8bbd0",
  "#d1c4e9",
  "#c5cae9",
  "#b3e5fc",
  "#c8e6c9",
];

export const NOTE_TEXT_COLORS = [
  "#111827",
  "#1f2937",
  "#334155",
  "#374151",
  "#4b5563",
  "#0f4c81",
  "#7c2d12",
  "#7f1d1d",
];

/**
 * @param {string} hex
 * @param {number} alpha
 */
export function hexToRgba(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : value;
  const n = Number.parseInt(normalized, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @param {string} value
 * @param {string} fallback
 */
export function toColorPickerHex(value, fallback) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}
