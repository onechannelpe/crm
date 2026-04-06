import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadSaleRepository } from "../ports/sale-repository";

export type CompleteCommercialInputDeps = {
  leads: LeadRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
};

export type CreateSaleDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
  leadSales: LeadSaleRepository;
};
