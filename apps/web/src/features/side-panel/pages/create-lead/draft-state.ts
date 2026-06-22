import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import {
  EMPTY_COMMERCIAL_SCOPE_VALUES,
  type CommercialScopeFormValues,
} from "~/features/workflow/forms/commercial-scope/values";

export type LeadRecordDraftState = {
  activeTab: RecordTabId;
  ruc: string;
} & CommercialScopeFormValues;

export const DEFAULT_LEAD_RECORD_DRAFT_STATE: LeadRecordDraftState = {
  activeTab: "registro",
  ruc: "",
  ...EMPTY_COMMERCIAL_SCOPE_VALUES,
};
