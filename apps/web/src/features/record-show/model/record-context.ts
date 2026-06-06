import type { LeadDetailView } from "~/contracts/workflow/views";

// Draft records are not LeadDetailView values. They carry the in-progress
// preview and submit affordances needed before a persisted lead exists.
export type LeadRecordContext = {
  kind: "lead";
  data: LeadDetailView;
};

export type DraftRecordContext = {
  kind: "draft";
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  engineStatus: string;
};

export type RecordContext = LeadRecordContext | DraftRecordContext;
