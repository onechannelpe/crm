import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

import { deriveLeadPatchFromIntent } from "../../domain/lead/lead-transitions";
import { createPipelineAuditLogRepo, createPipelineAuditService } from "../audit-log";
import { createAssignmentRepo } from "../assignment-repo";
import { createHistoryRepo } from "../history-repo";
import { createLeadRepo } from "../lead-repo";
import type {
  LeadMutationUow,
  LeadMutationOutcome,
  CheckedLeadMutationOutcome,
} from "../../application/ports/lead-mutation-uow";
import {
  executeCheckedLeadMutation,
  executeLeadMutation,
} from "../../application/services/lead-mutation-orchestrator";
import { createLeadAssignmentRepositoryPort } from "./lead-assignment-repo";
import { createLeadAuditRepository } from "./lead-audit-repo";
import { createLeadEventRepository } from "./lead-event-repo";
import {
  createCheckedLeadWriteRepository,
  createLeadWriteRepository,
} from "./lead-write-repo";

function isRootExecutor(executor: DatabaseExecutor): executor is Kysely<Database> {
  return "transaction" in executor;
}

async function inAtomicScope<T>(
  executor: DatabaseExecutor,
  operation: (tx: DatabaseExecutor) => Promise<T>,
): Promise<T> {
  if (!isRootExecutor(executor)) {
    return operation(executor);
  }

  return executor.transaction().execute((trx) => operation(trx));
}

function createMutationDeps(executor: DatabaseExecutor) {
  const leads = createLeadRepo(executor);
  const leadHistory = createHistoryRepo(executor);
  const leadAssignments = createAssignmentRepo(executor);
  const auditService = createPipelineAuditService({
    auditLogs: createPipelineAuditLogRepo(createAuditLogsRepo(executor)),
  });

  return {
    leadWriter: createLeadWriteRepository(leads),
    checkedLeadWriter: createCheckedLeadWriteRepository(executor),
    eventRepository: createLeadEventRepository(leadHistory),
    auditRepository: createLeadAuditRepository(auditService),
    leadAssignments: createLeadAssignmentRepositoryPort(leadAssignments),
  };
}

export function createLeadMutationUow(executor: DatabaseExecutor): LeadMutationUow {
  return {
    derivePatch(input) {
      return deriveLeadPatchFromIntent(input);
    },

    async commit(
      input,
    ): Promise<Result<LeadMutationOutcome, DomainError>> {
      return inAtomicScope(executor, async (tx) => {
        const deps = createMutationDeps(tx);

        if (input.assignment) {
          await deps.leadAssignments.replaceActiveAssignment({
            leadId: input.assignment.leadId,
            toExecutiveId: input.assignment.toExecutiveId,
            assignedBy: input.assignment.assignedBy,
            assignedAt: input.assignment.assignedAt,
          });
        }

        return executeLeadMutation({
          deps: {
            leadWriter: deps.leadWriter,
            checkedLeadWriter: deps.checkedLeadWriter,
            eventRepository: deps.eventRepository,
            auditRepository: deps.auditRepository,
          },
          lead: input.lead,
          actorUserId: input.actorUserId,
          now: input.now,
          intent: input.intent,
        });
      });
    },

    async commitChecked(
      input,
    ): Promise<Result<CheckedLeadMutationOutcome, DomainError>> {
      return inAtomicScope(executor, async (tx) => {
        const deps = createMutationDeps(tx);
        return executeCheckedLeadMutation({
          deps: {
            leadWriter: deps.leadWriter,
            checkedLeadWriter: deps.checkedLeadWriter,
            eventRepository: deps.eventRepository,
            auditRepository: deps.auditRepository,
          },
          lead: input.lead,
          actorUserId: input.actorUserId,
          now: input.now,
          expectedUpdatedAt: input.expectedUpdatedAt,
          intent: input.intent,
        });
      });
    },
  };
}
