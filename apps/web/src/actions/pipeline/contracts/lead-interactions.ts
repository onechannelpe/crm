import type { LeadCallOutcome } from "./lead-detail";

export type RecordLeadCallInput = {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
};

export type AddLeadNoteInput = {
  leadId: number;
  body: string;
};
