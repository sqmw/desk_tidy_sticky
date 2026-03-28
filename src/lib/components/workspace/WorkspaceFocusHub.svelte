<script>
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import {
    RECURRENCE,
    clampInt,
    ensureDayStats,
    getDateKey,
    getRecentDateKeys,
    getTodayTasks,
    timeToMinutes,
  } from "$lib/workspace/focus/focus-model.js";
  import {
    buildFocusHeatmap,
    getBestFocusDay,
    getFocusStreakDays,
    getWeekFocusAverageMinutes,
  } from "$lib/workspace/focus/focus-analytics.js";
  import WorkspaceFocusTimer from "$lib/components/workspace/focus/WorkspaceFocusTimer.svelte";
  import WorkspaceBreakControlBar from "$lib/components/workspace/focus/WorkspaceBreakControlBar.svelte";
  import WorkspaceFocusPlanner from "$lib/components/workspace/focus/WorkspaceFocusPlanner.svelte";
  import WorkspaceFocusSettingsPanel from "$lib/components/workspace/focus/WorkspaceFocusSettingsPanel.svelte";
  import WorkspaceFocusStats from "$lib/components/workspace/focus/WorkspaceFocusStats.svelte";
  import {
    BREAK_REMINDER_MODE_FULLSCREEN,
    BREAK_REMINDER_MODE_OPTIONS,
    BREAK_REMINDER_MODE_PANEL,
    normalizeBreakReminderMode,
  } from "$lib/workspace/focus/focus-break-reminder-mode.js";
  import {
    BREAK_SESSION_SCOPE_GLOBAL,
    BREAK_SESSION_NONE,
    BREAK_SESSION_OPTIONS,
    createBreakSession,
    getBreakSessionRemainingText,
    isBreakSessionActive,
    normalizeBreakSession,
  } from "$lib/workspace/focus/focus-break-session.js";
  import {
    BREAK_KIND_LONG,
    BREAK_KIND_MINI,
    applyFocusCompleted,
    buildFocusTaskFromDraft,
    buildTimerTaskOptions,
    buildTodaySummary,
    FOCUS_WEEKDAYS,
    getBreakPlanSec,
    getPhaseDurationSec,
    getSafeConfig,
    PHASE_FOCUS,
    removeTaskFromState,
    updateTaskInState,
  } from "$lib/workspace/focus/focus-runtime.js";
  import { formatSecondsBrief, sendDesktopNotification } from "$lib/workspace/focus/focus-break-notify.js";
  import {
    BREAK_OVERLAY_EVENT_ACTION,
    BREAK_OVERLAY_EVENT_READY,
    closeBreakOverlayWindows,
    closeBreakOverlayWindowsByLabels,
    emitBreakOverlayState,
    ensureBreakOverlayWindows,
  } from "$lib/workspace/focus/focus-break-overlay-windows.js";
  import {
    clearFocusTimerRuntimeCache,
    loadFocusTimerRuntimeCache,
    saveFocusTimerRuntimeCache,
  } from "$lib/workspace/focus/focus-timer-runtime-cache.js";

  const BREAK_DUE_EVENT = "focus_break_due";

  let {
    strings,
    compact = false,
    tasks = [],
    stats = {},
    selectedTaskId: selectedTaskIdProp = "",
    command = { nonce: 0, type: "select", taskId: "" },
    breakSession = {
      mode: BREAK_SESSION_NONE,
      untilTs: 0,
      scope: BREAK_SESSION_SCOPE_GLOBAL,
      taskId: "",
      taskTitle: "",
    },
    pomodoroConfig = {
      breakReminderEnabled: true,
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      miniBreakEveryMinutes: 10,
      miniBreakDurationSeconds: 20,
      longBreakEveryMinutes: 30,
      longBreakDurationMinutes: 5,
      breakNotifyBeforeSeconds: 10,
      taskStartReminderEnabled: false,
      taskStartReminderLeadMinutes: 10,
      breakReminderMode: BREAK_REMINDER_MODE_PANEL,
      independentMiniBreakEveryMinutes: 10,
      independentLongBreakEveryMinutes: 30,
    },
    onTasksChange = () => {},
    onStatsChange = () => {},
    onBreakSessionChange = () => {},
    onSelectedTaskIdChange = () => {},
    onPomodoroConfigChange = () => {},
  } = $props();

  let phase = $state(PHASE_FOCUS);
  let remainingSec = $state(25 * 60);
  let focusDeadlineTs = $state(0);
  let running = $state(false);
  let hasStarted = $state(false);
  let completedFocusCount = $state(0);
  let selectedTaskId = $state("");
  let lastSyncedSelectedTaskId = $state("");
  let lastCommandNonce = $state(0);
  let showConfig = $state(false);
  let showBreakPanel = $state(false);
  let showStats = $state(false);
  let nowTick = $state(Date.now());

  let draftTitle = $state("");
  let draftStartTime = $state("09:00");
  let draftEndTime = $state("10:00");
  let draftRecurrence = $state(RECURRENCE.NONE);
  let draftWeekdays = $state([1, 2, 3, 4, 5]);
  let draftFocusMinutes = $state(25);
  let draftMiniBreakEveryMinutes = $state(10);
  let draftMiniBreakDurationSeconds = $state(20);
  let draftLongBreakEveryMinutes = $state(30);
  let draftLongBreakDurationMinutes = $state(5);
  let draftBreakNotifyBeforeSeconds = $state(10);
  let draftTaskStartReminderEnabled = $state(false);
  let draftTaskStartReminderLeadMinutes = $state(10);
  let draftMiniBreakPostponeMinutes = $state(5);
  let draftLongBreakPostponeMinutes = $state(10);
  let draftBreakPostponeLimit = $state(3);
  let draftBreakStrictMode = $state(false);
  let focusSinceBreakSec = $state(0);
  let nextMiniBreakAtSec = $state(10 * 60);
  let nextLongBreakAtSec = $state(30 * 60);
  let nextMiniWarnAtSec = $state(10 * 60 - 10);
  let nextLongWarnAtSec = $state(30 * 60 - 10);
  let lastBreakReminderAtSec = $state(-1);
  let notifyEnabled = $state(false);
  let notifyChecked = $state(false);
  /** @type {string[]} */
  let breakOverlayLabels = $state([]);
  let breakOverlaySyncNonce = 0;
  let overlayLifecycleActive = false;
  let overlayClosing = false;
  let overlaySyncInFlight = false;
  let overlaySyncQueued = false;
  let lastOverlayPayloadKey = "";
  let timerRuntimeRestored = false;
  /** @type {Set<string>} */
  let sentTaskStartReminderKeys = new Set();
  let taskStartReminderDateKey = "";
  /** @type {null | Promise<string[]>} */
  let overlayEnsurePromise = null;
  /** @type {"mini" | "long" | ""} */
  let activeBreakKind = $state("");
  let breakRemainingSec = $state(0);
  let breakDeadlineTs = $state(0);
  let skipUnlockedAfterPostpone = $state(false);
  let localBreakSession = $state({
    mode: BREAK_SESSION_NONE,
    untilTs: 0,
    scope: BREAK_SESSION_SCOPE_GLOBAL,
    taskId: "",
    taskTitle: "",
  });

  const safeConfig = $derived(getSafeConfig(pomodoroConfig, clampInt));
  const todayKey = $derived(getDateKey());
  const weekKeys = $derived(getRecentDateKeys());
  const todayTasks = $derived(getTodayTasks(tasks));
  const todayStats = $derived(ensureDayStats(stats, todayKey));
  const weekFocusMinutes = $derived(
    weekKeys.reduce((sum, key) => sum + Math.round((stats[key]?.focusSeconds || 0) / 60), 0),
  );
  const weekPomodoros = $derived(
    weekKeys.reduce((sum, key) => sum + Number(stats[key]?.pomodoros || 0), 0),
  );
  const weekAverageMinutes = $derived(getWeekFocusAverageMinutes(stats));
  const streakDays = $derived(getFocusStreakDays(stats));
  const bestFocusDay = $derived(getBestFocusDay(stats));
  const focusHeatmap = $derived(buildFocusHeatmap(stats));
  const fallbackToAllTasks = $derived(todayTasks.length === 0 && tasks.length > 0);
  const focusSelectableTasks = $derived.by(() => (fallbackToAllTasks ? tasks : todayTasks));
  const selectedTask = $derived(focusSelectableTasks.find((task) => task.id === selectedTaskId) || null);
  const breakPlanSec = $derived(getBreakPlanSec({
    miniBreakEveryMinutes: safeConfig.independentMiniBreakEveryMinutes,
    miniBreakDurationSeconds: safeConfig.miniBreakDurationSeconds,
    longBreakEveryMinutes: safeConfig.independentLongBreakEveryMinutes,
    longBreakDurationMinutes: safeConfig.longBreakDurationMinutes,
    breakNotifyBeforeSeconds: safeConfig.breakNotifyBeforeSeconds,
  }));
  const todaySummary = $derived(buildTodaySummary(todayTasks, todayStats));
  const plannerTasks = $derived(focusSelectableTasks);
  const plannerShowingAllTasks = $derived(fallbackToAllTasks);
  const plannerDonePomodoros = $derived.by(() =>
    plannerTasks.reduce((sum, task) => sum + Number(todayStats.taskPomodoros?.[task.id] || 0), 0),
  );
  const timerTaskOptions = $derived(buildTimerTaskOptions(focusSelectableTasks));
  const selectedTaskDonePomodoros = $derived(
    selectedTaskId ? Number(todayStats.taskPomodoros?.[selectedTaskId] || 0) : 0,
  );
  const todayTaskDistribution = $derived(todaySummary.taskDistribution);
  const currentMinutes = $derived.by(() => {
    const now = new Date(nowTick);
    return now.getHours() * 60 + now.getMinutes();
  });
  const nextMiniBreakCountdown = $derived(Math.max(0, nextMiniBreakAtSec - focusSinceBreakSec));
  const nextLongBreakCountdown = $derived(Math.max(0, nextLongBreakAtSec - focusSinceBreakSec));
  const breakSessionActive = $derived(isBreakSessionActive(localBreakSession, nowTick));
  const breakSessionRemainingText = $derived(getBreakSessionRemainingText(localBreakSession, nowTick));
  const breakTimerActive = $derived(Boolean(activeBreakKind) && breakRemainingSec > 0);

  function getFocusDurationSec(config = safeConfig) {
    return getPhaseDurationSec(PHASE_FOCUS, config);
  }

  /** @param {number} deadlineTs */
  function getRemainingFromDeadline(deadlineTs) {
    if (!Number.isFinite(deadlineTs) || deadlineTs <= 0) return 0;
    return Math.max(0, Math.ceil((deadlineTs - Date.now()) / 1000));
  }

  function restoreTimerRuntimeFromCache() {
    const cached = loadFocusTimerRuntimeCache();
    if (!cached) return;
    const cachedAgeSec = Math.max(0, Math.floor((Date.now() - Number(cached.savedAt || 0)) / 1000));
    const restored = cached.phase !== PHASE_FOCUS
      ? {
          ...cached,
          phase: PHASE_FOCUS,
          remainingSec: getFocusDurationSec(),
          focusDeadlineTs: 0,
          running: false,
          hasStarted: false,
          activeBreakKind: "",
          breakRemainingSec: 0,
          breakDeadlineTs: 0,
          skipUnlockedAfterPostpone: false,
        }
      : cached;
    const restoredFocusRemaining = restored.running
      ? (
          restored.focusDeadlineTs > 0
            ? getRemainingFromDeadline(restored.focusDeadlineTs)
            : Math.max(0, Math.floor(Number(restored.remainingSec || 0)) - cachedAgeSec)
        )
      : Math.max(0, Math.floor(Number(restored.remainingSec || 0)));
    const restoredBreakRemaining = restored.activeBreakKind
      ? (
          restored.breakDeadlineTs > 0
            ? getRemainingFromDeadline(restored.breakDeadlineTs)
            : Math.max(0, Math.floor(Number(restored.breakRemainingSec || 0)) - cachedAgeSec)
        )
      : Math.max(0, Math.floor(Number(restored.breakRemainingSec || 0)));
    phase = restored.phase;
    remainingSec = restoredFocusRemaining;
    focusDeadlineTs = restored.running && restoredFocusRemaining > 0
      ? (
          restored.focusDeadlineTs > 0
            ? restored.focusDeadlineTs
            : Date.now() + restoredFocusRemaining * 1000
        )
      : 0;
    running = restored.running && restoredFocusRemaining > 0;
    hasStarted = restored.hasStarted && restoredFocusRemaining > 0;
    completedFocusCount = restored.completedFocusCount;
    focusSinceBreakSec = Math.max(
      0,
      Math.floor(Number(restored.focusSinceBreakSec || 0)) + (restored.activeBreakKind ? 0 : cachedAgeSec),
    );
    nextMiniBreakAtSec = restored.nextMiniBreakAtSec;
    nextLongBreakAtSec = restored.nextLongBreakAtSec;
    nextMiniWarnAtSec = restored.nextMiniWarnAtSec;
    nextLongWarnAtSec = restored.nextLongWarnAtSec;
    lastBreakReminderAtSec = restored.lastBreakReminderAtSec;
    activeBreakKind = restoredBreakRemaining > 0
      ? /** @type {"" | "mini" | "long"} */ (restored.activeBreakKind)
      : "";
    breakRemainingSec = restoredBreakRemaining;
    breakDeadlineTs = restoredBreakRemaining > 0
      ? (
          restored.breakDeadlineTs > 0
            ? restored.breakDeadlineTs
            : Date.now() + restoredBreakRemaining * 1000
        )
      : 0;
    skipUnlockedAfterPostpone = restored.skipUnlockedAfterPostpone;
  }

  function shouldTickBreakReminderClock() {
    if (!safeConfig.breakReminderEnabled) return false;
    if (activeBreakKind) return false;
    return true;
  }

  async function syncBreakReminderWatchdogState() {
    const enabled = safeConfig.breakReminderEnabled === true;
    const activeKind = String(activeBreakKind || "");
    const miniDueAtMs = enabled && !activeKind
      ? Date.now() + Math.max(0, nextMiniBreakAtSec - focusSinceBreakSec) * 1000
      : 0;
    const longDueAtMs = enabled && !activeKind
      ? Date.now() + Math.max(0, nextLongBreakAtSec - focusSinceBreakSec) * 1000
      : 0;
    await invoke("sync_break_reminder_watchdog", {
      snapshot: {
        enabled,
        activeBreakKind: activeKind,
        miniDueAtMs,
        longDueAtMs,
      },
    });
  }

  function persistTimerRuntimeToCache() {
    if (!hasStarted && !running) {
      clearFocusTimerRuntimeCache();
      return;
    }
    saveFocusTimerRuntimeCache({
      phase,
      remainingSec,
      focusDeadlineTs,
      running,
      hasStarted,
      completedFocusCount,
      focusSinceBreakSec,
      nextMiniBreakAtSec,
      nextLongBreakAtSec,
      nextMiniWarnAtSec,
      nextLongWarnAtSec,
      lastBreakReminderAtSec,
      activeBreakKind,
      breakRemainingSec,
      breakDeadlineTs,
      skipUnlockedAfterPostpone,
      savedAt: Date.now(),
    });
  }

  /** @param {number} sec */
  function formatTimer(sec) {
    const safe = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(safe / 60)).padStart(2, "0");
    const ss = String(safe % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  /** @param {number} day */
  function weekdayLabel(day) {
    const labels = [
      strings.weekdayMon,
      strings.weekdayTue,
      strings.weekdayWed,
      strings.weekdayThu,
      strings.weekdayFri,
      strings.weekdaySat,
      strings.weekdaySun,
    ];
    return labels[day - 1] || String(day);
  }

  /** @param {any[]} next */
  function emitTasks(next) {
    Promise.resolve(onTasksChange(next)).catch((e) => console.error("emit focus tasks", e));
  }

  /** @param {Record<string, any>} next */
  function emitStats(next) {
    Promise.resolve(onStatsChange(next)).catch((e) => console.error("emit focus stats", e));
  }

  /**
   * @param {{ mode: string; untilTs: number; scope?: string; taskId?: string; taskTitle?: string }} next
   */
  function emitBreakSession(next) {
    const safe = normalizeBreakSession(next);
    localBreakSession = safe;
    Promise.resolve(onBreakSessionChange(safe)).catch((e) =>
      console.error("emit focus break session", e),
    );
  }

  /**
   * @param {string} mode
   * @param {{ scope?: string; taskId?: string; taskTitle?: string }} [binding]
   */
  function startBreakSession(mode, binding = {}) {
    emitBreakSession(createBreakSession(mode, nowTick, binding));
  }

  function clearBreakSession() {
    emitBreakSession({
      mode: BREAK_SESSION_NONE,
      untilTs: 0,
      scope: BREAK_SESSION_SCOPE_GLOBAL,
      taskId: "",
      taskTitle: "",
    });
  }

  function completeFocusCycle() {
    completedFocusCount += 1;
    phase = PHASE_FOCUS;
    remainingSec = getFocusDurationSec();
    focusDeadlineTs = 0;
    running = false;
    hasStarted = false;
  }

  /** @param {"mini" | "long"} kind */
  function applyBreakNow(kind) {
    activeBreakKind = kind;
    lastBreakReminderAtSec = -1;
    breakRemainingSec = kind === BREAK_KIND_LONG ? breakPlanSec.longDurationSec : breakPlanSec.miniDurationSec;
    breakDeadlineTs = Date.now() + breakRemainingSec * 1000;
    if (kind === BREAK_KIND_LONG) {
      focusSinceBreakSec = 0;
      nextLongBreakAtSec = breakPlanSec.longEverySec;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
    } else {
      // Mini break should not reset the long-break countdown.
      nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec;
    }
    nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
  }

  function postponeBreak() {
    if (!activeBreakKind) return;
    if (safeConfig.breakStrictMode) return;
    const deltaSec = 2 * 60;
    if (activeBreakKind === BREAK_KIND_LONG) {
      nextLongBreakAtSec = focusSinceBreakSec + deltaSec;
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    } else {
      nextMiniBreakAtSec = focusSinceBreakSec + deltaSec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
    activeBreakKind = "";
    breakRemainingSec = 0;
    breakDeadlineTs = 0;
    skipUnlockedAfterPostpone = true;
  }

  function skipBreak() {
    if (!activeBreakKind) return;
    if (safeConfig.breakStrictMode) return;
    if (!skipUnlockedAfterPostpone) return;
    if (activeBreakKind === BREAK_KIND_LONG) {
      nextLongBreakAtSec = focusSinceBreakSec + breakPlanSec.longEverySec;
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    } else {
      nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
    activeBreakKind = "";
    breakRemainingSec = 0;
    breakDeadlineTs = 0;
    skipUnlockedAfterPostpone = false;
  }

  /** @param {number} elapsedSec */
  function tickBreakReminderClock(elapsedSec = 1) {
    if (!safeConfig.breakReminderEnabled) return;
    focusSinceBreakSec += Math.max(1, Math.floor(elapsedSec));
    if (
      breakPlanSec.notifyBeforeSec > 0 &&
      focusSinceBreakSec >= nextLongWarnAtSec &&
      focusSinceBreakSec < nextLongBreakAtSec &&
      lastBreakReminderAtSec !== nextLongWarnAtSec
    ) {
      lastBreakReminderAtSec = nextLongWarnAtSec;
      notifyBreak("warn", BREAK_KIND_LONG);
    } else if (
      breakPlanSec.notifyBeforeSec > 0 &&
      focusSinceBreakSec >= nextMiniWarnAtSec &&
      focusSinceBreakSec < nextMiniBreakAtSec &&
      lastBreakReminderAtSec !== nextMiniWarnAtSec
    ) {
      lastBreakReminderAtSec = nextMiniWarnAtSec;
      notifyBreak("warn", BREAK_KIND_MINI);
    }
    const dueKind = focusSinceBreakSec >= nextLongBreakAtSec
      ? BREAK_KIND_LONG
      : (focusSinceBreakSec >= nextMiniBreakAtSec ? BREAK_KIND_MINI : "");
    if (!dueKind) return;
    const dueAt = dueKind === BREAK_KIND_LONG ? nextLongBreakAtSec : nextMiniBreakAtSec;
    if (lastBreakReminderAtSec !== dueAt) {
      lastBreakReminderAtSec = dueAt;
      notifyBreak("start", dueKind);
    }
    applyBreakNow(dueKind);
  }

  /**
   * @param {number} nowTs
   */
  function tickTaskStartReminderClock(nowTs) {
    if (!safeConfig.taskStartReminderEnabled) return;
    if (!notifyEnabled) return;
    const now = new Date(nowTs);
    const dateKey = getDateKey(now);
    if (taskStartReminderDateKey !== dateKey) {
      taskStartReminderDateKey = dateKey;
      sentTaskStartReminderKeys = new Set();
    }
    const leadMinutes = clampInt(safeConfig.taskStartReminderLeadMinutes, 10, 1, 60);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayStats = ensureDayStats(stats, dateKey);
    const tasksForToday = getTodayTasks(tasks, now);
    for (const task of tasksForToday) {
      const taskId = String(task?.id || "");
      if (!taskId) continue;
      const sentKey = `${dateKey}:${taskId}`;
      if (sentTaskStartReminderKeys.has(sentKey)) continue;
      const startMinutes = timeToMinutes(String(task.startTime || "00:00"));
      const remindAt = Math.max(0, startMinutes - leadMinutes);
      if (nowMinutes < remindAt || nowMinutes >= startMinutes) continue;
      sentTaskStartReminderKeys.add(sentKey);
      notifyTaskStart(task, leadMinutes).catch((error) =>
        console.error("notify task start reminder", error),
      );
      break;
    }
  }

  /**
   * @param {"mini" | "long"} kind
   * @param {number} minutes
   */
  function changeIndependentBreakEveryMinutes(kind, minutes) {
    const safeMinutes = kind === "mini"
      ? clampInt(minutes, safeConfig.independentMiniBreakEveryMinutes, 1, 180)
      : clampInt(minutes, safeConfig.independentLongBreakEveryMinutes, 1, 360);
    const next = {
      ...safeConfig,
      independentMiniBreakEveryMinutes: kind === "mini"
        ? safeMinutes
        : safeConfig.independentMiniBreakEveryMinutes,
      independentLongBreakEveryMinutes: kind === "long"
        ? safeMinutes
        : safeConfig.independentLongBreakEveryMinutes,
      // Keep default cadence in sync so selected-task mode also reflects the change.
      miniBreakEveryMinutes: kind === "mini" ? safeMinutes : safeConfig.miniBreakEveryMinutes,
      longBreakEveryMinutes: kind === "long" ? safeMinutes : safeConfig.longBreakEveryMinutes,
    };
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("change independent break intervals", e),
    );
  }

  /**
   * @param {"mini" | "long"} kind
   * @param {number} value
   */
  function changeBreakDuration(kind, value) {
    const next = {
      ...safeConfig,
      miniBreakDurationSeconds: kind === "mini"
        ? clampInt(value, safeConfig.miniBreakDurationSeconds, 10, 300)
        : safeConfig.miniBreakDurationSeconds,
      longBreakDurationMinutes: kind === "long"
        ? clampInt(value, safeConfig.longBreakDurationMinutes, 1, 30)
        : safeConfig.longBreakDurationMinutes,
    };
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("change break duration", e),
    );
  }

  /**
   * @param {"mini" | "long"} kind
   * @param {number} seconds
   */
  function scheduleBreakSoon(kind, seconds = 10) {
    const safeSec = clampInt(seconds, 10, 10, 600);
    if (kind === "long") {
      nextLongBreakAtSec = focusSinceBreakSec + safeSec;
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
      return;
    }
    nextMiniBreakAtSec = focusSinceBreakSec + safeSec;
    nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
  }

  /**
   * @param {boolean} enabled
   */
  function setBreakReminderEnabled(enabled) {
    const nextEnabled = enabled === true;
    if (nextEnabled === safeConfig.breakReminderEnabled) return;
    if (nextEnabled) {
      ensureNotificationPermissionFromUserGesture().catch((error) =>
        console.error("focus request notification permission", error),
      );
    }
    if (!nextEnabled) {
      activeBreakKind = "";
      breakRemainingSec = 0;
      breakDeadlineTs = 0;
    } else {
      focusSinceBreakSec = 0;
      lastBreakReminderAtSec = -1;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
      nextLongBreakAtSec = breakPlanSec.longEverySec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
    const next = {
      ...safeConfig,
      breakReminderEnabled: nextEnabled,
    };
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("toggle break reminder", e),
    );
  }

  async function ensureNotificationPermissionFromUserGesture() {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    notifyChecked = true;
    if (Notification.permission === "granted") {
      notifyEnabled = true;
      return;
    }
    if (Notification.permission === "denied") {
      notifyEnabled = false;
      return;
    }
    const result = await Notification.requestPermission();
    notifyEnabled = result === "granted";
  }

  /** @param {string} mode */
  function changeBreakReminderMode(mode) {
    const next = {
      ...safeConfig,
      breakReminderMode: normalizeBreakReminderMode(mode),
    };
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("change break reminder mode", e),
    );
  }

  function toggleRunning() {
    if (remainingSec <= 0) remainingSec = getFocusDurationSec();
    phase = PHASE_FOCUS;
    const nextRunning = !running;
    if (nextRunning) {
      focusDeadlineTs = Date.now() + Math.max(0, remainingSec) * 1000;
      running = true;
      hasStarted = true;
      return;
    }
    remainingSec = focusDeadlineTs > 0 ? getRemainingFromDeadline(focusDeadlineTs) : remainingSec;
    focusDeadlineTs = 0;
    running = false;
  }

  function resetCurrentPhase() {
    phase = PHASE_FOCUS;
    focusDeadlineTs = 0;
    running = false;
    hasStarted = false;
    remainingSec = getFocusDurationSec();
  }

  /** @param {number} minutes */
  function applyFocusPreset(minutes) {
    const safeMinutes = clampInt(minutes, safeConfig.focusMinutes, 5, 90);
    draftFocusMinutes = safeMinutes;
    const next = {
      ...safeConfig,
      focusMinutes: safeMinutes,
    };
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("apply focus preset", e),
    );
    if (!running && phase === PHASE_FOCUS) {
      remainingSec = safeMinutes * 60;
      focusDeadlineTs = 0;
    }
  }

  /** @param {string} taskId */
  function startTaskFocus(taskId) {
    selectedTaskId = taskId;
    phase = PHASE_FOCUS;
    remainingSec = getFocusDurationSec();
    focusDeadlineTs = Date.now() + remainingSec * 1000;
    running = true;
    hasStarted = true;
  }

  /** @param {string} taskId */
  function selectTask(taskId) {
    selectedTaskId = taskId || "";
  }

  /** @param {string} taskId */
  function removeTask(taskId) {
    const { nextTasks, nextStats } = removeTaskFromState(tasks, stats, taskId);
    if (selectedTaskId === taskId) selectedTaskId = "";
    emitTasks(nextTasks);
    emitStats(nextStats);
  }

  /**
   * @param {string} taskId
   * @param {{
   * title?: string;
   * startTime?: string;
   * endTime?: string;
   * recurrence?: string;
   * weekdays?: number[];
   * }} patch
   */
  function updateTask(taskId, patch) {
    emitTasks(updateTaskInState(tasks, taskId, patch));
  }

  function addTask() {
    const title = draftTitle.trim();
    if (!title) return;
    const next = buildFocusTaskFromDraft({
      title,
      startTime: draftStartTime,
      endTime: draftEndTime,
      recurrence: draftRecurrence,
      weekdays: draftRecurrence === RECURRENCE.CUSTOM ? draftWeekdays : [],
    });
    emitTasks([...tasks, next]);
    draftTitle = "";
    if (!selectedTaskId) selectedTaskId = next.id;
  }

  /** @param {number} day */
  function toggleDraftWeekday(day) {
    const has = draftWeekdays.includes(day);
    if (has) {
      draftWeekdays = draftWeekdays.filter((d) => d !== day);
    } else {
      draftWeekdays = [...draftWeekdays, day].sort((a, b) => a - b);
    }
  }

  function saveTimerConfig() {
    const next = {
      breakReminderEnabled: safeConfig.breakReminderEnabled,
      focusMinutes: clampInt(draftFocusMinutes, safeConfig.focusMinutes, 5, 90),
      shortBreakMinutes: safeConfig.shortBreakMinutes,
      longBreakMinutes: safeConfig.longBreakMinutes,
      longBreakEvery: safeConfig.longBreakEvery,
      miniBreakEveryMinutes: clampInt(
        draftMiniBreakEveryMinutes,
        safeConfig.miniBreakEveryMinutes,
        1,
        60,
      ),
      miniBreakDurationSeconds: clampInt(
        draftMiniBreakDurationSeconds,
        safeConfig.miniBreakDurationSeconds,
        10,
        300,
      ),
      longBreakEveryMinutes: clampInt(
        draftLongBreakEveryMinutes,
        safeConfig.longBreakEveryMinutes,
        1,
        180,
      ),
      longBreakDurationMinutes: clampInt(
        draftLongBreakDurationMinutes,
        safeConfig.longBreakDurationMinutes,
        1,
        30,
      ),
      breakNotifyBeforeSeconds: clampInt(
        draftBreakNotifyBeforeSeconds,
        safeConfig.breakNotifyBeforeSeconds,
        0,
        120,
      ),
      taskStartReminderEnabled: draftTaskStartReminderEnabled,
      taskStartReminderLeadMinutes: clampInt(
        draftTaskStartReminderLeadMinutes,
        safeConfig.taskStartReminderLeadMinutes,
        1,
        60,
      ),
      miniBreakPostponeMinutes: clampInt(
        draftMiniBreakPostponeMinutes,
        safeConfig.miniBreakPostponeMinutes,
        1,
        30,
      ),
      longBreakPostponeMinutes: clampInt(
        draftLongBreakPostponeMinutes,
        safeConfig.longBreakPostponeMinutes,
        1,
        60,
      ),
      breakPostponeLimit: clampInt(
        draftBreakPostponeLimit,
        safeConfig.breakPostponeLimit,
        0,
        10,
      ),
      breakStrictMode: draftBreakStrictMode,
      breakReminderMode: safeConfig.breakReminderMode,
      independentMiniBreakEveryMinutes: safeConfig.independentMiniBreakEveryMinutes,
      independentLongBreakEveryMinutes: safeConfig.independentLongBreakEveryMinutes,
    };
    if (next.taskStartReminderEnabled) {
      ensureNotificationPermissionFromUserGesture().catch((error) =>
        console.error("focus request notification permission for task reminder", error),
      );
    }
    Promise.resolve(onPomodoroConfigChange(next)).catch((e) =>
      console.error("save pomodoro config", e),
    );
    if (!running && !hasStarted) {
      phase = PHASE_FOCUS;
      remainingSec = getFocusDurationSec(next);
      focusDeadlineTs = 0;
    }
    showConfig = false;
  }

  function openTimerSettings() {
    draftFocusMinutes = safeConfig.focusMinutes;
    draftMiniBreakEveryMinutes = safeConfig.miniBreakEveryMinutes;
    draftMiniBreakDurationSeconds = safeConfig.miniBreakDurationSeconds;
    draftLongBreakEveryMinutes = safeConfig.longBreakEveryMinutes;
    draftLongBreakDurationMinutes = safeConfig.longBreakDurationMinutes;
    draftBreakNotifyBeforeSeconds = safeConfig.breakNotifyBeforeSeconds;
    draftTaskStartReminderEnabled = safeConfig.taskStartReminderEnabled;
    draftTaskStartReminderLeadMinutes = safeConfig.taskStartReminderLeadMinutes;
    draftMiniBreakPostponeMinutes = safeConfig.miniBreakPostponeMinutes;
    draftLongBreakPostponeMinutes = safeConfig.longBreakPostponeMinutes;
    draftBreakPostponeLimit = safeConfig.breakPostponeLimit;
    draftBreakStrictMode = safeConfig.breakStrictMode;
    showConfig = true;
  }

  /**
   * @param {"warn" | "start"} stage
   * @param {"mini" | "long"} kind
   */
  async function notifyBreak(stage, kind) {
    if (!notifyEnabled) return;
    const isMini = kind === BREAK_KIND_MINI;
    const title = stage === "warn"
      ? (isMini
          ? (strings.pomodoroMiniBreakSoon || "Mini break soon")
          : (strings.pomodoroLongBreakSoon || "Long break soon"))
      : (isMini
          ? (strings.pomodoroMiniBreakNow || "Take a mini break")
          : (strings.pomodoroLongBreakNow || "Take a long break"));
    const body = stage === "warn"
      ? `${strings.pomodoroBreakIn || "Break in"} ${formatSecondsBrief(breakPlanSec.notifyBeforeSec)}`
      : `${strings.pomodoroBreakDuration || "Duration"} ${
          isMini ? formatSecondsBrief(breakPlanSec.miniDurationSec) : `${safeConfig.longBreakDurationMinutes}m`
        }`;
    await sendDesktopNotification(title, body);
  }

  /**
   * @param {{ title?: string; startTime?: string }} task
   * @param {number} leadMinutes
   */
  async function notifyTaskStart(task, leadMinutes) {
    if (!notifyEnabled) return;
    const title = strings.pomodoroTaskStartSoon || "Task starts soon";
    const taskTitle = String(task?.title || strings.pomodoroNoTaskSelected || "Not selected");
    const startTime = String(task?.startTime || "00:00");
    const body = `${taskTitle} · ${strings.pomodoroTaskStartAt || "Starts at"} ${startTime} · ${
      strings.pomodoroTaskStartLead || "In"
    } ${leadMinutes}m`;
    await sendDesktopNotification(title, body);
  }

  /**
   * @returns {Record<string, any>}
   */
  function buildBreakOverlayPayload() {
    const isLong = activeBreakKind === BREAK_KIND_LONG;
    const safeTotal = Math.max(
      1,
      Math.floor(isLong ? breakPlanSec.longDurationSec : breakPlanSec.miniDurationSec),
    );
    const safeRemaining = Math.max(0, Math.floor(breakRemainingSec));
    const progress = Math.max(0, Math.min(100, Math.round(((safeTotal - safeRemaining) / safeTotal) * 100)));
    return {
      title: isLong
        ? (strings.pomodoroLongBreakNow || "Take a long break")
        : (strings.pomodoroMiniBreakNow || "Take a mini break"),
      taskText: "",
      remainingPrefix: strings.pomodoroBreakRemaining || "Remaining",
      remainingText: `${strings.pomodoroBreakRemaining || "Remaining"} ${formatTimer(safeRemaining)}`,
      remainingSeconds: safeRemaining,
      totalSeconds: safeTotal,
      endAtTs: breakDeadlineTs > 0 ? breakDeadlineTs : (Date.now() + safeRemaining * 1000),
      progress,
      showPostpone: safeConfig.breakStrictMode !== true,
      postponeText: strings.pomodoroBreakPostponeTwoMinutes || "Postpone 2m",
      skipText: strings.pomodoroSkip || "Skip",
      showSkip: safeConfig.breakStrictMode !== true && skipUnlockedAfterPostpone === true,
      postponeDisabled: safeConfig.breakStrictMode === true,
      skipDisabled: safeConfig.breakStrictMode === true || !skipUnlockedAfterPostpone,
      strictMode: safeConfig.breakStrictMode === true,
      strictModeText: strings.pomodoroBreakStrictMode || "Strict mode",
    };
  }

  async function ensureBreakOverlayLabels() {
    if (Array.isArray(breakOverlayLabels) && breakOverlayLabels.length > 0) {
      return breakOverlayLabels;
    }
    if (overlayEnsurePromise) {
      return overlayEnsurePromise;
    }
    overlayEnsurePromise = ensureBreakOverlayWindows()
      .then((labels) => {
        const safeLabels = Array.isArray(labels)
          ? Array.from(new Set(labels.map((label) => String(label || "")).filter(Boolean)))
          : [];
        breakOverlayLabels = safeLabels;
        return safeLabels;
      })
      .catch((error) => {
        console.error("focus ensure break overlay windows", error);
        breakOverlayLabels = [];
        return [];
      })
      .finally(() => {
        overlayEnsurePromise = null;
      });
    return overlayEnsurePromise;
  }

  async function syncBreakOverlay() {
    if (!breakTimerActive) return;
    if (overlayClosing) return;
    if (overlaySyncInFlight) {
      overlaySyncQueued = true;
      return;
    }
    overlaySyncInFlight = true;
    try {
      const labels = await ensureBreakOverlayLabels();
      if (!Array.isArray(labels) || labels.length === 0) return;
      const payload = buildBreakOverlayPayload();
      const payloadKey = [
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
      if (payloadKey === lastOverlayPayloadKey) return;
      lastOverlayPayloadKey = payloadKey;
      const healthyLabels = await emitBreakOverlayState(labels, payload);
      if (healthyLabels.length !== labels.length) {
        breakOverlayLabels = healthyLabels;
        lastOverlayPayloadKey = "";
      }
    } finally {
      overlaySyncInFlight = false;
      if (overlaySyncQueued) {
        overlaySyncQueued = false;
        syncBreakOverlay().catch((error) => console.error("focus queued sync break overlay", error));
      }
    }
  }

  /**
   * @param {boolean} [force]
   */
  async function closeBreakOverlayEverywhere(force = false) {
    if (overlayClosing) return;
    const labels = Array.isArray(breakOverlayLabels) ? [...breakOverlayLabels] : [];
    if (!force && labels.length === 0) return;
    overlayClosing = true;
    if (labels.length > 0) {
      try {
        await emitBreakOverlayState(labels, { close: true });
      } catch (error) {
        console.error("focus emit break overlay close", error);
      }
      await closeBreakOverlayWindowsByLabels(labels);
    }
    try {
      await closeBreakOverlayWindows();
    } finally {
      if (breakOverlayLabels.length > 0) breakOverlayLabels = [];
      overlayEnsurePromise = null;
      breakOverlaySyncNonce += 1;
      lastOverlayPayloadKey = "";
      overlayClosing = false;
    }
  }

  function onFocusCompleted() {
    emitStats(applyFocusCompleted(stats, todayKey, selectedTaskId, safeConfig.focusMinutes));
  }

  $effect(() => {
    if (running || hasStarted) return;
    const target = getFocusDurationSec();
    if (remainingSec !== target) remainingSec = target;
    if (focusDeadlineTs !== 0) focusDeadlineTs = 0;
    if (phase !== PHASE_FOCUS) phase = PHASE_FOCUS;
  });

  $effect(() => {
    const next = String(selectedTaskIdProp || "");
    if (!next || next === selectedTaskId) return;
    // Skip stale parent echo to avoid overriding a newer local selection.
    if (next === lastSyncedSelectedTaskId) return;
    selectedTaskId = next;
  });

  $effect(() => {
    const next = normalizeBreakSession(breakSession);
    if (
      next.mode === localBreakSession.mode &&
      next.untilTs === localBreakSession.untilTs &&
      next.scope === localBreakSession.scope &&
      next.taskId === localBreakSession.taskId &&
      next.taskTitle === localBreakSession.taskTitle
    ) return;
    localBreakSession = next;
  });

  $effect(() => {
    if (!localBreakSession || localBreakSession.mode === BREAK_SESSION_NONE) return;
    if (isBreakSessionActive(localBreakSession, nowTick)) return;
    clearBreakSession();
  });

  $effect(() => {
    const nonce = Number(command?.nonce || 0);
    if (!nonce || nonce === lastCommandNonce) return;
    lastCommandNonce = nonce;
    const taskId = String(command?.taskId || "");
    if (!taskId) return;
    if (!focusSelectableTasks.some((task) => task.id === taskId)) return;
    if (command?.type === "start") {
      startTaskFocus(taskId);
      return;
    }
    selectTask(taskId);
  });

  $effect(() => {
    if (selectedTaskId === lastSyncedSelectedTaskId) return;
    lastSyncedSelectedTaskId = selectedTaskId;
    Promise.resolve(onSelectedTaskIdChange(selectedTaskId)).catch((e) =>
      console.error("emit selected focus task", e),
    );
  });

  $effect(() => {
    if (focusSelectableTasks.length === 0) {
      if (selectedTaskId) selectedTaskId = "";
      return;
    }
    if (!focusSelectableTasks.some((task) => task.id === selectedTaskId)) {
      selectedTaskId = focusSelectableTasks[0].id;
    }
  });

  $effect(() => {
    const miniEvery = breakPlanSec.miniEverySec;
    const longEvery = breakPlanSec.longEverySec;
    if (focusSinceBreakSec >= nextMiniBreakAtSec) {
      nextMiniBreakAtSec = focusSinceBreakSec + miniEvery;
    } else if (nextMiniBreakAtSec <= 0 || nextMiniBreakAtSec > focusSinceBreakSec + miniEvery * 2) {
      nextMiniBreakAtSec = focusSinceBreakSec + miniEvery;
    }
    if (focusSinceBreakSec >= nextLongBreakAtSec) {
      nextLongBreakAtSec = focusSinceBreakSec + longEvery;
    } else if (nextLongBreakAtSec <= 0 || nextLongBreakAtSec > focusSinceBreakSec + longEvery * 2) {
      nextLongBreakAtSec = focusSinceBreakSec + longEvery;
    }
    nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
  });

  $effect(() => {
    if (!activeBreakKind) return;
    showBreakPanel = true;
  });

  $effect(() => {
    if (safeConfig.breakReminderEnabled) return;
    if (activeBreakKind) {
      activeBreakKind = "";
      breakRemainingSec = 0;
      breakDeadlineTs = 0;
    }
  });

  $effect(() => {
    const active = breakTimerActive;
    if (active === overlayLifecycleActive) return;
    overlayLifecycleActive = active;
    if (!active) {
      closeBreakOverlayEverywhere(true).catch((error) =>
        console.error("focus close break overlay windows", error),
      );
      return;
    }
    const nonce = ++breakOverlaySyncNonce;
    (async () => {
      const labels = await ensureBreakOverlayLabels();
      if (nonce !== breakOverlaySyncNonce) return;
      if (!Array.isArray(labels) || labels.length === 0) return;
      await syncBreakOverlay();
    })();
  });

  $effect(() => {
    if (!breakTimerActive) return;
    if (breakRemainingSec > 0) return;
    activeBreakKind = "";
    breakRemainingSec = 0;
    breakDeadlineTs = 0;
    skipUnlockedAfterPostpone = false;
    closeBreakOverlayEverywhere(true).catch((error) =>
      console.error("focus force close overlay at zero", error),
    );
  });

  $effect(() => {
    if (!breakTimerActive) return;
    const _tick = breakRemainingSec;
    const _skipReady = skipUnlockedAfterPostpone;
    const _strict = safeConfig.breakStrictMode;
    const _labelsCount = breakOverlayLabels.length;
    void _tick;
    void _skipReady;
    void _strict;
    void _labelsCount;
    syncBreakOverlay().catch((error) => {
      console.error("focus sync break overlay", error);
    });
  });

  onMount(async () => {
    restoreTimerRuntimeFromCache();
    timerRuntimeRestored = true;
    try {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      notifyChecked = true;
      notifyEnabled = Notification.permission === "granted";
    } catch (error) {
      console.error("focus notification bootstrap", error);
    }
  });

  onMount(() => {
    let lastClockTs = Date.now();
    const clockId = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - lastClockTs) / 1000));
      if (elapsedSec > 0) {
        lastClockTs += elapsedSec * 1000;
      }
      nowTick = now;
      tickTaskStartReminderClock(now);
      if (elapsedSec > 0 && shouldTickBreakReminderClock()) {
        tickBreakReminderClock(elapsedSec);
      }
    }, 1000);
    return () => clearInterval(clockId);
  });

  onMount(() => {
    /** @type {null | (() => void)} */
    let unlistenAction = null;
    /** @type {null | (() => void)} */
    let unlistenReady = null;
    /** @type {null | (() => void)} */
    let unlistenDue = null;
    let disposed = false;

    const bootstrap = async () => {
      try {
        unlistenAction = await listen(BREAK_OVERLAY_EVENT_ACTION, (event) => {
          const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
          const action = String(payload?.action || "");
          if (!breakTimerActive) return;
          if (action === "postpone") {
            if (safeConfig.breakStrictMode) return;
            postponeBreak();
            return;
          }
          if (action === "skip") {
            if (safeConfig.breakStrictMode) return;
            skipBreak();
          }
        });
      } catch (error) {
        console.error("focus listen break overlay action", error);
      }

      try {
        unlistenReady = await listen(BREAK_OVERLAY_EVENT_READY, (event) => {
          const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
          const label = String(payload?.label || "");
          if (!label) return;
          if (!breakTimerActive) return;
          if (!breakOverlayLabels.includes(label)) {
            breakOverlayLabels = [...breakOverlayLabels, label];
          }
          emitBreakOverlayState([label], buildBreakOverlayPayload()).catch((error) =>
            console.error("focus emit break overlay ready sync", error),
          );
        });
      } catch (error) {
        console.error("focus listen break overlay ready", error);
      }

      try {
        unlistenDue = await listen(BREAK_DUE_EVENT, (event) => {
          const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
          const kind = String(payload?.kind || "");
          if (!safeConfig.breakReminderEnabled) return;
          if (activeBreakKind) return;
          if (kind !== BREAK_KIND_MINI && kind !== BREAK_KIND_LONG) return;
          notifyBreak("start", kind).catch((error) =>
            console.error("focus notify native break due", error),
          );
          applyBreakNow(kind);
        });
      } catch (error) {
        console.error("focus listen native break due", error);
      }
    };

    bootstrap();

    return () => {
      disposed = true;
      try {
        unlistenAction?.();
      } catch (error) {
        console.error("focus unlisten break overlay action", error);
      }
      try {
        unlistenReady?.();
      } catch (error) {
        console.error("focus unlisten break overlay ready", error);
      }
      try {
        unlistenDue?.();
      } catch (error) {
        console.error("focus unlisten native break due", error);
      }
      if (disposed) {
        closeBreakOverlayEverywhere(true).catch((error) =>
          console.error("focus close break overlay windows on destroy", error),
        );
        invoke("sync_break_reminder_watchdog", {
          snapshot: {
            enabled: false,
            activeBreakKind: "",
            miniDueAtMs: 0,
            longDueAtMs: 0,
          },
        }).catch((error) => console.error("focus disable break reminder watchdog on destroy", error));
      }
    };
  });

  $effect(() => {
    const _enabled = safeConfig.breakReminderEnabled;
    const _activeBreakKind = activeBreakKind;
    const _focusSinceBreak = focusSinceBreakSec;
    const _miniAt = nextMiniBreakAtSec;
    const _longAt = nextLongBreakAtSec;
    void _enabled;
    void _activeBreakKind;
    void _focusSinceBreak;
    void _miniAt;
    void _longAt;
    syncBreakReminderWatchdogState().catch((error) =>
      console.error("focus sync break reminder watchdog", error),
    );
  });

  $effect(() => {
    if (!timerRuntimeRestored) return;
    const _phase = phase;
    const _remaining = remainingSec;
    const _running = running;
    const _started = hasStarted;
    const _count = completedFocusCount;
    const _focusSinceBreak = focusSinceBreakSec;
    const _miniAt = nextMiniBreakAtSec;
    const _longAt = nextLongBreakAtSec;
    const _miniWarn = nextMiniWarnAtSec;
    const _longWarn = nextLongWarnAtSec;
    const _lastReminder = lastBreakReminderAtSec;
    const _activeBreak = activeBreakKind;
    const _breakRemaining = breakRemainingSec;
    const _skipUnlocked = skipUnlockedAfterPostpone;
    void _phase;
    void _remaining;
    void _running;
    void _started;
    void _count;
    void _focusSinceBreak;
    void _miniAt;
    void _longAt;
    void _miniWarn;
    void _longWarn;
    void _lastReminder;
    void _activeBreak;
    void _breakRemaining;
    void _skipUnlocked;
    persistTimerRuntimeToCache();
  });

  $effect(() => {
    if (!breakTimerActive) return;
    const id = setInterval(() => {
      if (!activeBreakKind) return;
      const nextRemaining = breakDeadlineTs > 0 ? getRemainingFromDeadline(breakDeadlineTs) : breakRemainingSec;
      if (nextRemaining <= 0) {
        activeBreakKind = "";
        breakRemainingSec = 0;
        breakDeadlineTs = 0;
        skipUnlockedAfterPostpone = false;
        closeBreakOverlayEverywhere(true).catch((error) =>
          console.error("focus close break overlay windows on independent break complete", error),
        );
        return;
      }
      if (breakRemainingSec !== nextRemaining) {
        breakRemainingSec = nextRemaining;
      }
    }, 250);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!running) return;
      const nextRemaining = focusDeadlineTs > 0 ? getRemainingFromDeadline(focusDeadlineTs) : remainingSec;
      if (nextRemaining <= 0) {
        remainingSec = 0;
        focusDeadlineTs = 0;
        onFocusCompleted();
        completeFocusCycle();
        return;
      }
      if (remainingSec !== nextRemaining) {
        remainingSec = nextRemaining;
      }
    }, 250);
    return () => clearInterval(id);
  });
</script>

<section class="focus-hub" class:compact data-no-drag="true">
  <div class="focus-main">
    <div class="focus-slot timer-slot">
      <WorkspaceFocusTimer
        {strings}
        timerText={formatTimer(remainingSec)}
        breakMiniCountdownText={formatTimer(nextMiniBreakCountdown)}
        breakLongCountdownText={formatTimer(nextLongBreakCountdown)}
        taskText={selectedTask ? selectedTask.title : strings.pomodoroNoTaskSelected}
        phaseProgress={Math.round(
          ((getFocusDurationSec() - remainingSec) / Math.max(getFocusDurationSec(), 1)) * 100,
        )}
        {showBreakPanel}
        selectedTaskId={selectedTaskId}
        selectedTaskDonePomodoros={selectedTaskDonePomodoros}
        onToggleBreakPanel={(next = !showBreakPanel) => {
          showBreakPanel = !!next;
          if (showBreakPanel && showConfig) showConfig = false;
        }}
      >
        {#snippet breakPanel()}
          <WorkspaceBreakControlBar
            {strings}
            breakActive={Boolean(activeBreakKind)}
            canSkip={skipUnlockedAfterPostpone}
            nextMiniBreakText={formatTimer(nextMiniBreakCountdown)}
            nextLongBreakText={formatTimer(nextLongBreakCountdown)}
            breakReminderEnabled={safeConfig.breakReminderEnabled}
            independentMiniBreakEveryMinutes={safeConfig.independentMiniBreakEveryMinutes}
            independentLongBreakEveryMinutes={safeConfig.independentLongBreakEveryMinutes}
            miniBreakDurationSeconds={safeConfig.miniBreakDurationSeconds}
            longBreakDurationMinutes={safeConfig.longBreakDurationMinutes}
            onSetBreakReminderEnabled={setBreakReminderEnabled}
            onChangeIndependentBreakEveryMinutes={changeIndependentBreakEveryMinutes}
            onChangeBreakDuration={changeBreakDuration}
            onTriggerBreakSoon={scheduleBreakSoon}
            onPostponeBreak={postponeBreak}
            onSkipBreak={skipBreak}
          />
        {/snippet}
      </WorkspaceFocusTimer>
    </div>

    <div class="focus-slot planner-slot">
      <WorkspaceFocusPlanner
        {strings}
        recurrence={RECURRENCE}
        weekdays={FOCUS_WEEKDAYS}
        bind:draftTitle
        bind:draftStartTime
        bind:draftEndTime
        bind:draftRecurrence
        bind:draftWeekdays
        tasks={plannerTasks}
        showSettings={showConfig}
        selectedTaskId={selectedTaskId}
        activeTaskStarted={hasStarted}
        activeTaskRunning={running}
        activeTaskProgress={Math.round(
          ((getFocusDurationSec() - remainingSec) / Math.max(getFocusDurationSec(), 1)) * 100,
        )}
        showingAllTasks={plannerShowingAllTasks}
        todayTaskCount={todayTasks.length}
        todayStats={{
          taskCount: plannerTasks.length,
          donePomodoros: plannerDonePomodoros,
          taskPomodoros: todayStats.taskPomodoros,
        }}
        onAddTask={addTask}
        onToggleSettings={() => (showConfig ? (showConfig = false) : openTimerSettings())}
        onToggleWeekday={toggleDraftWeekday}
        onStartTask={startTaskFocus}
        onToggleTask={toggleRunning}
        onRemoveTask={removeTask}
        onUpdateTask={updateTask}
        {weekdayLabel}
      >
        {#snippet settingsPanel()}
          <WorkspaceFocusSettingsPanel
            {strings}
            bind:draftFocusMinutes
            bind:draftMiniBreakEveryMinutes
            bind:draftMiniBreakDurationSeconds
            bind:draftLongBreakEveryMinutes
            bind:draftLongBreakDurationMinutes
            bind:draftBreakNotifyBeforeSeconds
            bind:draftTaskStartReminderEnabled
            bind:draftTaskStartReminderLeadMinutes
            bind:draftMiniBreakPostponeMinutes
            bind:draftLongBreakPostponeMinutes
            bind:draftBreakPostponeLimit
            bind:draftBreakStrictMode
            onSaveSettings={saveTimerConfig}
            onCancelSettings={() => (showConfig = false)}
          />
        {/snippet}
      </WorkspaceFocusPlanner>
    </div>
  </div>

  <section class="stats-shell">
    <button type="button" class="stats-toggle" onclick={() => (showStats = !showStats)}>
      {showStats ? "▾" : "▸"} {strings.pomodoroStats}
      <span class="stats-quick">
        <span>{strings.pomodoroTodayFocusMinutes}: {Math.round((todayStats.focusSeconds || 0) / 60)}m</span>
        <span>{strings.pomodoroStreakDays}: {streakDays}d</span>
      </span>
    </button>
    {#if showStats}
      <WorkspaceFocusStats
        {strings}
        todayFocusMinutes={Math.round((todayStats.focusSeconds || 0) / 60)}
        todayPomodoros={todayStats.pomodoros || 0}
        todayTaskCount={todaySummary.taskCount}
        {weekFocusMinutes}
        {weekPomodoros}
        {weekAverageMinutes}
        {streakDays}
        bestDayDateKey={bestFocusDay.dateKey}
        bestDayMinutes={bestFocusDay.minutes}
        heatmapCells={focusHeatmap}
        taskDistribution={todayTaskDistribution}
        {currentMinutes}
      />
    {/if}
  </section>
</section>

<style>
  .focus-hub {
    display: grid;
    gap: 8px;
    min-height: 0;
    align-items: start;
  }

  .focus-main {
    display: grid;
    grid-template-columns: minmax(360px, 1fr) minmax(560px, 1.9fr);
    grid-template-areas: "timer planner";
    gap: 8px;
    min-height: 0;
    align-items: start;
  }

  .focus-hub.compact {
    gap: 7px;
  }

  .focus-hub.compact .focus-main {
    gap: 7px;
  }

  .focus-slot {
    min-width: 0;
    min-height: 0;
  }

  .timer-slot {
    grid-area: timer;
  }

  .planner-slot {
    grid-area: planner;
  }

  .focus-hub :global(.timer-card),
  .focus-hub :global(.planner-card) {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
  }

  .focus-hub :global(.btn) {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
  }

  .focus-hub :global(input),
  .focus-hub :global(select) {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 9px;
    background: var(--ws-card-bg, #fff);
    color: var(--ws-text, #334155);
  }

  .stats-shell {
    border: 1px solid var(--ws-border, #dbe5f2);
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.78)) 92%, transparent);
    padding: 8px;
  }

  .stats-toggle {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 10px;
    background: var(--ws-btn-bg, #fff);
    color: var(--ws-text, #334155);
    font-size: 12px;
    font-weight: 700;
    min-height: 34px;
    padding: 6px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .stats-quick {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ws-muted, #64748b);
  }

  .stats-quick span {
    border: 1px solid var(--ws-border-soft, #d6e0ee);
    border-radius: 999px;
    padding: 2px 8px;
    background: var(--ws-card-bg, #fff);
  }

  .stats-shell :global(.stats-card) {
    margin-top: 8px;
    min-height: 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1800px) {
    .focus-main {
      grid-template-columns: minmax(360px, 0.95fr) minmax(860px, 2.05fr);
      grid-template-areas: "timer planner";
    }
  }

  @media (max-width: 1360px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }

    .stats-shell :global(.stats-card) {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 980px) {
    .focus-main {
      grid-template-columns: 1fr;
      grid-template-areas:
        "timer"
        "planner";
    }

  }
</style>
