export const LEAD_CREATE_PRIMARY_TABS = ["home", "timeline", "tasks"] as const;

export const LEAD_CREATE_SECONDARY_TABS = [
  "notes",
  "files",
  "emails",
  "calendar",
] as const;

export type LeadCreatePrimaryTabId = (typeof LEAD_CREATE_PRIMARY_TABS)[number];
export type LeadCreateSecondaryTabId =
  (typeof LEAD_CREATE_SECONDARY_TABS)[number];
export type LeadCreateTabId = LeadCreatePrimaryTabId | LeadCreateSecondaryTabId;

export type LeadCreateDraftState = {
  activeTab: LeadCreateTabId;
  ruc: string;
};

export const DEFAULT_LEAD_CREATE_DRAFT_STATE: LeadCreateDraftState = {
  activeTab: "home",
  ruc: "",
};
