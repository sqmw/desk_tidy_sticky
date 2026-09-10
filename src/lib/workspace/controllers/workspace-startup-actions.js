/**
 * @param {{
 *   autostartEnable: () => Promise<void>;
 *   getAutostartAvailable: () => Promise<boolean>;
 *   setAutostartAvailable: (available: boolean) => void;
 *   autostartDisable: () => Promise<void>;
 *   autostartIsEnabled: () => Promise<boolean>;
 *   setAutostartEnabled: (next: boolean) => void;
 *   broadcastPreferencesChanged: (updates: Record<string, any>) => Promise<void>;
 * }} deps
 */
export function createWorkspaceStartupActions(deps) {
  let available = false;
  async function initAutostart() {
    try {
      available = await deps.getAutostartAvailable();
      deps.setAutostartAvailable(available);
      if (!available) { deps.setAutostartEnabled(false); return; }
      deps.setAutostartEnabled(await deps.autostartIsEnabled());
    } catch (error) {
      console.error("initAutostart(workspace)", error);
    }
  }

  /** @param {boolean} enabled */
  async function toggleAutostart(enabled) {
    if (!available) return;
    try {
      if (enabled) {
        await deps.autostartEnable();
      } else {
        await deps.autostartDisable();
      }
      const next = await deps.autostartIsEnabled();
      deps.setAutostartEnabled(next);
      await deps.broadcastPreferencesChanged({ autostartEnabled: next });
    } catch (error) {
      console.error("toggleAutostart(workspace)", error);
    }
  }

  return {
    initAutostart,
    toggleAutostart,
  };
}
