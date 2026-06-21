import type { LeadDetailView } from "~/contracts/workflow/views";
import type { CommercialScopeFormValues } from "~/features/workflow/forms/commercial-scope/values";

export type CommercialScopeBinding = {
  values: CommercialScopeFormValues;
  setField: <K extends keyof CommercialScopeFormValues>(
    key: K,
    value: CommercialScopeFormValues[K],
  ) => void;
};

// Draft records are not LeadDetailView values. They carry the in-progress
// preview and submit affordances needed before a persisted lead exists.
export type LeadRecordContext = {
  kind: "lead";
  data: LeadDetailView;
};

export type DraftRecordContext = {
  kind: "draft";
  ruc: string;
  // Enrichment owns organization identity; draft forms display but never submit it.
  legalName: string | null;
  address: string | null;
  engineStatus: string;
  commercialScope: CommercialScopeBinding;
};

export type RecordContext = LeadRecordContext | DraftRecordContext;
