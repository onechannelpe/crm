import type { PipelineDeps } from "~/server/features/pipeline/application/pipeline-deps";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createPipelineCommandApi,
  type PipelineCommandApi,
} from "../../application/command-api";
import type { PipelineAuditService } from "../../application/ports/audit-service";
import type { PipelineEngineGateway } from "../../application/ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../../application/ports/enrichment-queue";
import type { PipelineNotificationCenter } from "../../application/ports/notification-center";
import { systemLeadClock } from "../../application/services/lead-clock";
import { createCommercialInputRepo } from "../commercial-input-repo";
import { createQuotationRepo } from "../quotation-repo";
import { createLeadMutationUow } from "../repos/lead-mutation-uow";
import { createLeadReadRepository } from "../repos/lead-read-repo";
import { createLeadUserScopeRepository } from "../repos/lead-user-scope-repo";
import { createSaleRepo } from "../sale-repo";

export type PipelineCommandApiRuntimeInput = {
  executor: DatabaseExecutor;
  deps: PipelineDeps;
  notificationCenter: PipelineNotificationCenter;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
};

export function createPipelineCommandApiRuntime(
  input: PipelineCommandApiRuntimeInput,
): PipelineCommandApi {
  return createPipelineCommandApi({
    leadReader: createLeadReadRepository(input.deps.leadMutations.leads),
    mutationUow: createLeadMutationUow(input.executor),
    users: createLeadUserScopeRepository(input.deps.leadMutations.users),
    notificationCenter: input.notificationCenter,
    clock: systemLeadClock,
    registerLead: input.deps.registerLead,
    auditService: input.auditService,
    engineGateway: input.engineGateway,
    leadEnrichmentQueue: input.leadEnrichmentQueue,
    leadQuotations: createQuotationRepo(input.executor),
    leadCommercialInputs: createCommercialInputRepo(input.executor),
    leadSales: createSaleRepo(input.executor),
  });
}
