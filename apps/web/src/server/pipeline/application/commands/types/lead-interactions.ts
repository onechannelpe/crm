import type { LeadCallOutcome } from "../../../domain/lead";

export type LogCallInput = {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
};

export type AddNoteInput = {
  leadId: number;
  body: string;
};

export type LeadInteractionResult = {
  interactionId: number;
};
