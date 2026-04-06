import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";

export type CreateQuotationDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
};

export type ApproveForSaleDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
};
