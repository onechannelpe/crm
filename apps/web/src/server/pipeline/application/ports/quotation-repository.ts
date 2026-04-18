import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

import type { LeadId } from "../../domain/lead-record";

export type LeadQuotation = {
  id: number;
  leadId: LeadId;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
  version: number;
  createdAt: number;
  createdBy: UserId;
};

export type LeadQuotationRepository = {
  insert(values: Omit<LeadQuotation, "id">): Promise<number>;
  listByLeadId(leadId: LeadId): Promise<LeadQuotation[]>;
  nextVersion(leadId: LeadId): Promise<number>;
};
