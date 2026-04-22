import type { Moneda } from "~/pipeline/contracts/lead-schema";

export type LeadQuotation = {
  id: number;
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
  version: number;
  createdAt: number;
  createdBy: number;
};

export type LeadQuotationRepository = {
  insert(values: Omit<LeadQuotation, "id">): Promise<number>;
  listByLeadId(leadId: number): Promise<LeadQuotation[]>;
  nextVersion(leadId: number): Promise<number>;
};
