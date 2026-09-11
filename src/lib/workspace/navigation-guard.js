/** Serializes navigation without saving or discarding drafts on its own.
 * @param {{ current: () => string; canLeave: () => Promise<boolean>; resolve: (target: string) => Promise<string>; apply: (target: string) => Promise<void>; error: (message: string) => void }} deps
 */
export function createWorkspaceNavigation(deps) {
  let pending = false;
  return async (/** @type {string} */ target) => {
    if (pending || target === deps.current()) return false;
    pending = true;
    try {
      if (!await deps.canLeave()) return false;
      const resolved = await deps.resolve(target);
      // Resolving a native target is asynchronous: a blur save may have started meanwhile.
      if (!await deps.canLeave()) return false;
      await deps.apply(resolved);
      return true;
    } catch (error) {
      deps.error(String(error instanceof Error ? error.message : error));
      return false;
    } finally { pending = false; }
  };
}
