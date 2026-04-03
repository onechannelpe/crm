import type { LeadCallOutcome } from "~/server/pipeline/domain/lead";

export type RecordLeadCallInput = {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
};

export type AddLeadNoteInput = {
  leadId: number;
  body: string;
};
