<script>
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
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
  import WorkspaceFocusStats from "$lib/components/workspace/focus/WorkspaceFocusStats.svelte";
  import { resolveBreakTimingConfig } from "$lib/workspace/focus/focus-break-profile.js";
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
    isFocusTaskCompleted,
    nextPhaseState,
    phaseLabel,
    PHASE_FOCUS,
    PHASE_LONG_BREAK,
    PHASE_SHORT_BREAK,
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
  let draftTargetPomodoros = $state(1);
  let draftRecurrence = $state(RECURRENCE.NONE);
  let draftWeekdays = $state([1, 2, 3, 4, 5]);
  let draftUseDefaultBreakProfile = $state(true);
  let draftTaskMiniBreakEveryMinutes = $state(10);
  let draftTaskLongBreakEveryMinutes = $state(30);
  let draftFocusMinutes = $state(25);
  let draftShortBreakMinutes = $state(5);
  let draftLongBreakMinutes = $state(15);
  let draftLongBreakEvery = $state(4);
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
  const selectedTaskBreakProfile = $derived(
    selectedTask?.breakProfile && typeof selectedTask.breakProfile === "object"
      ? selectedTask.breakProfile
      : null,
  );
  const activeBreakTimingConfig = $derived(
    resolveBreakTimingConfig(safeConfig, selectedTask),
  );
  const breakPlanSec = $derived(getBreakPlanSec(activeBreakTimingConfig));
  const todaySummary = $derived(buildTodaySummary(todayTasks, todayStats));
  const plannerTasks = $derived(focusSelectableTasks);
  const plannerShowingAllTasks = $derived(fallbackToAllTasks);
  const plannerCompletedCount = $derived.by(() =>
    plannerTasks.filter((task) => isFocusTaskCompleted(task, todayStats)).length,
  );
  const plannerTargetPomodoros = $derived.by(() =>
    plannerTasks.reduce((sum, task) => sum + Number(task.targetPomodoros || 1), 0),
  );
  const plannerDonePomodoros = $derived.by(() =>
    plannerTasks.reduce((sum, task) => sum + Number(todayStats.taskPomodoros?.[task.id] || 0), 0),
  );
  const todayCompletedCount = $derived(todaySummary.completedCount);
  const todayTargetPomodoros = $derived(todaySummary.targetPomodoros);
  const todayDonePomodoros = $derived(todaySummary.donePomodoros);
  const timerTaskOptions = $derived(buildTimerTaskOptions(focusSelectableTasks));
  const selectedTaskDonePomodoros = $derived(
    selectedTaskId ? Number(todayStats.taskPomodoros?.[selectedTaskId] || 0) : 0,
  );
  const selectedTaskTargetPomodoros = $derived(
    selectedTask ? Number(selectedTask.targetPomodoros || 1) : 0,
  );
  const todayTaskDistribution = $derived(todaySummary.taskDistribution);
  const nextMiniBreakCountdown = $derived(Math.max(0, nextMiniBreakAtSec - focusSinceBreakSec));
  const nextLongBreakCountdown = $derived(Math.max(0, nextLongBreakAtSec - focusSinceBreakSec));
  const breakSessionActive = $derived(isBreakSessionActive(localBreakSession, nowTick));
  const breakSessionRemainingText = $derived(getBreakSessionRemainingText(localBreakSession, nowTick));
  const breakTimerActive = $derived(
    Boolean(activeBreakKind) && (phase === PHASE_SHORT_BREAK || phase === PHASE_LONG_BREAK),
  );

  function restoreTimerRuntimeFromCache() {
    const cached = loadFocusTimerRuntimeCache();
    if (!cached) return;
    phase = cached.phase;
    remainingSec = cached.remainingSec;
    running = cached.running;
    hasStarted = cached.hasStarted;
    completedFocusCount = cached.completedFocusCount;
    focusSinceBreakSec = cached.focusSinceBreakSec;
    nextMiniBreakAtSec = cached.nextMiniBreakAtSec;
    nextLongBreakAtSec = cached.nextLongBreakAtSec;
    nextMiniWarnAtSec = cached.nextMiniWarnAtSec;
    nextLongWarnAtSec = cached.nextLongWarnAtSec;
    lastBreakReminderAtSec = cached.lastBreakReminderAtSec;
    activeBreakKind = /** @type {"" | "mini" | "long"} */ (cached.activeBreakKind);
    skipUnlockedAfterPostpone = cached.skipUnlockedAfterPostpone;
  }

  function persistTimerRuntimeToCache() {
    if (!hasStarted && !running) {
      clearFocusTimerRuntimeCache();
      return;
    }
    saveFocusTimerRuntimeCache({
      phase,
      remainingSec,
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

  function advancePhase() {
    const next = nextPhaseState(phase, completedFocusCount, safeConfig.longBreakEvery);
    phase = next.phase;
    completedFocusCount = next.completedFocusCount;
    remainingSec = getPhaseDurationSec(phase, safeConfig);
    if (next.phase !== PHASE_FOCUS) {
      focusSinceBreakSec = 0;
      lastBreakReminderAtSec = -1;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
      nextLongBreakAtSec = breakPlanSec.longEverySec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
  }

  /** @param {"mini" | "long"} kind */
  function applyBreakNow(kind) {
    activeBreakKind = kind;
    lastBreakReminderAtSec = -1;
    if (kind === BREAK_KIND_LONG) {
      focusSinceBreakSec = 0;
      phase = PHASE_LONG_BREAK;
      remainingSec = breakPlanSec.longDurationSec;
      nextLongBreakAtSec = breakPlanSec.longEverySec;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
    } else {
      phase = PHASE_SHORT_BREAK;
      remainingSec = breakPlanSec.miniDurationSec;
      // Mini break should not reset the long-break countdown.
      nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec;
    }
    nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    hasStarted = true;
    running = true;
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
    skipUnlockedAfterPostpone = true;
    phase = PHASE_FOCUS;
    remainingSec = getPhaseDurationSec(PHASE_FOCUS, safeConfig);
    hasStarted = true;
    running = true;
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
    skipUnlockedAfterPostpone = false;
    phase = PHASE_FOCUS;
    remainingSec = getPhaseDurationSec(PHASE_FOCUS, safeConfig);
    hasStarted = true;
    running = true;
  }

  function tickBreakReminderClock() {
    if (!safeConfig.breakReminderEnabled) return;
    focusSinceBreakSec += 1;
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
      if (isFocusTaskCompleted(task, dayStats)) continue;
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
    if (selectedTask?.id && selectedTaskBreakProfile) {
      const nextProfile = {
        miniBreakEveryMinutes: kind === "mini"
          ? safeMinutes
          : Number(selectedTaskBreakProfile.miniBreakEveryMinutes || safeConfig.miniBreakEveryMinutes),
        longBreakEveryMinutes: kind === "long"
          ? safeMinutes
          : Number(selectedTaskBreakProfile.longBreakEveryMinutes || safeConfig.longBreakEveryMinutes),
      };
      updateTask(selectedTask.id, { breakProfile: nextProfile });
    }
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
    if (remainingSec <= 0) remainingSec = getPhaseDurationSec(phase, safeConfig);
    running = !running;
    if (running) hasStarted = true;
  }

  function resetCurrentPhase() {
    running = false;
    hasStarted = false;
    remainingSec = getPhaseDurationSec(phase, safeConfig);
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
    }
  }

  /** @param {string} taskId */
  function startTaskFocus(taskId) {
    selectedTaskId = taskId;
    phase = PHASE_FOCUS;
    remainingSec = getPhaseDurationSec(PHASE_FOCUS, safeConfig);
    running = true;
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
   * targetPomodoros?: number;
   * recurrence?: string;
   * weekdays?: number[];
   * breakProfile?: { miniBreakEveryMinutes: number; longBreakEveryMinutes: number } | null;
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
      targetPomodoros: draftTargetPomodoros,
      recurrence: draftRecurrence,
      weekdays: draftRecurrence === RECURRENCE.CUSTOM ? draftWeekdays : [],
      breakProfile: draftUseDefaultBreakProfile
        ? null
        : {
            miniBreakEveryMinutes: clampInt(
              draftTaskMiniBreakEveryMinutes,
              safeConfig.miniBreakEveryMinutes,
              1,
              180,
            ),
            longBreakEveryMinutes: clampInt(
              draftTaskLongBreakEveryMinutes,
              safeConfig.longBreakEveryMinutes,
              1,
              360,
            ),
          },
    });
    emitTasks([...tasks, next]);
    draftTitle = "";
    draftTargetPomodoros = 1;
    draftUseDefaultBreakProfile = true;
    draftTaskMiniBreakEveryMinutes = safeConfig.miniBreakEveryMinutes;
    draftTaskLongBreakEveryMinutes = safeConfig.longBreakEveryMinutes;
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
      focusMinutes: clampInt(draftFocusMinutes, safeConfig.focusMinutes, 5, 90),
      shortBreakMinutes: clampInt(draftShortBreakMinutes, safeConfig.shortBreakMinutes, 1, 30),
      longBreakMinutes: clampInt(draftLongBreakMinutes, safeConfig.longBreakMinutes, 5, 60),
      longBreakEvery: clampInt(draftLongBreakEvery, safeConfig.longBreakEvery, 2, 8),
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
      remainingSec = getPhaseDurationSec(phase, safeConfig);
    }
    showConfig = false;
  }

  function openTimerSettings() {
    draftFocusMinutes = safeConfig.focusMinutes;
    draftShortBreakMinutes = safeConfig.shortBreakMinutes;
    draftLongBreakMinutes = safeConfig.longBreakMinutes;
    draftLongBreakEvery = safeConfig.longBreakEvery;
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
    const isLong = phase === PHASE_LONG_BREAK || activeBreakKind === BREAK_KIND_LONG;
    const totalSec = isLong ? breakPlanSec.longDurationSec : breakPlanSec.miniDurationSec;
    const safeTotal = Math.max(1, Math.floor(totalSec));
    const safeRemaining = Math.max(0, Math.floor(remainingSec));
    const progress = Math.max(0, Math.min(100, Math.round(((safeTotal - safeRemaining) / safeTotal) * 100)));
    return {
      title: isLong
        ? (strings.pomodoroLongBreakNow || "Take a long break")
        : (strings.pomodoroMiniBreakNow || "Take a mini break"),
      taskText: selectedTask ? selectedTask.title : (strings.pomodoroNoTaskSelected || "Not selected"),
      remainingPrefix: strings.pomodoroBreakRemaining || "Remaining",
      remainingText: `${strings.pomodoroBreakRemaining || "Remaining"} ${formatTimer(safeRemaining)}`,
      remainingSeconds: safeRemaining,
      totalSeconds: safeTotal,
      endAtTs: Date.now() + safeRemaining * 1000,
      progress,
      postponeText: strings.pomodoroBreakPostponeTwoMinutes || "Postpone 2m",
      skipText: strings.pomodoroSkip || "Skip",
      showSkip: skipUnlockedAfterPostpone === true,
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
    const target = getPhaseDurationSec(phase, safeConfig);
    if (remainingSec !== target) remainingSec = target;
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
    if (!draftUseDefaultBreakProfile) return;
    draftTaskMiniBreakEveryMinutes = safeConfig.miniBreakEveryMinutes;
    draftTaskLongBreakEveryMinutes = safeConfig.longBreakEveryMinutes;
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
      phase = PHASE_FOCUS;
      remainingSec = getPhaseDurationSec(PHASE_FOCUS, safeConfig);
      running = true;
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
    if (remainingSec > 0) return;
    activeBreakKind = "";
    skipUnlockedAfterPostpone = false;
    phase = PHASE_FOCUS;
    remainingSec = getPhaseDurationSec(PHASE_FOCUS, safeConfig);
    closeBreakOverlayEverywhere(true).catch((error) =>
      console.error("focus force close overlay at zero", error),
    );
  });

  $effect(() => {
    if (!breakTimerActive) return;
    const _tick = remainingSec;
    const _phase = phase;
    const _skipReady = skipUnlockedAfterPostpone;
    const _strict = safeConfig.breakStrictMode;
    const _taskTitle = selectedTask?.title || "";
    const _labelsCount = breakOverlayLabels.length;
    void _tick;
    void _phase;
    void _skipReady;
    void _strict;
    void _taskTitle;
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
    const clockId = setInterval(() => {
      const now = Date.now();
      nowTick = now;
      tickTaskStartReminderClock(now);
      if (phase === PHASE_FOCUS) {
        tickBreakReminderClock();
      }
    }, 1000);
    return () => clearInterval(clockId);
  });

  onMount(() => {
    /** @type {null | (() => void)} */
    let unlistenAction = null;
    /** @type {null | (() => void)} */
    let unlistenReady = null;
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
      if (disposed) {
        closeBreakOverlayEverywhere(true).catch((error) =>
          console.error("focus close break overlay windows on destroy", error),
        );
      }
    };
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
    void _skipUnlocked;
    persistTimerRuntimeToCache();
  });

  $effect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!running) return;
      if (remainingSec <= 1) {
        running = false;
        if (phase === PHASE_FOCUS) {
          onFocusCompleted();
        } else {
          activeBreakKind = "";
          skipUnlockedAfterPostpone = false;
          closeBreakOverlayEverywhere(true).catch((error) =>
            console.error("focus close break overlay windows on break complete", error),
          );
        }
        advancePhase();
        return;
      }
      remainingSec -= 1;
    }, 1000);
    return () => clearInterval(id);
  });
</script>

<section class="focus-hub" class:compact data-no-drag="true">
  <div class="focus-main">
    <div class="focus-slot timer-slot">
      <WorkspaceFocusTimer
        {strings}
        phaseLabelText={phaseLabel(phase, strings)}
        timerText={formatTimer(remainingSec)}
        breakMiniCountdownText={formatTimer(nextMiniBreakCountdown)}
        breakLongCountdownText={formatTimer(nextLongBreakCountdown)}
        roundText={`${completedFocusCount % safeConfig.longBreakEvery}/${safeConfig.longBreakEvery}`}
        taskText={selectedTask ? selectedTask.title : strings.pomodoroNoTaskSelected}
        phaseProgress={Math.round(
          ((getPhaseDurationSec(phase, safeConfig) - remainingSec) / Math.max(getPhaseDurationSec(phase, safeConfig), 1)) * 100,
        )}
        {running}
        {hasStarted}
        {showConfig}
        {showBreakPanel}
        focusMinutes={safeConfig.focusMinutes}
        selectedTaskId={selectedTaskId}
        taskOptions={timerTaskOptions}
        selectedTaskDonePomodoros={selectedTaskDonePomodoros}
        selectedTaskTargetPomodoros={selectedTaskTargetPomodoros}
        bind:draftFocusMinutes
        bind:draftShortBreakMinutes
        bind:draftLongBreakMinutes
        bind:draftLongBreakEvery
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
        onApplyFocusPreset={applyFocusPreset}
        onSelectTask={selectTask}
        onToggleRunning={toggleRunning}
        onReset={resetCurrentPhase}
        onToggleSettings={() => (showConfig ? (showConfig = false) : openTimerSettings())}
        onToggleBreakPanel={(next = !showBreakPanel) => {
          showBreakPanel = !!next;
          if (showBreakPanel && showConfig) showConfig = false;
        }}
        onSaveSettings={saveTimerConfig}
        onCancelSettings={() => (showConfig = false)}
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
        bind:draftTargetPomodoros
        bind:draftRecurrence
        bind:draftWeekdays
        bind:draftUseDefaultBreakProfile
        bind:draftTaskMiniBreakEveryMinutes
        bind:draftTaskLongBreakEveryMinutes
        defaultMiniBreakEveryMinutes={safeConfig.miniBreakEveryMinutes}
        defaultLongBreakEveryMinutes={safeConfig.longBreakEveryMinutes}
        tasks={plannerTasks}
        showingAllTasks={plannerShowingAllTasks}
        todayTaskCount={todayTasks.length}
        todayStats={{
          completedCount: plannerCompletedCount,
          donePomodoros: plannerDonePomodoros,
          targetPomodoros: plannerTargetPomodoros,
          taskPomodoros: todayStats.taskPomodoros,
        }}
        onAddTask={addTask}
        onToggleWeekday={toggleDraftWeekday}
        onStartTask={startTaskFocus}
        onRemoveTask={removeTask}
        onUpdateTask={updateTask}
        {weekdayLabel}
      />
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
        todayTaskTargetPomodoros={todayTargetPomodoros}
        todayTaskDonePomodoros={todayDonePomodoros}
        {weekFocusMinutes}
        {weekPomodoros}
        {weekAverageMinutes}
        {streakDays}
        bestDayDateKey={bestFocusDay.dateKey}
        bestDayMinutes={bestFocusDay.minutes}
        heatmapCells={focusHeatmap}
        taskDistribution={todayTaskDistribution}
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
