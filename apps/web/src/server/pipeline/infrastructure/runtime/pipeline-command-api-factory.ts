import type { PipelineDeps } from "~/server/features/pipeline/application/pipeline-deps";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createPipelineCommandApi,
  type PipelineCommandApi,
} from "../../application/command-api";
import type { PipelineAuditService } from "../../application/ports/audit-service";
import type { PipelineNotificationCenter } from "../../application/ports/notification-center";
import { systemLeadClock } from "../../application/services/lead-clock";
import { createLeadAssignmentRepositoryPort } from "../repos/lead-assignment-repo";
import { createLeadAuditRepository } from "../repos/lead-audit-repo";
import { createLeadEventRepository } from "../repos/lead-event-repo";
import { createLeadReadRepository } from "../repos/lead-read-repo";
import { createLeadUserScopeRepository } from "../repos/lead-user-scope-repo";
import {
  createLeadWriteRepository,
  createCheckedLeadWriteRepository,
} from "../repos/lead-write-repo";

export function createPipelineCommandApiRuntime(input: {
  deps: PipelineDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  executor?: DatabaseExecutor;
}): PipelineCommandApi {
  return createPipelineCommandApi({
    leadReader: createLeadReadRepository(input.deps.leadMutations.leads),
    leadWriter: createLeadWriteRepository(input.deps.leadMutations.leads),
    checkedLeadWriter: input.executor
      ? createCheckedLeadWriteRepository(input.executor)
      : undefined,
    eventRepository: createLeadEventRepository(
      input.deps.leadMutations.leadHistory,
    ),
    auditRepository: createLeadAuditRepository(input.auditService),
    leadAssignments: createLeadAssignmentRepositoryPort(
      input.deps.leadMutations.leadAssignments,
    ),
    users: createLeadUserScopeRepository(input.deps.leadMutations.users),
    notificationCenter: input.notificationCenter,
    clock: systemLeadClock,
  });
}
