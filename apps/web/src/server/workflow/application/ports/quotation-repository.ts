import type { Moneda } from "~/contracts/workflow/vocabulary";

export type LeadQuotation = {
  id: string;
  leadId: string;
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
  insert(values: Omit<LeadQuotation, "id">): Promise<string>;
  listByLeadId(leadId: string): Promise<LeadQuotation[]>;
  nextVersion(leadId: string): Promise<number>;
};
