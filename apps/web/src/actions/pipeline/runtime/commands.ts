import type { LeadAssignmentRepository } from "~/server/pipeline/application/ports/assignment-repository";
import type { PipelineAuditService } from "~/server/pipeline/application/ports/audit-service";
import type { LeadCommercialInputRepository } from "~/server/pipeline/application/ports/commercial-input-repository";
import type { PipelineEngineGateway } from "~/server/pipeline/application/ports/engine-gateway";
import type { LeadHistoryRepository } from "~/server/pipeline/application/ports/history-repository";
import type { LeadRepository } from "~/server/pipeline/application/ports/lead-repository";
import type { PipelineNotificationCenter } from "~/server/pipeline/application/ports/notification-center";
import type { LeadQuotationRepository } from "~/server/pipeline/application/ports/quotation-repository";
import type { LeadSaleRepository } from "~/server/pipeline/application/ports/sale-repository";
import type { LeadSourcingPolicyRepository } from "~/server/pipeline/application/ports/sourcing-policy-repository";
import type { PipelineUserRepository } from "~/server/pipeline/application/ports/user-repository";
import { createPipelineAuditService } from "~/server/pipeline/infrastructure/audit-log";
import {
  createPipelineCommandDeps,
  createPipelineEngineGateway,
} from "~/server/pipeline/infrastructure/deps";
import { createPipelineNotificationCenter } from "~/server/pipeline/infrastructure/notifications";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";

export type PipelineCommandDeps = {
  leads: LeadRepository;
  leadAssignments: LeadAssignmentRepository;
  leadHistory: LeadHistoryRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadQuotations: LeadQuotationRepository;
  leadSales: LeadSaleRepository;
  sourcingPolicies: LeadSourcingPolicyRepository;
  users: PipelineUserRepository;
};

export type PipelineCommandRuntime = {
  deps: PipelineCommandDeps;
  auditService: PipelineAuditService;
};

export type PipelineNotificationRuntime = PipelineCommandRuntime & {
  notificationCenter: PipelineNotificationCenter;
};

export type PipelineRegistrationRuntime = PipelineCommandRuntime & {
  engineGateway: PipelineEngineGateway;
};

export function runPipelineCommand<TResult>(
  operation: (runtime: PipelineCommandRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineCommandDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
    });
  });
}

export function runPipelineNotificationCommand<TResult>(
  operation: (runtime: PipelineNotificationRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineCommandDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
      notificationCenter: createPipelineNotificationCenter(executor),
    });
  });
}

export function runPipelineRegistrationCommand<TResult>(
  operation: (runtime: PipelineRegistrationRuntime) => Promise<TResult>,
): Promise<TResult> {
  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineCommandDeps(executor);
    return operation({
      deps,
      auditService: createPipelineAuditService(deps),
      engineGateway: createPipelineEngineGateway(),
    });
  });
}
