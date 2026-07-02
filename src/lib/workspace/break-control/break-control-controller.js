/**
 * @param {{
 *   enabled: boolean;
 *   activeBreakKind: string;
 *   focusSinceBreakSec: number;
 *   nextMiniBreakAtSec: number;
 *   nextLongBreakAtSec: number;
 * }} input
 */
export function buildBreakWatchdogSnapshot(input) {
  const enabled = input.enabled === true;
  const activeKind = String(input.activeBreakKind || "");
  return {
    enabled,
    activeBreakKind: activeKind,
    miniDueAtMs: enabled && !activeKind
      ? Date.now() + Math.max(0, input.nextMiniBreakAtSec - input.focusSinceBreakSec) * 1000
      : 0,
    longDueAtMs: enabled && !activeKind
      ? Date.now() + Math.max(0, input.nextLongBreakAtSec - input.focusSinceBreakSec) * 1000
      : 0,
  };
}

/** @param {unknown} value */
function safeRemaining(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

/**
 * @param {{
 *   breakReminderEnabled: boolean;
 *   nextMiniBreakCountdown: number;
 *   nextLongBreakCountdown: number;
 *   miniEverySec: number;
 *   longEverySec: number;
 * }} input
 */
export function resolveBreakDueKind(input) {
  if (input.breakReminderEnabled !== true) return "";
  const miniRemaining = safeRemaining(input.nextMiniBreakCountdown);
  const longRemaining = safeRemaining(input.nextLongBreakCountdown);
  if (longRemaining <= 0) return "long";
  if (miniRemaining <= 0) return "mini";
  return "";
}

/**
 * @param {{
 *   breakReminderEnabled: boolean;
 *   nextMiniBreakCountdown: number;
 *   nextLongBreakCountdown: number;
 *   miniEverySec: number;
 *   longEverySec: number;
 * }} input
 */
export function resolveNextBreakKind(input) {
  if (input.breakReminderEnabled !== true) return "";
  const miniRemaining = Math.max(0, safeRemaining(input.nextMiniBreakCountdown));
  const longRemaining = Math.max(0, safeRemaining(input.nextLongBreakCountdown));
  if (!Number.isFinite(miniRemaining) && !Number.isFinite(longRemaining)) return "";
  return longRemaining <= miniRemaining ? "long" : "mini";
}

/**
 * @param {{
 *   breakReminderEnabled: boolean;
 *   nextMiniBreakCountdown: number;
 *   nextLongBreakCountdown: number;
 *   miniEverySec: number;
 *   longEverySec: number;
 * }} input
 */
export function getBreakProgressPercent(input) {
  if (!input.breakReminderEnabled) return 0;
  const nextKind = resolveNextBreakKind(input);
  if (!nextKind) return 0;
  const useMini = nextKind === "mini";
  const miniRemaining = Math.max(0, Number(input.nextMiniBreakCountdown || 0));
  const longRemaining = Math.max(0, Number(input.nextLongBreakCountdown || 0));
  const total = Math.max(1, Number(useMini ? input.miniEverySec : input.longEverySec));
  const remaining = Math.min(total, Math.max(0, Number(useMini ? miniRemaining : longRemaining)));
  const ratio = (total - remaining) / total;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

/**
 * @param {{
 *   activeBreakKind: string;
 *   breakRemainingSec: number;
 *   breakDeadlineTs: number;
 *   breakPlanSec: { miniDurationSec: number; longDurationSec: number };
 *   breakStrictMode: boolean;
 *   skipUnlockedAfterPostpone: boolean;
 *   strings: Record<string, any>;
 *   formatTimer: (seconds: number) => string;
 * }} input
 */
export function buildBreakOverlayPayload(input) {
  const isLong = input.activeBreakKind === "long";
  const safeTotal = Math.max(
    1,
    Math.floor(isLong ? input.breakPlanSec.longDurationSec : input.breakPlanSec.miniDurationSec),
  );
  const safeRemaining = Math.max(0, Math.floor(input.breakRemainingSec));
  const progress = Math.max(0, Math.min(100, Math.round(((safeTotal - safeRemaining) / safeTotal) * 100)));
  const remainingText = input.strings.pomodoroBreakRemaining || "Remaining";
  return {
    title: isLong
      ? (input.strings.pomodoroLongBreakNow || "Take a long break")
      : (input.strings.pomodoroMiniBreakNow || "Take a mini break"),
    taskText: "",
    remainingPrefix: remainingText,
    remainingText: `${remainingText} ${input.formatTimer(safeRemaining)}`,
    remainingSeconds: safeRemaining,
    totalSeconds: safeTotal,
    endAtTs: input.breakDeadlineTs > 0 ? input.breakDeadlineTs : (Date.now() + safeRemaining * 1000),
    progress,
    showPostpone: input.breakStrictMode !== true,
    postponeText: input.strings.pomodoroBreakPostponeTwoMinutes || "Postpone 2m",
    skipText: input.strings.pomodoroSkip || "Skip",
    showSkip: input.breakStrictMode !== true && input.skipUnlockedAfterPostpone === true,
    postponeDisabled: input.breakStrictMode === true,
    skipDisabled: input.breakStrictMode === true || !input.skipUnlockedAfterPostpone,
    strictMode: input.breakStrictMode === true,
    strictModeText: input.strings.pomodoroBreakStrictMode || "Strict mode",
  };
}

/**
 * @param {string[]} labels
 * @param {Record<string, any>} payload
 */
export function buildBreakOverlayPayloadKey(labels, payload) {
  return [
    labels.join(","),
    payload.title,
    payload.taskText,
    payload.remainingSeconds,
    payload.progress,
    payload.showPostpone ? 1 : 0,
    payload.showSkip ? 1 : 0,
    payload.postponeDisabled ? 1 : 0,
    payload.skipDisabled ? 1 : 0,
    payload.strictMode ? 1 : 0,
  ].join("|");
}

/**
 * @param {{
 *   stage: "warn" | "start";
 *   kind: "mini" | "long";
 *   strings: Record<string, any>;
 *   breakPlanSec: { notifyBeforeSec: number; miniDurationSec: number };
 *   longBreakDurationMinutes: number;
 *   formatSecondsBrief: (seconds: number) => string;
 * }} input
 */
export function buildBreakNotification(input) {
  const isMini = input.kind === "mini";
  const title = input.stage === "warn"
    ? (isMini
        ? (input.strings.pomodoroMiniBreakSoon || "Mini break soon")
        : (input.strings.pomodoroLongBreakSoon || "Long break soon"))
    : (isMini
        ? (input.strings.pomodoroMiniBreakNow || "Take a mini break")
        : (input.strings.pomodoroLongBreakNow || "Take a long break"));
  const body = input.stage === "warn"
    ? `${input.strings.pomodoroBreakIn || "Break in"} ${input.formatSecondsBrief(input.breakPlanSec.notifyBeforeSec)}`
    : `${input.strings.pomodoroBreakDuration || "Duration"} ${
        isMini
          ? input.formatSecondsBrief(input.breakPlanSec.miniDurationSec)
          : `${input.longBreakDurationMinutes}m`
      }`;
  return { title, body };
}
