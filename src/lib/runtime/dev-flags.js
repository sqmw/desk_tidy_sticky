export const showDevQuickActions = Boolean(import.meta.env.DEV);
export const enableReviewDevFixtures = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_REVIEW_DEV_FIXTURES !== "false",
);
