export const LEAD_WORKSPACE_VIEWS = [
  "mine",
  "review",
  "quotation",
  "all",
] as const;

export type LeadWorkspaceViewId = (typeof LEAD_WORKSPACE_VIEWS)[number];
