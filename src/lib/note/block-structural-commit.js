/**
 * Applies a structural document rewrite (block split, same-block append, backward
 * merge) whose editing session had to be torn down before the new text was known.
 *
 * Only the caller knows how to rebuild that session, so it supplies `restore`.
 * Without it a rejected write leaves the draft nowhere: the session is already gone
 * and the document was never updated. A save result of `undefined` counts as
 * success, matching the component's no-op default handler.
 *
 * Kept dependency-free so it can be unit tested outside the Svelte component.
 *
 * @template TSnapshot
 * @param {{
 *   nextText: string;
 *   snapshot: TSnapshot;
 *   save: (nextText: string) => Promise<boolean | void> | boolean | void;
 *   restore: (snapshot: TSnapshot) => void;
 *   clearPendingCaret: () => void;
 *   onConflict: () => void;
 * }} input
 * @returns {Promise<boolean>} whether the rewrite was persisted
 */
export async function applyStructuralTextChange(input) {
  const saved = await input.save(input.nextText);
  if (saved === false) {
    input.clearPendingCaret();
    input.restore(input.snapshot);
    input.onConflict();
    return false;
  }
  return true;
}
