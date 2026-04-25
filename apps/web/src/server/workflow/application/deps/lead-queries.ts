import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadFavoriteRepository } from "../ports/lead-favorite-repository";
import type { LeadQueries } from "../ports/lead-queries";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadSaleRepository } from "../ports/sale-repository";
import type { SourceStatusRepository } from "../ports/source-status-repository";
import type { WorkflowUserRepository } from "../ports/user-repository";

export type LeadListDeps = {
  leads: LeadQueries;
};

export type LeadDetailDeps = {
  leads: LeadRepository;
  leadFavorites: LeadFavoriteRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
  sourceStatuses: SourceStatusRepository;
  users: WorkflowUserRepository;
};

export type LeadBootstrapPreviewDeps = {
  leads: LeadRepository;
};

export type AssignableExecutivesDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};
