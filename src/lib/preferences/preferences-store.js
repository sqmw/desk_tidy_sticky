/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 */
export async function getPreferences(invoke) {
  return invoke("get_preferences");
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {Record<string, any>} updates
 */
export async function updatePreferences(invoke, updates) {
  const prefs = await getPreferences(invoke);
  await invoke("set_preferences", { prefs: { ...prefs, ...updates } });
}
