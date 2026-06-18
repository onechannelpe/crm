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
  // Identity is resolved from the SUNAT preview and shown read-only; it is never
  // submitted (the server is the single owner). Null until the preview resolves.
  razonSocial: string | null;
  address: string | null;
  engineStatus: string;
  commercialScope: CommercialScopeBinding;
};

export type RecordContext = LeadRecordContext | DraftRecordContext;
