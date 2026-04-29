export const LEAD_RECORD_PRIMARY_TABS = ["home", "timeline", "tasks"] as const;

export const LEAD_RECORD_SECONDARY_TABS = [
  "notes",
  "files",
  "emails",
  "calendar",
  "sedes",
] as const;

export type LeadRecordPrimaryTabId = (typeof LEAD_RECORD_PRIMARY_TABS)[number];
export type LeadRecordSecondaryTabId =
  (typeof LEAD_RECORD_SECONDARY_TABS)[number];
export type LeadRecordTabId = LeadRecordPrimaryTabId | LeadRecordSecondaryTabId;

export type LeadRecordDraftState = {
  activeTab: LeadRecordTabId;
  ruc: string;
};

export const DEFAULT_LEAD_RECORD_DRAFT_STATE: LeadRecordDraftState = {
  activeTab: "home",
  ruc: "",
};
