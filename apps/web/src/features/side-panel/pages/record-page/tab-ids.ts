export type ViewRecordTabId = "workflow" | "activity" | "files" | "data";
export type CreateLeadTabId = "home" | "activity" | "files";

export type LeadRecordDraftState = {
  activeTab: CreateLeadTabId;
  ruc: string;
};

export const DEFAULT_LEAD_RECORD_DRAFT_STATE: LeadRecordDraftState = {
  activeTab: "home",
  ruc: "",
};
