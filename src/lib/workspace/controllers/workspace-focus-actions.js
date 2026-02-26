/**
 * @param {{
 *   normalizePomodoroConfig: (input: unknown) => {
 *     breakReminderEnabled: boolean;
 *     focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakEvery: number;
 *     miniBreakEveryMinutes: number; miniBreakDurationSeconds: number; longBreakEveryMinutes: number; longBreakDurationMinutes: number; breakNotifyBeforeSeconds: number;
 *     taskStartReminderEnabled: boolean; taskStartReminderLeadMinutes: number;
 *     miniBreakPostponeMinutes: number; longBreakPostponeMinutes: number; breakPostponeLimit: number; breakStrictMode: boolean; breakReminderMode: string;
 *     independentMiniBreakEveryMinutes: number; independentLongBreakEveryMinutes: number;
 *   };
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
 *   getFocusTasks: () => any[];
 *   setFocusTasks: (next: any[]) => void;
 *   setFocusStats: (next: Record<string, any>) => void;
 *   setFocusBreakSession: (next: { mode: string; untilTs: number; scope?: string; taskId?: string; taskTitle?: string }) => void;
 *   setFocusSelectedTaskId: (nextTaskId: string) => void;
 *   setFocusCommand: (next: { nonce: number; type: "select" | "start"; taskId: string }) => void;
 *   setPomodoroConfig: (next: {
 *     breakReminderEnabled: boolean;
 *     focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakEvery: number;
 *     miniBreakEveryMinutes: number; miniBreakDurationSeconds: number; longBreakEveryMinutes: number; longBreakDurationMinutes: number; breakNotifyBeforeSeconds: number;
 *     taskStartReminderEnabled: boolean; taskStartReminderLeadMinutes: number;
 *     miniBreakPostponeMinutes: number; longBreakPostponeMinutes: number; breakPostponeLimit: number; breakStrictMode: boolean; breakReminderMode: string;
 *     independentMiniBreakEveryMinutes: number; independentLongBreakEveryMinutes: number;
 *   }) => void;
 *   setMainTab: (tab: string) => Promise<void>;
 *   focusTabKey: string;
 *   timeToMinutes: (timeText: string) => number;
 *   minutesToTime: (minutes: number) => string;
 * }} deps
 */
export function createWorkspaceFocusActions(deps) {
  /**
   * @param {{
   * breakReminderEnabled:boolean;
   * focusMinutes:number;shortBreakMinutes:number;longBreakMinutes:number;longBreakEvery:number;
   * miniBreakEveryMinutes:number;miniBreakDurationSeconds:number;longBreakEveryMinutes:number;longBreakDurationMinutes:number;breakNotifyBeforeSeconds:number;
   * taskStartReminderEnabled:boolean;taskStartReminderLeadMinutes:number;
   * miniBreakPostponeMinutes:number;longBreakPostponeMinutes:number;breakPostponeLimit:number;breakStrictMode:boolean;breakReminderMode:string;
   * independentMiniBreakEveryMinutes:number;independentLongBreakEveryMinutes:number;
   * }} next
   */
  async function changePomodoroConfig(next) {
    const safe = deps.normalizePomodoroConfig(next);
    deps.setPomodoroConfig(safe);
    await deps.savePrefs({
      pomodoroBreakReminderEnabled: safe.breakReminderEnabled,
      pomodoroFocusMinutes: safe.focusMinutes,
      pomodoroShortBreakMinutes: safe.shortBreakMinutes,
      pomodoroLongBreakMinutes: safe.longBreakMinutes,
      pomodoroLongBreakEvery: safe.longBreakEvery,
      pomodoroMiniBreakEveryMinutes: safe.miniBreakEveryMinutes,
      pomodoroMiniBreakDurationSeconds: safe.miniBreakDurationSeconds,
      pomodoroLongBreakEveryMinutes: safe.longBreakEveryMinutes,
      pomodoroLongBreakDurationMinutes: safe.longBreakDurationMinutes,
      pomodoroBreakNotifyBeforeSeconds: safe.breakNotifyBeforeSeconds,
      pomodoroTaskStartReminderEnabled: safe.taskStartReminderEnabled,
      pomodoroTaskStartReminderLeadMinutes: safe.taskStartReminderLeadMinutes,
      pomodoroMiniBreakPostponeMinutes: safe.miniBreakPostponeMinutes,
      pomodoroLongBreakPostponeMinutes: safe.longBreakPostponeMinutes,
      pomodoroBreakPostponeLimit: safe.breakPostponeLimit,
      pomodoroBreakStrictMode: safe.breakStrictMode,
      pomodoroBreakReminderMode: safe.breakReminderMode,
      pomodoroIndependentMiniBreakEveryMinutes: safe.independentMiniBreakEveryMinutes,
      pomodoroIndependentLongBreakEveryMinutes: safe.independentLongBreakEveryMinutes,
    });
  }

  /** @param {any[]} next */
  async function changeFocusTasks(next) {
    const safeTasks = Array.isArray(next) ? next : [];
    deps.setFocusTasks(safeTasks);
    await deps.savePrefs({ focusTasksJson: JSON.stringify(safeTasks) });
  }

  /** @param {Record<string, any>} next */
  async function changeFocusStats(next) {
    const safeStats = next && typeof next === "object" ? next : {};
    deps.setFocusStats(safeStats);
    await deps.savePrefs({ focusStatsJson: JSON.stringify(safeStats) });
  }

  /**
   * @param {{ mode: string; untilTs: number; scope?: string; taskId?: string; taskTitle?: string }} next
   */
  async function changeFocusBreakSession(next) {
    const safe = {
      mode: String(next?.mode || "none"),
      untilTs: Number.isFinite(Number(next?.untilTs)) ? Math.max(0, Math.round(Number(next.untilTs))) : 0,
      scope: String(next?.scope || "global"),
      taskId: String(next?.taskId || ""),
      taskTitle: String(next?.taskTitle || ""),
    };
    deps.setFocusBreakSession(safe);
    await deps.savePrefs({ focusBreakSessionJson: JSON.stringify(safe) });
  }

  /** @param {string} nextTaskId */
  function changeFocusSelectedTask(nextTaskId) {
    deps.setFocusSelectedTaskId(String(nextTaskId || ""));
  }

  /**
   * @param {string} taskId
   * @param {"select" | "start" | "snooze15" | "snooze30"} [action]
   */
  async function handleDeadlineAction(taskId, action = "select") {
    const nextTaskId = String(taskId || "");
    if (action === "snooze15" || action === "snooze30") {
      const deltaMinutes = action === "snooze30" ? 30 : 15;
      const nextTasks = deps.getFocusTasks().map((task) => {
        if (String(task.id) !== nextTaskId) return task;
        const startM = deps.timeToMinutes(task.startTime || "09:00");
        const endM = deps.timeToMinutes(task.endTime || "10:00");
        return {
          ...task,
          startTime: deps.minutesToTime(startM + deltaMinutes),
          endTime: deps.minutesToTime(endM + deltaMinutes),
        };
      });
      await changeFocusTasks(nextTasks);
      return;
    }

    deps.setFocusSelectedTaskId(nextTaskId);
    deps.setFocusCommand({
      nonce: Date.now(),
      type: action === "start" ? "start" : "select",
      taskId: nextTaskId,
    });
    await deps.setMainTab(deps.focusTabKey);
  }

  return {
    changePomodoroConfig,
    changeFocusTasks,
    changeFocusStats,
    changeFocusBreakSession,
    changeFocusSelectedTask,
    handleDeadlineAction,
  };
}
