/**
 * @param {{
 *   listenPreferencesChanged: typeof import("$lib/preferences/preferences-sync.js").listenPreferencesChanged;
 *   setShowPanelOnStartup: (next: boolean) => void;
 *   setAutostartEnabled: (next: boolean) => void;
 *   setStickiesVisible: (next: boolean) => void;
 *   syncWindows: () => Promise<void>;
 * }} deps
 */
export function createWorkspacePreferenceSync(deps) {
  /**
   * @returns {Promise<() => void>}
   */
  async function mountPreferenceSync() {
    return deps.listenPreferencesChanged(async (updates) => {
      if (typeof updates.showPanelOnStartup === "boolean") {
        deps.setShowPanelOnStartup(updates.showPanelOnStartup);
      }
      if (typeof updates.autostartEnabled === "boolean") {
        deps.setAutostartEnabled(updates.autostartEnabled);
      }
      if (typeof updates.overlayEnabled === "boolean") {
        deps.setStickiesVisible(updates.overlayEnabled);
        await deps.syncWindows();
      }
    });
  }

  return {
    mountPreferenceSync,
  };
}
