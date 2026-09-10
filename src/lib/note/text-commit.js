/** Save a captured document, preserving the caller's draft on every failure.
 * @param {{ invoke: Function; id: string; text: string; expectedText: string; sortMode: string; onError: Function }} input
 */
export async function commitNoteText(input) {
  try {
    await input.invoke("update_note_text", {
      id: input.id, text: input.text, expectedText: input.expectedText, sortMode: input.sortMode,
    });
    return true;
  } catch (error) {
    input.onError(error);
    return false;
  }
}

/** @param {{ currentId: string; incomingId: string; currentText: string; incomingText: string; dirty: boolean; saving: boolean; savingText: string | null }} input */
export function shouldPreserveEditorDocument(input) {
  const changed = input.currentId !== input.incomingId || input.currentText !== input.incomingText;
  const ownSave = input.saving && input.currentId === input.incomingId && input.incomingText === input.savingText;
  return changed && (input.dirty || input.saving) && !ownSave;
}
