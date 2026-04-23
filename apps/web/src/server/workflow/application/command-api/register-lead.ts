import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import { registerLead } from "../commands/register-lead";
import type { RegisterLeadInput } from "../contracts/command-inputs";
import type { LeadCommandResult } from "../contracts/command-results";
import type { RegisterLeadDeps } from "../deps/register-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineEngineGateway } from "../ports/engine-gateway";
import type { LeadEnrichmentQueue } from "../ports/enrichment-queue";
import type { LeadMutationUow } from "../ports/lead-mutation-uow";

type RegisterLeadCommandDeps = {
  registerLead: RegisterLeadDeps;
  mutationUow: LeadMutationUow;
  auditService: PipelineAuditService;
  engineGateway: PipelineEngineGateway;
  leadEnrichmentQueue: LeadEnrichmentQueue;
};

export async function registerLeadCommand(
  deps: RegisterLeadCommandDeps,
  input: RegisterLeadInput,
): Promise<Result<LeadCommandResult, DomainError>> {
  return registerLead({
    ruc: input.ruc,
    executiveId: input.executiveId,
    actorUserId: input.actor.userId,
    actorRole: input.actor.role,
    deps: deps.registerLead,
    mutationUow: deps.mutationUow,
    auditService: deps.auditService,
    engineGateway: deps.engineGateway,
    leadEnrichmentQueue: deps.leadEnrichmentQueue,
  });
}
