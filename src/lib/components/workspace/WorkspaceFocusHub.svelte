<script>
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import {
    FOCUS_TASK_MODE_DURATION,
    FOCUS_TASK_MODE_TIME_WINDOW,
    RECURRENCE,
    clampInt,
    ensureDayStats,
    getDateKey,
    getRecentDateKeys,
    getTodayTasks,
    timeToMinutes,
  } from "$lib/workspace/pomodoro/focus-model.js";
  import {
    buildFocusHeatmap,
    getBestFocusDay,
    getFocusStreakDays,
    getWeekFocusAverageMinutes,
  } from "$lib/workspace/pomodoro/focus-analytics.js";
  import {
    buildTaskTitleRollups,
    getTaskCycleSnapshot,
  } from "$lib/workspace/pomodoro/focus-pomodoro-metrics.js";
  import WorkspaceFocusHubView from "$lib/components/workspace/WorkspaceFocusHubView.svelte";
  import {
    BREAK_REMINDER_MODE_FULLSCREEN,
    BREAK_REMINDER_MODE_OPTIONS,
    BREAK_REMINDER_MODE_PANEL,
    normalizeBreakReminderMode,
  } from "$lib/workspace/break-control/focus-break-reminder-mode.js";
  import {
    BREAK_SESSION_SCOPE_GLOBAL,
    BREAK_SESSION_NONE,
    BREAK_SESSION_OPTIONS,
    createBreakSession,
    getBreakSessionRemainingText,
    isBreakSessionActive,
    normalizeBreakSession,
  } from "$lib/workspace/break-control/focus-break-session.js";
  import {
    BREAK_KIND_LONG,
    BREAK_KIND_MINI,
    buildTimerTaskOptions,
    buildTodaySummary,
    FOCUS_WEEKDAYS,
    getBreakPlanSec,
    getPhaseDurationSec,
    getSafeConfig,
    PHASE_FOCUS,
  } from "$lib/workspace/pomodoro/focus-runtime.js";
  import { formatSecondsBrief, sendDesktopNotification } from "$lib/workspace/break-control/focus-break-notify.js";
  import {
    buildBreakOverlayPayload as buildBreakOverlayPayloadFromState,
    buildBreakWatchdogSnapshot,
    buildBreakNotification,
    getBreakProgressPercent,
  } from "$lib/workspace/break-control/break-control-controller.js";
  import { createBreakOverlayLifecycle } from "$lib/workspace/break-control/break-overlay-lifecycle.js";
  import { mountBreakControlEventListeners } from "$lib/workspace/break-control/break-control-event-listeners.js";
  import {
    getRemainingFromDeadline,
  } from "$lib/workspace/pomodoro/focus-runtime-controller.js";
  import { createFocusTimerController } from "$lib/workspace/pomodoro/focus-timer-controller.js";
  import { createFocusTaskDraftController } from "$lib/workspace/pomodoro/focus-task-draft-controller.js";
  import {
    buildFocusCompletedStats,
    buildStatsWithTaskSession,
    buildTaskStartNotification,
    getCurrentTaskLiveTodaySeconds as getCurrentTaskLiveTodaySecondsFromState,
  } from "$lib/workspace/pomodoro/focus-task-controller.js";

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
  let taskTimingActive = $state(false);
  let completedFocusCount = $state(0);
  let selectedTaskId = $state("");
  let lastSyncedSelectedTaskId = $state("");
  let lastCommandNonce = $state(0);
  let showBreakPanel = $state(false);
  let showStats = $state(false);
  let nowTick = $state(Date.now());
  let taskSessionStartedAtTs = $state(0);

  let draftTitle = $state("");
  let draftTaskMode = $state(FOCUS_TASK_MODE_TIME_WINDOW);
  let draftTargetMinutes = $state(120);
  let draftStartTime = $state("09:00");
  let draftEndTime = $state("10:00");
  let draftRecurrence = $state(RECURRENCE.NONE);
  let draftWeekdays = $state([1, 2, 3, 4, 5]);
  let draftFocusMinutes = $state(25);
  let focusSinceBreakSec = $state(0);
  let nextMiniBreakAtSec = $state(10 * 60);
  let nextLongBreakAtSec = $state(30 * 60);
  let nextMiniWarnAtSec = $state(10 * 60 - 10);
  let nextLongWarnAtSec = $state(30 * 60 - 10);
  let lastBreakReminderAtSec = $state(-1);
  let notifyEnabled = $state(false);
  let notifyChecked = $state(false);
  let timerRuntimeRestored = false;
  /** @type {Set<string>} */
  let sentTaskStartReminderKeys = new Set();
  let taskStartReminderDateKey = "";
  /** @type {"mini" | "long" | ""} */
  let activeBreakKind = $state("");
  let breakRemainingSec = $state(0);
  let breakDeadlineTs = $state(0);
  let skipUnlockedAfterPostpone = $state(false);
  let resumeFocusAfterBreak = $state(false);
  let resumeTaskIdAfterBreak = $state("");
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
  const liveTodayFocusSeconds = $derived(
    Math.max(0, Number(todayStats.focusSeconds || 0) + getCurrentTaskLiveTodaySeconds(nowTick)),
  );
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
  const allTasksById = $derived.by(() =>
    new Map((Array.isArray(tasks) ? tasks : []).map((task) => [String(task?.id || ""), task]))
  );
  const selectedTask = $derived(allTasksById.get(String(selectedTaskId || "")) || null);
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
  const liveTaskEffectiveSeconds = $derived.by(() => ({
    ...(todayStats.taskEffectiveSeconds || {}),
    ...(selectedTaskId && taskSessionStartedAtTs
      ? {
          [selectedTaskId]: Number(todayStats.taskEffectiveSeconds?.[selectedTaskId] || 0) +
            getCurrentTaskLiveTodaySeconds(nowTick),
        }
      : {}),
  }));
  const selectedTaskEffectiveSeconds = $derived(
    selectedTaskId ? Number(liveTaskEffectiveSeconds?.[selectedTaskId] || 0) : 0,
  );
  const selectedTaskCycleSnapshot = $derived(
    getTaskCycleSnapshot(selectedTaskEffectiveSeconds, Number(selectedTask?.targetSeconds || 0)),
  );
  const selectedTaskRemainingSeconds = $derived.by(() => {
    if (!selectedTaskId) return Math.max(0, Math.floor(Number(remainingSec || 0)));
    return Math.max(0, Number(selectedTaskCycleSnapshot.currentCycleRemainingSeconds || 0));
  });
  const pomodoroTimerText = $derived(formatTimer(selectedTaskRemainingSeconds));
  const taskTitleRollups = $derived(
    buildTaskTitleRollups(stats, tasks, safeConfig.focusMinutes),
  );
  const liveTaskCycleCount = $derived.by(() =>
    plannerTasks.reduce((sum, task) =>
      sum + getTaskCycleSnapshot(
        Number(liveTaskEffectiveSeconds?.[task.id] || 0),
        Number(task.targetSeconds || 0),
      ).completedCycles, 0)
  );
  const todayTaskDistribution = $derived.by(() =>
    todaySummary.taskDistribution.map((task) => {
      const effectiveSeconds = Number(liveTaskEffectiveSeconds?.[task.id] || task.effectiveSeconds || 0);
      const cycleSnapshot = getTaskCycleSnapshot(effectiveSeconds, Number(task.targetSeconds || 0));
      return {
        ...task,
        effectiveSeconds,
        completedCycles: cycleSnapshot.completedCycles,
        currentCycleSeconds: cycleSnapshot.currentCycleSeconds,
        progressPercent: cycleSnapshot.currentCycleProgressPercent,
      };
    })
  );
  const currentMinutes = $derived.by(() => {
    const now = new Date(nowTick);
    return now.getHours() * 60 + now.getMinutes();
  });
  const nextMiniBreakCountdown = $derived(Math.max(0, nextMiniBreakAtSec - focusSinceBreakSec));
  const nextLongBreakCountdown = $derived(Math.max(0, nextLongBreakAtSec - focusSinceBreakSec));
  const breakSessionActive = $derived(isBreakSessionActive(localBreakSession, nowTick));
  const breakSessionRemainingText = $derived(getBreakSessionRemainingText(localBreakSession, nowTick));
  const breakTimerActive = $derived(Boolean(activeBreakKind) && breakRemainingSec > 0);
  const focusProgressPercent = $derived.by(() => {
    if (!selectedTaskId) return 0;
    return Math.max(0, Number(selectedTaskCycleSnapshot.currentCycleProgressPercent || 0));
  });
  const breakProgressPercent = $derived.by(() => {
    return getBreakProgressPercent({
      breakReminderEnabled: safeConfig.breakReminderEnabled,
      nextMiniBreakCountdown,
      nextLongBreakCountdown,
      miniEverySec: breakPlanSec.miniEverySec,
      longEverySec: breakPlanSec.longEverySec,
    });
  });

  function getFocusDurationSec(config = safeConfig) {
    return getPhaseDurationSec(PHASE_FOCUS, config);
  }

  /** @param {Record<string, any>} patch */
  function setTimerRuntime(patch) {
    if ("phase" in patch) phase = patch.phase;
    if ("remainingSec" in patch) remainingSec = patch.remainingSec;
    if ("focusDeadlineTs" in patch) focusDeadlineTs = patch.focusDeadlineTs;
    if ("running" in patch) running = patch.running;
    if ("hasStarted" in patch) hasStarted = patch.hasStarted;
    if ("taskTimingActive" in patch) taskTimingActive = patch.taskTimingActive;
    if ("completedFocusCount" in patch) completedFocusCount = patch.completedFocusCount;
    if ("focusSinceBreakSec" in patch) focusSinceBreakSec = patch.focusSinceBreakSec;
    if ("nextMiniBreakAtSec" in patch) nextMiniBreakAtSec = patch.nextMiniBreakAtSec;
    if ("nextLongBreakAtSec" in patch) nextLongBreakAtSec = patch.nextLongBreakAtSec;
    if ("nextMiniWarnAtSec" in patch) nextMiniWarnAtSec = patch.nextMiniWarnAtSec;
    if ("nextLongWarnAtSec" in patch) nextLongWarnAtSec = patch.nextLongWarnAtSec;
    if ("lastBreakReminderAtSec" in patch) lastBreakReminderAtSec = patch.lastBreakReminderAtSec;
    if ("activeBreakKind" in patch) activeBreakKind = /** @type {"" | "mini" | "long"} */ (patch.activeBreakKind);
    if ("breakRemainingSec" in patch) breakRemainingSec = patch.breakRemainingSec;
    if ("breakDeadlineTs" in patch) breakDeadlineTs = patch.breakDeadlineTs;
    if ("skipUnlockedAfterPostpone" in patch) skipUnlockedAfterPostpone = patch.skipUnlockedAfterPostpone;
    if ("selectedTaskId" in patch) selectedTaskId = patch.selectedTaskId;
    if ("taskSessionStartedAtTs" in patch) taskSessionStartedAtTs = patch.taskSessionStartedAtTs;
  }

  /** @param {Record<string, any>} patch */
  function setDraftState(patch) {
    if ("draftTitle" in patch) draftTitle = patch.draftTitle;
    if ("draftTaskMode" in patch) draftTaskMode = patch.draftTaskMode;
    if ("draftTargetMinutes" in patch) draftTargetMinutes = patch.draftTargetMinutes;
    if ("draftStartTime" in patch) draftStartTime = patch.draftStartTime;
    if ("draftEndTime" in patch) draftEndTime = patch.draftEndTime;
    if ("draftRecurrence" in patch) draftRecurrence = patch.draftRecurrence;
    if ("draftWeekdays" in patch) draftWeekdays = patch.draftWeekdays;
    if ("draftFocusMinutes" in patch) draftFocusMinutes = patch.draftFocusMinutes;
  }

  function shouldTickBreakReminderClock() {
    if (!safeConfig.breakReminderEnabled) return false;
    if (activeBreakKind) return false;
    return true;
  }

  async function syncBreakReminderWatchdogState() {
    await invoke("sync_break_reminder_watchdog", {
      snapshot: buildBreakWatchdogSnapshot({
        enabled: safeConfig.breakReminderEnabled,
        activeBreakKind,
        focusSinceBreakSec,
        nextMiniBreakAtSec,
        nextLongBreakAtSec,
      }),
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
    hasStarted = Boolean(selectedTaskId);
    taskTimingActive = false;
    taskSessionStartedAtTs = 0;
  }

  /**
   * @param {number} [nowTs]
   */
  function getCurrentSessionSettleTs(nowTs = Date.now()) {
    if (!taskSessionStartedAtTs) return 0;
    if (running && focusDeadlineTs > 0) {
      return Math.min(Math.max(0, Math.floor(nowTs)), focusDeadlineTs);
    }
    return Math.max(0, Math.floor(nowTs));
  }

  /**
   * @param {Record<string, any>} [baseStats]
   * @param {number} [settleUntilTs]
   * @param {string} [taskId]
   * @param {number} [sessionStartedAt]
   */
  function buildStatsWithCurrentTaskSession(
    baseStats = stats,
    settleUntilTs = Date.now(),
    taskId = selectedTaskId,
    sessionStartedAt = taskSessionStartedAtTs,
  ) {
    return buildStatsWithTaskSession({
      baseStats,
      settleUntilTs,
      taskId,
      sessionStartedAt,
      allTasksById,
    });
  }

  /**
   * @param {number} [settleUntilTs]
   */
  function flushCurrentTaskSession(settleUntilTs = Date.now()) {
    const nextStats = buildStatsWithCurrentTaskSession(stats, settleUntilTs);
    if (nextStats !== stats) {
      emitStats(nextStats);
    }
    taskTimingActive = false;
    taskSessionStartedAtTs = 0;
    return nextStats;
  }

  /**
   * @param {number} [settleUntilTs]
   * @param {{ keepStarted?: boolean; clearSelection?: boolean; pauseFocusTimer?: boolean }} [options]
   */
  function pauseActiveTaskSession(
    settleUntilTs = getCurrentSessionSettleTs(),
    { keepStarted = Boolean(selectedTaskId), clearSelection = false, pauseFocusTimer = true } = {},
  ) {
    const nextStats = flushCurrentTaskSession(settleUntilTs);
    if (pauseFocusTimer) {
      remainingSec = focusDeadlineTs > 0 ? getRemainingFromDeadline(focusDeadlineTs) : remainingSec;
      focusDeadlineTs = 0;
      running = false;
    }
    hasStarted = keepStarted;
    if (clearSelection) selectedTaskId = "";
    return nextStats;
  }

  const focusTimerController = createFocusTimerController({
    getFocusDurationSec,
    getSafeConfig: () => safeConfig,
    getPhase: () => phase,
    getSelectedTaskId: () => selectedTaskId,
    getRemainingSec: () => remainingSec,
    getFocusDeadlineTs: () => focusDeadlineTs,
    getRunning: () => running,
    getHasStarted: () => hasStarted,
    getTaskTimingActive: () => taskTimingActive,
    getTaskSessionStartedAtTs: () => taskSessionStartedAtTs,
    getCompletedFocusCount: () => completedFocusCount,
    getFocusSinceBreakSec: () => focusSinceBreakSec,
    getNextMiniBreakAtSec: () => nextMiniBreakAtSec,
    getNextLongBreakAtSec: () => nextLongBreakAtSec,
    getNextMiniWarnAtSec: () => nextMiniWarnAtSec,
    getNextLongWarnAtSec: () => nextLongWarnAtSec,
    getLastBreakReminderAtSec: () => lastBreakReminderAtSec,
    getActiveBreakKind: () => activeBreakKind,
    getBreakRemainingSec: () => breakRemainingSec,
    getBreakDeadlineTs: () => breakDeadlineTs,
    getSkipUnlockedAfterPostpone: () => skipUnlockedAfterPostpone,
    getBreakTimerActive: () => breakTimerActive,
    setTimerRuntime,
    setDraftFocusMinutes: (minutes) => (draftFocusMinutes = minutes),
    flushCurrentTaskSession,
    pauseActiveTaskSession,
    getCurrentSessionSettleTs,
    onPomodoroConfigChange: (config) => onPomodoroConfigChange(config),
    clampInt,
  });

  const breakOverlayLifecycle = createBreakOverlayLifecycle({
    getBreakTimerActive: () => breakTimerActive,
    buildPayload: () => buildBreakOverlayPayload(),
  });

  const taskDraftController = createFocusTaskDraftController({
    getTasks: () => tasks,
    getStats: () => stats,
    getSelectedTaskId: () => selectedTaskId,
    getTaskTimingActive: () => taskTimingActive,
    getRunning: () => running,
    getHasStarted: () => hasStarted,
    getTaskSessionStartedAtTs: () => taskSessionStartedAtTs,
    getCurrentSessionSettleTs,
    getFocusDurationSec,
    getDraftTitle: () => draftTitle,
    getDraftTaskMode: () => draftTaskMode,
    getDraftTargetMinutes: () => draftTargetMinutes,
    getDraftStartTime: () => draftStartTime,
    getDraftEndTime: () => draftEndTime,
    getDraftRecurrence: () => draftRecurrence,
    getDraftWeekdays: () => draftWeekdays,
    setFocusRuntime: setTimerRuntime,
    setDraftState,
    pauseActiveTaskSession,
    emitTasks,
    emitStats,
    ensureNotificationPermissionFromUserGesture,
  });

  /**
   * @param {number} [nowTs]
   */
  function getCurrentTaskLiveTodaySeconds(nowTs = nowTick) {
    return getCurrentTaskLiveTodaySecondsFromState({
      selectedTaskId,
      taskSessionStartedAtTs,
      settleTs: getCurrentSessionSettleTs(nowTs),
      nowTs,
    });
  }

  function markResumeAfterBreak() {
    const shouldResume = running === true;
    resumeFocusAfterBreak = shouldResume;
    resumeTaskIdAfterBreak = shouldResume ? (selectedTaskId || "") : "";
  }

  function clearResumeAfterBreak() {
    resumeFocusAfterBreak = false;
    resumeTaskIdAfterBreak = "";
  }

  function resumeFocusAfterBreakIfNeeded() {
    if (!resumeFocusAfterBreak) return;
    if (resumeTaskIdAfterBreak && resumeTaskIdAfterBreak !== (selectedTaskId || "")) {
      clearResumeAfterBreak();
      return;
    }
    if (running || breakTimerActive) {
      clearResumeAfterBreak();
      return;
    }
    focusTimerController.toggleRunning();
    clearResumeAfterBreak();
  }

  /**
   * @param {{ resetSkipUnlock?: boolean; closeOverlay?: boolean; resume?: boolean }} [options]
   */
  function endBreakSession({ resetSkipUnlock = true, closeOverlay = true, resume = true } = {}) {
    activeBreakKind = "";
    breakRemainingSec = 0;
    breakDeadlineTs = 0;
    if (resetSkipUnlock) {
      skipUnlockedAfterPostpone = false;
    }
    if (closeOverlay) {
      breakOverlayLifecycle.closeEverywhere(true).catch((error) =>
        console.error("focus close break overlay windows", error),
      );
    }
    if (resume) {
      resumeFocusAfterBreakIfNeeded();
    }
  }

  /** @param {"mini" | "long"} kind */
  function applyBreakNow(kind) {
    markResumeAfterBreak();
    if (taskTimingActive || running || taskSessionStartedAtTs > 0) {
      pauseActiveTaskSession(getCurrentSessionSettleTs(), {
        keepStarted: Boolean(selectedTaskId),
        pauseFocusTimer: true,
      });
    }
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
    skipUnlockedAfterPostpone = true;
    endBreakSession({ resetSkipUnlock: false, resume: true });
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
    endBreakSession({ resetSkipUnlock: true, resume: true });
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
      if (task?.taskStartReminderEnabled !== true) continue;
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

  /**
   * @param {"warn" | "start"} stage
   * @param {"mini" | "long"} kind
   */
  async function notifyBreak(stage, kind) {
    if (!notifyEnabled) return;
    const { title, body } = buildBreakNotification({
      stage,
      kind,
      strings,
      breakPlanSec,
      longBreakDurationMinutes: safeConfig.longBreakDurationMinutes,
      formatSecondsBrief,
    });
    await sendDesktopNotification(title, body);
  }

  /**
   * @param {{ title?: string; startTime?: string }} task
   * @param {number} leadMinutes
   */
  async function notifyTaskStart(task, leadMinutes) {
    if (!notifyEnabled) return;
    const { title, body } = buildTaskStartNotification({ task, leadMinutes, strings });
    await sendDesktopNotification(title, body);
  }

  /**
   * @returns {Record<string, any>}
   */
  function buildBreakOverlayPayload() {
    return buildBreakOverlayPayloadFromState({
      activeBreakKind,
      breakRemainingSec,
      breakDeadlineTs,
      breakPlanSec,
      breakStrictMode: safeConfig.breakStrictMode,
      skipUnlockedAfterPostpone,
      strings,
      formatTimer,
    });
  }

  function onFocusCompleted() {
    const settledAtTs = focusDeadlineTs > 0 ? focusDeadlineTs : Date.now();
    const nextStats = buildFocusCompletedStats({
      stats,
      settleUntilTs: settledAtTs,
      selectedTaskId,
      selectedTaskTitle: String(selectedTask?.title || ""),
      allTasksById,
      taskSessionStartedAtTs,
    });
    emitStats(nextStats);
    taskTimingActive = false;
    taskSessionStartedAtTs = 0;
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
      taskDraftController.startTaskFocus(taskId);
      return;
    }
    taskDraftController.selectTask(taskId);
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
      if (!timerRuntimeRestored) return;
      if (running || hasStarted || taskTimingActive) return;
      if (selectedTaskId) selectedTaskId = "";
      return;
    }
    if (selectedTaskId && allTasksById.has(String(selectedTaskId || ""))) {
      return;
    }
    if (running || hasStarted || taskTimingActive) {
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
    if (activeBreakKind || breakRemainingSec > 0 || breakDeadlineTs > 0) {
      endBreakSession({ resetSkipUnlock: false, resume: true });
    }
  });

  $effect(() => {
    breakOverlayLifecycle.syncActiveState();
  });

  $effect(() => {
    if (!breakTimerActive) return;
    if (breakRemainingSec > 0) return;
    activeBreakKind = "";
    breakRemainingSec = 0;
    breakDeadlineTs = 0;
    skipUnlockedAfterPostpone = false;
    breakOverlayLifecycle.closeEverywhere(true).catch((error) =>
      console.error("focus force close overlay at zero", error),
    );
  });

  $effect(() => {
    if (!breakTimerActive) return;
    const _tick = breakRemainingSec;
    const _skipReady = skipUnlockedAfterPostpone;
    const _strict = safeConfig.breakStrictMode;
    void _tick;
    void _skipReady;
    void _strict;
    breakOverlayLifecycle.sync().catch((error) => {
      console.error("focus sync break overlay", error);
    });
  });

  onMount(async () => {
    focusTimerController.restoreTimerRuntimeFromCache();
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

  onMount(() =>
    mountBreakControlEventListeners({
      onOverlayAction: (action) => {
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
      },
      onOverlayReady: (label) => {
        if (!label) return;
        if (!breakTimerActive) return;
        breakOverlayLifecycle.handleReady(label);
      },
      onBreakDue: (kind) => {
        if (!safeConfig.breakReminderEnabled) return;
        if (activeBreakKind) return;
        if (kind !== BREAK_KIND_MINI && kind !== BREAK_KIND_LONG) return;
        notifyBreak("start", kind).catch((error) =>
          console.error("focus notify native break due", error),
        );
        applyBreakNow(kind);
      },
      onDestroy: () => breakOverlayLifecycle.closeEverywhere(true),
    })
  );

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
    const _selectedTaskId = selectedTaskId;
    const _remaining = remainingSec;
    const _running = running;
    const _started = hasStarted;
    const _taskTimingActive = taskTimingActive;
    const _taskSessionStartedAtTs = taskSessionStartedAtTs;
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
    void _selectedTaskId;
    void _remaining;
    void _running;
    void _started;
    void _taskTimingActive;
    void _taskSessionStartedAtTs;
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
    focusTimerController.persistTimerRuntimeToCache();
  });

  $effect(() => {
    if (!breakTimerActive) return;
    const id = setInterval(() => {
      if (!activeBreakKind) return;
      const nextRemaining = breakDeadlineTs > 0 ? getRemainingFromDeadline(breakDeadlineTs) : breakRemainingSec;
      if (nextRemaining <= 0) {
        endBreakSession({ resetSkipUnlock: true, resume: true });
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
        onFocusCompleted();
        remainingSec = 0;
        focusDeadlineTs = 0;
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

<WorkspaceFocusHubView
  {strings}
  {compact}
  focusTaskModeDuration={FOCUS_TASK_MODE_DURATION}
  focusTaskModeTimeWindow={FOCUS_TASK_MODE_TIME_WINDOW}
  recurrence={RECURRENCE}
  weekdays={FOCUS_WEEKDAYS}
  bind:draftTitle
  bind:draftTaskMode
  bind:draftTargetMinutes
  bind:draftStartTime
  bind:draftEndTime
  bind:draftRecurrence
  bind:draftWeekdays
  bind:showBreakPanel
  bind:showStats
  {pomodoroTimerText}
  nextMiniBreakCountdownText={formatTimer(nextMiniBreakCountdown)}
  nextLongBreakCountdownText={formatTimer(nextLongBreakCountdown)}
  selectedTaskTitle={selectedTask ? selectedTask.title : strings.pomodoroNoTaskSelected}
  phaseProgress={showBreakPanel ? breakProgressPercent : focusProgressPercent}
  {selectedTaskId}
  todayPomodoroScoreText={`x${todayStats.pomodoros || 0}`}
  breakActive={Boolean(activeBreakKind)}
  canSkipBreak={skipUnlockedAfterPostpone}
  breakReminderEnabled={safeConfig.breakReminderEnabled}
  independentMiniBreakEveryMinutes={safeConfig.independentMiniBreakEveryMinutes}
  independentLongBreakEveryMinutes={safeConfig.independentLongBreakEveryMinutes}
  miniBreakDurationSeconds={safeConfig.miniBreakDurationSeconds}
  longBreakDurationMinutes={safeConfig.longBreakDurationMinutes}
  {plannerTasks}
  activeTaskStarted={hasStarted}
  activeTaskRunning={taskTimingActive}
  {plannerShowingAllTasks}
  todayTaskCount={todayTasks.length}
  plannerTodayStats={{
    taskCount: plannerTasks.length,
    totalTaskCycles: liveTaskCycleCount,
    donePomodoros: plannerDonePomodoros,
    taskPomodoros: todayStats.taskPomodoros,
    taskEffectiveSeconds: liveTaskEffectiveSeconds,
  }}
  todayFocusMinutes={Math.round(liveTodayFocusSeconds / 60)}
  todayPomodoros={todayStats.pomodoros || 0}
  todayTaskCountForStats={todaySummary.taskCount}
  todayTaskCycles={liveTaskCycleCount}
  {weekFocusMinutes}
  {weekPomodoros}
  {weekAverageMinutes}
  {streakDays}
  bestDayDateKey={bestFocusDay.dateKey}
  bestDayMinutes={bestFocusDay.minutes}
  heatmapCells={focusHeatmap}
  taskDistribution={todayTaskDistribution}
  taskRollups={taskTitleRollups}
  {currentMinutes}
  onSetBreakReminderEnabled={setBreakReminderEnabled}
  onChangeIndependentBreakEveryMinutes={changeIndependentBreakEveryMinutes}
  onChangeBreakDuration={changeBreakDuration}
  onTriggerBreakSoon={scheduleBreakSoon}
  onPostponeBreak={postponeBreak}
  onSkipBreak={skipBreak}
  onAddTask={taskDraftController.addTask}
  onToggleWeekday={taskDraftController.toggleDraftWeekday}
  onStartTask={taskDraftController.startTaskFocus}
  onToggleTask={focusTimerController.toggleRunning}
  onRemoveTask={taskDraftController.removeTask}
  onUpdateTask={taskDraftController.updateTask}
  {weekdayLabel}
/>
