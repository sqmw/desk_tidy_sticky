<script>
  import { onMount } from "svelte";
  import {
    RECURRENCE,
    clampInt,
    ensureDayStats,
    getDateKey,
    getRecentDateKeys,
    getTodayTasks,
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
  import {
    BREAK_SESSION_SCOPE_GLOBAL,
    BREAK_SESSION_NONE,
    BREAK_SESSION_OPTIONS,
    createBreakSession,
    getBreakSessionRemainingText,
    isBreakSessionActive,
    normalizeBreakSession,
    shouldSuppressBreakPromptBySession,
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
    nextPhaseState,
    phaseLabel,
    PHASE_FOCUS,
    PHASE_LONG_BREAK,
    PHASE_SHORT_BREAK,
    removeTaskFromState,
    toggleTaskDoneInStats,
  } from "$lib/workspace/focus/focus-runtime.js";
  import { formatSecondsBrief, sendDesktopNotification } from "$lib/workspace/focus/focus-break-notify.js";

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
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      miniBreakEveryMinutes: 10,
      miniBreakDurationSeconds: 20,
      longBreakEveryMinutes: 30,
      longBreakDurationMinutes: 5,
      breakNotifyBeforeSeconds: 10,
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
  let draftRecurrence = $state(RECURRENCE.WORKDAY);
  let draftWeekdays = $state([1, 2, 3, 4, 5]);
  let draftFocusMinutes = $state(25);
  let draftShortBreakMinutes = $state(5);
  let draftLongBreakMinutes = $state(15);
  let draftLongBreakEvery = $state(4);
  let draftMiniBreakEveryMinutes = $state(10);
  let draftMiniBreakDurationSeconds = $state(20);
  let draftLongBreakEveryMinutes = $state(30);
  let draftLongBreakDurationMinutes = $state(5);
  let draftBreakNotifyBeforeSeconds = $state(10);
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
  /** @type {{ kind: "mini" | "long"; dueAt: number; postponeUsed: number } | null} */
  let breakPrompt = $state(null);
  let localBreakSession = $state({
    mode: BREAK_SESSION_NONE,
    untilTs: 0,
    scope: BREAK_SESSION_SCOPE_GLOBAL,
    taskId: "",
    taskTitle: "",
  });

  const safeConfig = $derived(getSafeConfig(pomodoroConfig, clampInt));
  const breakPlanSec = $derived(getBreakPlanSec(safeConfig));
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
  const selectedTask = $derived(todayTasks.find((task) => task.id === selectedTaskId) || null);
  const todaySummary = $derived(buildTodaySummary(todayTasks, todayStats));
  const todayCompletedCount = $derived(todaySummary.completedCount);
  const todayTargetPomodoros = $derived(todaySummary.targetPomodoros);
  const todayDonePomodoros = $derived(todaySummary.donePomodoros);
  const timerTaskOptions = $derived(buildTimerTaskOptions(todayTasks));
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
  function openBreakPrompt(kind) {
    if (breakPrompt && breakPrompt.kind === kind) return;
    const dueAt = kind === BREAK_KIND_LONG ? nextLongBreakAtSec : nextMiniBreakAtSec;
    breakPrompt = { kind, dueAt, postponeUsed: 0 };
    running = false;
  }

  /** @param {"mini" | "long"} kind */
  function applyBreakNow(kind) {
    breakPrompt = null;
    focusSinceBreakSec = 0;
    lastBreakReminderAtSec = -1;
    if (kind === BREAK_KIND_LONG) {
      phase = PHASE_LONG_BREAK;
      remainingSec = breakPlanSec.longDurationSec;
      nextLongBreakAtSec = breakPlanSec.longEverySec;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
    } else {
      phase = PHASE_SHORT_BREAK;
      remainingSec = breakPlanSec.miniDurationSec;
      nextMiniBreakAtSec = breakPlanSec.miniEverySec;
    }
    nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    hasStarted = true;
    running = true;
  }

  function postponeBreak() {
    if (!breakPrompt) return;
    if (safeConfig.breakStrictMode) return;
    if (breakPrompt.postponeUsed >= safeConfig.breakPostponeLimit) return;
    const deltaSec =
      breakPrompt.kind === BREAK_KIND_LONG
        ? safeConfig.longBreakPostponeMinutes * 60
        : safeConfig.miniBreakPostponeMinutes * 60;
    if (breakPrompt.kind === BREAK_KIND_LONG) {
      nextLongBreakAtSec += deltaSec;
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    } else {
      nextMiniBreakAtSec += deltaSec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
    breakPrompt = {
      ...breakPrompt,
      dueAt: breakPrompt.dueAt + deltaSec,
      postponeUsed: breakPrompt.postponeUsed + 1,
    };
    if (breakPrompt.postponeUsed >= safeConfig.breakPostponeLimit) {
      breakPrompt = null;
    }
    running = true;
  }

  function skipBreak() {
    if (!breakPrompt) return;
    if (safeConfig.breakStrictMode) return;
    if (breakPrompt.kind === BREAK_KIND_LONG) {
      nextLongBreakAtSec = focusSinceBreakSec + breakPlanSec.longEverySec;
      nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
    } else {
      nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec;
      nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
    }
    breakPrompt = null;
    running = true;
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
  function toggleTaskDone(taskId) {
    emitStats(toggleTaskDoneInStats(stats, todayKey, taskId));
  }

  /** @param {string} taskId */
  function removeTask(taskId) {
    const { nextTasks, nextStats } = removeTaskFromState(tasks, stats, taskId);
    if (selectedTaskId === taskId) selectedTaskId = "";
    emitTasks(nextTasks);
    emitStats(nextStats);
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
    });
    emitTasks([...tasks, next]);
    draftTitle = "";
    draftTargetPomodoros = 1;
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
        5,
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
        15,
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
    };
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
    if (next && next !== selectedTaskId) {
      selectedTaskId = next;
    }
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
    if (!todayTasks.some((task) => task.id === taskId)) return;
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
    if (todayTasks.length === 0) {
      if (selectedTaskId) selectedTaskId = "";
      return;
    }
    if (!todayTasks.some((task) => task.id === selectedTaskId)) {
      selectedTaskId = todayTasks[0].id;
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
    if (!breakPrompt) return;
    showBreakPanel = true;
  });

  onMount(async () => {
    try {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      notifyChecked = true;
      notifyEnabled = Notification.permission === "granted";
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        notifyEnabled = result === "granted";
      }
    } catch (error) {
      console.error("focus notification bootstrap", error);
    }
  });

  onMount(() => {
    const clockId = setInterval(() => {
      nowTick = Date.now();
    }, 1000);
    return () => clearInterval(clockId);
  });

  $effect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!running) return;
      if (remainingSec <= 1) {
        running = false;
        if (phase === PHASE_FOCUS) {
          onFocusCompleted();
        }
        advancePhase();
        return;
      }
      remainingSec -= 1;
      if (phase !== PHASE_FOCUS) return;
      focusSinceBreakSec += 1;
      nowTick = Date.now();
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
      if (shouldSuppressBreakPromptBySession(localBreakSession, selectedTaskId, nowTick)) {
        if (focusSinceBreakSec >= nextLongBreakAtSec) {
          nextLongBreakAtSec = focusSinceBreakSec + breakPlanSec.longEverySec;
          nextLongWarnAtSec = Math.max(0, nextLongBreakAtSec - breakPlanSec.notifyBeforeSec);
        }
        if (focusSinceBreakSec >= nextMiniBreakAtSec) {
          nextMiniBreakAtSec = focusSinceBreakSec + breakPlanSec.miniEverySec;
          nextMiniWarnAtSec = Math.max(0, nextMiniBreakAtSec - breakPlanSec.notifyBeforeSec);
        }
        return;
      }
      if (focusSinceBreakSec >= nextLongBreakAtSec) {
        if (lastBreakReminderAtSec !== nextLongBreakAtSec) {
          lastBreakReminderAtSec = nextLongBreakAtSec;
          notifyBreak("start", BREAK_KIND_LONG);
        }
        openBreakPrompt(BREAK_KIND_LONG);
      } else if (focusSinceBreakSec >= nextMiniBreakAtSec) {
        if (lastBreakReminderAtSec !== nextMiniBreakAtSec) {
          lastBreakReminderAtSec = nextMiniBreakAtSec;
          notifyBreak("start", BREAK_KIND_MINI);
        }
        openBreakPrompt(BREAK_KIND_MINI);
      }
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
        bind:draftMiniBreakPostponeMinutes
        bind:draftLongBreakPostponeMinutes
        bind:draftBreakPostponeLimit
        bind:draftBreakStrictMode
        onApplyFocusPreset={applyFocusPreset}
        onSelectTask={selectTask}
        onToggleRunning={toggleRunning}
        onReset={resetCurrentPhase}
        onToggleSettings={() => (showConfig ? (showConfig = false) : openTimerSettings())}
        onToggleBreakPanel={() => (showBreakPanel = !showBreakPanel)}
        onSaveSettings={saveTimerConfig}
        onCancelSettings={() => (showConfig = false)}
      />
      {#if showBreakPanel || breakPrompt}
        <div class="timer-break-panel">
          <WorkspaceBreakControlBar
            {strings}
            {breakPrompt}
            nextMiniBreakText={formatSecondsBrief(nextMiniBreakCountdown)}
            nextLongBreakText={formatSecondsBrief(nextLongBreakCountdown)}
            breakStrictMode={safeConfig.breakStrictMode}
            breakPostponeLimit={safeConfig.breakPostponeLimit}
            {notifyEnabled}
            {notifyChecked}
            breakSession={localBreakSession}
            breakSessionRemainingText={breakSessionRemainingText}
            breakSessionActive={breakSessionActive}
            breakSessionModes={BREAK_SESSION_OPTIONS}
            selectedTaskId={selectedTaskId}
            selectedTaskTitle={selectedTask?.title || ""}
            onStartSession={startBreakSession}
            onClearSession={clearBreakSession}
            onStartBreak={() => {
              if (!breakPrompt) return;
              applyBreakNow(breakPrompt.kind);
            }}
            onPostponeBreak={postponeBreak}
            onSkipBreak={skipBreak}
          />
        </div>
      {/if}
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
        tasks={todayTasks}
        todayStats={{
          completedTaskIds: todayStats.completedTaskIds,
          completedCount: todayCompletedCount,
          donePomodoros: todayDonePomodoros,
          targetPomodoros: todayTargetPomodoros,
          taskPomodoros: todayStats.taskPomodoros,
        }}
        onAddTask={addTask}
        onToggleWeekday={toggleDraftWeekday}
        onToggleTaskDone={toggleTaskDone}
        onStartTask={startTaskFocus}
        onRemoveTask={removeTask}
        {weekdayLabel}
      />
    </div>
  </div>

  {#if breakPrompt}
    {@const currentBreak = breakPrompt}
    <section class="break-prompt-card" data-no-drag="true">
      <div class="break-prompt-head">
        <strong>
          {currentBreak.kind === "long"
            ? (strings.pomodoroLongBreakNow || "Take a long break")
            : (strings.pomodoroMiniBreakNow || "Take a mini break")}
        </strong>
        <span class="break-prompt-sub">
          {strings.workspaceMultiScreenHint || "This prompt follows current workspace window (multi-screen friendly)."}
        </span>
      </div>
      <span class="break-prompt-sub">
        {strings.pomodoroBreakActionHint || "Use break controls above to start, postpone or skip."}
        {#if safeConfig.breakStrictMode}
          · {strings.pomodoroBreakStrictMode || "Strict mode"}
        {/if}
        · ({currentBreak.postponeUsed}/{safeConfig.breakPostponeLimit})
      </span>
    </section>
  {/if}

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

  .focus-hub.compact .timer-break-panel {
    margin-top: 7px;
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

  .timer-break-panel {
    margin-top: 8px;
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

  .break-prompt-card {
    border: 1px solid color-mix(in srgb, var(--ws-accent, #1d4ed8) 45%, var(--ws-border, #dbe5f2));
    border-radius: 14px;
    background: color-mix(in srgb, var(--ws-panel-bg, rgba(255, 255, 255, 0.82)) 94%, transparent);
    padding: 10px 12px;
    display: grid;
    gap: 8px;
  }

  .break-prompt-head {
    display: grid;
    gap: 4px;
  }

  .break-prompt-head strong {
    color: var(--ws-text-strong, #0f172a);
    font-size: 14px;
  }

  .break-prompt-sub {
    color: var(--ws-muted, #64748b);
    font-size: 12px;
    line-height: 1.4;
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
