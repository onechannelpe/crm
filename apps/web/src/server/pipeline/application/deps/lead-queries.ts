import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadSaleRepository } from "../ports/sale-repository";

export type LeadListDeps = {
  leads: LeadRepository;
};

export type LeadDetailDeps = {
  leads: LeadRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
};

export type SaleQueryDeps = {
  leadSales: LeadSaleRepository;
};
