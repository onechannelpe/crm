import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { WorkflowEngineGateway } from "../ports/engine-gateway";
import type { LeadHistoryRepository } from "../ports/history-repository";
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
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
  sourceStatuses: SourceStatusRepository;
  users: WorkflowUserRepository;
};

export type LeadBootstrapPreviewDeps = {
  leads: LeadRepository;
  engineGateway: WorkflowEngineGateway;
};

export type AssignableExecutivesDeps = {
  leads: LeadRepository;
  users: WorkflowUserRepository;
};
