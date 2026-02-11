export const WORKSPACE_MAIN_TAB_NOTES = "notes";
export const WORKSPACE_MAIN_TAB_FOCUS = "focus";
export const WORKSPACE_NOTE_VIEW_ACTIVE = "active";
export const WORKSPACE_NOTE_VIEW_TODO = "todo";
export const WORKSPACE_NOTE_VIEW_QUADRANT = "quadrant";
export const WORKSPACE_NOTE_VIEW_ARCHIVED = "archived";
export const WORKSPACE_NOTE_VIEW_TRASH = "trash";
export const WORKSPACE_INITIAL_VIEW_LAST = "last";
export const WORKSPACE_INITIAL_VIEW_MODES = [
  WORKSPACE_INITIAL_VIEW_LAST,
  WORKSPACE_NOTE_VIEW_ACTIVE,
  WORKSPACE_NOTE_VIEW_TODO,
  WORKSPACE_NOTE_VIEW_QUADRANT,
];

export const WORKSPACE_MAIN_TABS = [WORKSPACE_MAIN_TAB_NOTES, WORKSPACE_MAIN_TAB_FOCUS];
export const WORKSPACE_NOTE_VIEW_MODES = [
  WORKSPACE_NOTE_VIEW_ACTIVE,
  WORKSPACE_NOTE_VIEW_TODO,
  WORKSPACE_NOTE_VIEW_QUADRANT,
  WORKSPACE_NOTE_VIEW_ARCHIVED,
  WORKSPACE_NOTE_VIEW_TRASH,
];

/** @param {unknown} value */
export function normalizeWorkspaceMainTab(value) {
  return value === WORKSPACE_MAIN_TAB_FOCUS
    ? WORKSPACE_MAIN_TAB_FOCUS
    : WORKSPACE_MAIN_TAB_NOTES;
}

/** @param {unknown} value */
export function normalizeWorkspaceViewMode(value) {
  return WORKSPACE_NOTE_VIEW_MODES.includes(/** @type {string} */ (value))
    ? /** @type {string} */ (value)
    : WORKSPACE_NOTE_VIEW_ACTIVE;
}

/** @param {unknown} value */
export function normalizeWorkspaceInitialViewMode(value) {
  const safe = /** @type {string} */ (value);
  if (safe === WORKSPACE_NOTE_VIEW_ACTIVE) return WORKSPACE_NOTE_VIEW_ACTIVE;
  if (safe === WORKSPACE_NOTE_VIEW_TODO) return WORKSPACE_NOTE_VIEW_TODO;
  if (safe === WORKSPACE_NOTE_VIEW_QUADRANT) return WORKSPACE_NOTE_VIEW_QUADRANT;
  return WORKSPACE_INITIAL_VIEW_LAST;
}

/**
 * @param {string} initialViewMode
 * @param {string} rememberedViewMode
 */
export function resolveWorkspaceStartupViewMode(initialViewMode, rememberedViewMode) {
  const safeInitial = normalizeWorkspaceInitialViewMode(initialViewMode);
  if (safeInitial === WORKSPACE_INITIAL_VIEW_LAST) {
    return normalizeWorkspaceViewMode(rememberedViewMode);
  }
  return safeInitial;
}

/** @param {any} strings */
export function getWorkspaceMainTabDefs(strings) {
  return [
    { key: WORKSPACE_MAIN_TAB_NOTES, label: strings.workspaceTabNotes },
    { key: WORKSPACE_MAIN_TAB_FOCUS, label: strings.workspaceTabFocus },
  ];
}

/**
 * @param {any} strings
 * @param {string} mode
 */
export function getWorkspaceViewModeLabel(strings, mode) {
  if (mode === WORKSPACE_NOTE_VIEW_TODO) return strings.workspaceTodoView || strings.todo;
  if (mode === WORKSPACE_NOTE_VIEW_QUADRANT) return strings.quadrant;
  if (mode === WORKSPACE_NOTE_VIEW_ARCHIVED) return strings.archived;
  if (mode === WORKSPACE_NOTE_VIEW_TRASH) return strings.trash;
  return strings.active;
}

/**
 * @param {any} strings
 * @param {string} mode
 */
export function getWorkspaceInitialViewModeLabel(strings, mode) {
  if (mode === WORKSPACE_NOTE_VIEW_TODO) return strings.todo;
  if (mode === WORKSPACE_NOTE_VIEW_QUADRANT) return strings.quadrant;
  if (mode === WORKSPACE_NOTE_VIEW_ACTIVE) return strings.active;
  return strings.workspaceInitialViewLast;
}
