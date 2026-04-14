import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { PipelineEngineGateway } from "../ports/engine-gateway";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadQueries } from "../ports/lead-queries";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";
import type { LeadSaleRepository } from "../ports/sale-repository";
import type { SourceStatusRepository } from "../ports/source-status-repository";

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
};

export type LeadBootstrapPreviewDeps = {
  leads: LeadRepository;
  engineGateway: PipelineEngineGateway;
};

export type SaleQueryDeps = {
  leadSales: LeadSaleRepository;
};
