/** @type {Record<string, any> | null} */
let prefsCache = null;
/** @type {Promise<void>} */
let writeQueue = Promise.resolve();

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @returns {Promise<Record<string, any>>}
 */
export async function getPreferences(invoke) {
  const prefs = await invoke("get_preferences");
  const safePrefs = prefs && typeof prefs === "object" ? { ...prefs } : {};
  prefsCache = safePrefs;
  return safePrefs;
}

/**
 * @param {(cmd: string, args?: any) => Promise<any>} invoke
 * @param {Record<string, any>} updates
 */
export async function updatePreferences(invoke, updates) {
  const task = async () => {
    const base = prefsCache || (await getPreferences(invoke));
    const next = { ...base, ...updates };
    await invoke("set_preferences", { prefs: next });
    prefsCache = next;
  };
  writeQueue = writeQueue.then(
    () => task(),
    () => task(),
  );
  await writeQueue;
}
