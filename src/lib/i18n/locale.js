export const APP_LOCALE_EN = "en";
export const APP_LOCALE_ZH = "zh";
export const APP_DEFAULT_LOCALE = APP_LOCALE_ZH;

/**
 * @param {unknown} locale
 * @returns {"en" | "zh" | ""}
 */
export function normalizeStoredLocale(locale) {
  if (locale === APP_LOCALE_EN || locale === APP_LOCALE_ZH) return locale;
  return "";
}

/**
 * @returns {"en" | "zh"}
 */
export function detectSystemLocale() {
  if (typeof navigator === "undefined") return APP_DEFAULT_LOCALE;
  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  const fallback = String(navigator.language || "").trim();
  const candidates = [...languages, fallback];
  for (const raw of candidates) {
    const locale = String(raw || "").trim().toLowerCase();
    if (!locale) continue;
    if (locale.startsWith("zh")) return APP_LOCALE_ZH;
    if (locale.startsWith("en")) return APP_LOCALE_EN;
  }
  return APP_DEFAULT_LOCALE;
}

/**
 * @param {unknown} [storedLocale]
 * @returns {"en" | "zh"}
 */
export function resolveAppLocale(storedLocale) {
  return normalizeStoredLocale(storedLocale) || detectSystemLocale();
}
