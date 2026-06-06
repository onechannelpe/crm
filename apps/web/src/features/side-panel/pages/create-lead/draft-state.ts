import type { RecordTabId } from "~/features/record-show/model/record-tab-id";

export type LeadRecordDraftState = {
  activeTab: RecordTabId;
  ruc: string;
};

export const DEFAULT_LEAD_RECORD_DRAFT_STATE: LeadRecordDraftState = {
  activeTab: "home",
  ruc: "",
};
