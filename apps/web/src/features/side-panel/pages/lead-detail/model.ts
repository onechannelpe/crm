export const LEAD_DETAIL_PRIMARY_TABS = ["home", "timeline", "tasks"] as const;

export const LEAD_DETAIL_SECONDARY_TABS = [
  "notes",
  "files",
  "emails",
  "calendar",
] as const;

export type LeadDetailPrimaryTabId = (typeof LEAD_DETAIL_PRIMARY_TABS)[number];
export type LeadDetailSecondaryTabId =
  (typeof LEAD_DETAIL_SECONDARY_TABS)[number];
export type LeadDetailTabId = LeadDetailPrimaryTabId | LeadDetailSecondaryTabId;
