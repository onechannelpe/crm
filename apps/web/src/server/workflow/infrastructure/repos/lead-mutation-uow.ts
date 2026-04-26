import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  LeadMutationUow,
  LeadMutationOutcome,
  CheckedLeadMutationOutcome,
} from "../../application/ports/lead-mutation-uow";
import {
  executeCheckedLeadMutation,
  executeLeadMutation,
} from "../../application/services/lead-mutation-orchestrator";
import { deriveLeadPatchFromIntent } from "../../domain/lead/lead-transitions";
import { createAssignmentRepo } from "../assignment-repo";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "../audit-log";
import { createHistoryRepo } from "../history-repo";
import { createLeadRepo } from "../lead-repo";
import { createLeadAssignmentRepositoryPort } from "./lead-assignment-repo";
import { createLeadAuditRepository } from "./lead-audit-repo";
import { createLeadEventRepository } from "./lead-event-repo";
import {
  createCheckedLeadWriteRepository,
  createLeadWriteRepository,
} from "./lead-write-repo";

function createMutationDeps(executor: Transaction<Database>) {
  const leads = createLeadRepo(executor);
  const leadHistory = createHistoryRepo(executor);
  const leadAssignments = createAssignmentRepo(executor);
  const auditService = createWorkflowAuditService({
    auditLogs: createWorkflowAuditLogRepo(
      createWorkflowAuditLogsRepo(executor),
    ),
  });

  return {
    leadWriter: createLeadWriteRepository(leads),
    checkedLeadWriter: createCheckedLeadWriteRepository(executor),
    eventRepository: createLeadEventRepository(leadHistory),
    auditRepository: createLeadAuditRepository(auditService),
    leadAssignments: createLeadAssignmentRepositoryPort(leadAssignments),
  };
}

export function createLeadMutationUow(
  executor: Transaction<Database>,
): LeadMutationUow {
  return {
    derivePatch(input) {
      return deriveLeadPatchFromIntent(input);
    },

    async commit(input): Promise<Result<LeadMutationOutcome, DomainError>> {
      const deps = createMutationDeps(executor);

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
    },

    async commitChecked(
      input,
    ): Promise<Result<CheckedLeadMutationOutcome, DomainError>> {
      const deps = createMutationDeps(executor);
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
    },
  };
}
