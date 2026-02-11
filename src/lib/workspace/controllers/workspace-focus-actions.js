/**
 * @param {{
 *   normalizePomodoroConfig: (input: unknown) => { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakEvery: number };
 *   savePrefs: (updates: Record<string, any>) => Promise<void>;
 *   getFocusTasks: () => any[];
 *   setFocusTasks: (next: any[]) => void;
 *   setFocusStats: (next: Record<string, any>) => void;
 *   setFocusSelectedTaskId: (nextTaskId: string) => void;
 *   setFocusCommand: (next: { nonce: number; type: "select" | "start"; taskId: string }) => void;
 *   setPomodoroConfig: (next: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakEvery: number }) => void;
 *   setMainTab: (tab: string) => Promise<void>;
 *   focusTabKey: string;
 *   timeToMinutes: (timeText: string) => number;
 *   minutesToTime: (minutes: number) => string;
 * }} deps
 */
export function createWorkspaceFocusActions(deps) {
  /**
   * @param {{focusMinutes:number;shortBreakMinutes:number;longBreakMinutes:number;longBreakEvery:number}} next
   */
  async function changePomodoroConfig(next) {
    const safe = deps.normalizePomodoroConfig(next);
    deps.setPomodoroConfig(safe);
    await deps.savePrefs({
      pomodoroFocusMinutes: safe.focusMinutes,
      pomodoroShortBreakMinutes: safe.shortBreakMinutes,
      pomodoroLongBreakMinutes: safe.longBreakMinutes,
      pomodoroLongBreakEvery: safe.longBreakEvery,
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
    changeFocusSelectedTask,
    handleDeadlineAction,
  };
}
