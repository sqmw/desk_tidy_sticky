/**
 * @param {{
 *   doc: Document;
 *   shape: string;
 *   onApplyTheme: () => void;
 * }} params
 */
export async function runWorkspaceThemeTransition(params) {
  const { doc, shape, onApplyTheme } = params;
  const root = doc.documentElement;
  const leftInset = 26;
  const bottomInset = 26;

  root.style.setProperty("--ws-vt-x", `${leftInset}px`);
  root.style.setProperty("--ws-vt-y", `${window.innerHeight - bottomInset}px`);
  root.dataset.wsVtShape = shape === "heart" ? "heart" : "circle";
  root.classList.add("ws-vt-running");

  const viewTransitionDoc = /** @type {any} */ (doc);
  try {
    if (typeof viewTransitionDoc.startViewTransition === "function") {
      const transition = viewTransitionDoc.startViewTransition(onApplyTheme);
      await transition.finished;
      return;
    }
    onApplyTheme();
  } finally {
    root.classList.remove("ws-vt-running");
  }
}
