import type { LeadCommercialInputRepository } from "~/server/pipeline/application/ports/commercial-input-repository";
import type { LeadHistoryRepository } from "~/server/pipeline/application/ports/history-repository";
import type { LeadRepository } from "~/server/pipeline/application/ports/lead-repository";
import type { LeadQuotationRepository } from "~/server/pipeline/application/ports/quotation-repository";
import type { LeadSaleRepository } from "~/server/pipeline/application/ports/sale-repository";
import type { LeadSourcingPolicyRepository } from "~/server/pipeline/application/ports/sourcing-policy-repository";
import { createPipelineQueryDeps } from "~/server/pipeline/infrastructure/deps";

export type PipelineQueryDeps = {
  leads: LeadRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
  sourcingPolicies: LeadSourcingPolicyRepository;
};

export function createPipelineQueryRuntime(): PipelineQueryDeps {
  return createPipelineQueryDeps();
}
