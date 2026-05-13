export const LEAD_RECORD_PRIMARY_TABS = ["home", "activity", "tasks"] as const;

export const VIEW_RECORD_SECONDARY_TABS = ["sedes", "files"] as const;

export const CREATE_LEAD_SECONDARY_TABS = ["files"] as const;

export type LeadRecordPrimaryTabId = (typeof LEAD_RECORD_PRIMARY_TABS)[number];
export type ViewRecordSecondaryTabId =
  (typeof VIEW_RECORD_SECONDARY_TABS)[number];
export type CreateLeadSecondaryTabId =
  (typeof CREATE_LEAD_SECONDARY_TABS)[number];
export type ViewRecordTabId = LeadRecordPrimaryTabId | ViewRecordSecondaryTabId;
export type CreateLeadTabId = LeadRecordPrimaryTabId | CreateLeadSecondaryTabId;

export type LeadRecordDraftState = {
  activeTab: CreateLeadTabId;
  ruc: string;
};

export const DEFAULT_LEAD_RECORD_DRAFT_STATE: LeadRecordDraftState = {
  activeTab: "home",
  ruc: "",
};
