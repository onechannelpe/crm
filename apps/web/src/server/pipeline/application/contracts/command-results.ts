import type { LeadId } from "~/server/pipeline/domain/lead-record";

export type LeadCommandResult = {
  leadId: LeadId;
};

export type LeadInteractionResult = {
  interactionId: number;
};

export type LeadQuotationResult = {
  id: number;
};

export type LeadSaleResult = {
  id: number;
};
