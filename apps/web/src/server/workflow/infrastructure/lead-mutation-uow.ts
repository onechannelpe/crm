import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

import type {
  LeadMutationUow,
  LeadMutationOutcome,
  CheckedLeadMutationOutcome,
} from "../application/ports/lead";
import {
  executeCheckedLeadMutation,
  executeLeadMutation,
} from "../application/services/lead-mutation-orchestrator";
import { deriveLeadPatchFromIntent } from "../domain/lead/lead-transitions";
import { createAssignmentRepo } from "./assignment-repo";
import {
  createWorkflowAuditLogRepo,
  createWorkflowAuditService,
  createWorkflowAuditLogsRepo,
} from "./audit-log";
import { createHistoryRepo } from "./history-repo";
import { createLeadAssignmentMutationRepository } from "./lead-assignment-mutation-repo";
import { createLeadAuditRepository } from "./lead-audit-repo";
import { createLeadEventRepository } from "./lead-event-repo";
import type { PublishLeadMutationNotificationsInput } from "./lead-mutation-notification-publisher";
import { createLeadRepo } from "./lead-repo";
import {
  createCheckedLeadWriteRepository,
  createLeadWriteRepository,
} from "./lead-write-repo";

function createMutationDeps(executor: DatabaseExecutor) {
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
    leadAssignments: createLeadAssignmentMutationRepository(leadAssignments),
  };
}

export function createLeadMutationUow(
  executor: DatabaseExecutor,
  options?: {
    publishNotifications?: (
      input: PublishLeadMutationNotificationsInput,
    ) => Promise<void>;
  },
): LeadMutationUow {
  async function commitMutation(
    input: Parameters<LeadMutationUow["commit"]>[0],
  ) {
    return executor.transaction().execute(async (txDb) => {
      const deps = createMutationDeps(txDb);

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
  }

  async function commitCheckedMutation(
    input: Parameters<LeadMutationUow["commitChecked"]>[0],
  ) {
    return executor.transaction().execute(async (txDb) => {
      const deps = createMutationDeps(txDb);
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
  }

  return {
    derivePatch(input) {
      return deriveLeadPatchFromIntent(input);
    },

    async commit(input): Promise<Result<LeadMutationOutcome, DomainError>> {
      const result = await commitMutation(input);
      if (!result.ok) return result;

      if (options?.publishNotifications) {
        await options.publishNotifications({
          leadId: input.lead.id,
          ruc: input.lead.ruc,
          executiveId: input.lead.executiveId,
          events: result.value.events,
          historyIds: result.value.historyIds,
          now: input.now,
        });
      }

      return result;
    },

    async commitChecked(
      input,
    ): Promise<Result<CheckedLeadMutationOutcome, DomainError>> {
      const result = await commitCheckedMutation(input);
      if (!result.ok || !result.value.applied) return result;

      if (result.value.events && result.value.historyIds) {
        if (options?.publishNotifications) {
          await options.publishNotifications({
            leadId: input.lead.id,
            ruc: input.lead.ruc,
            executiveId: input.lead.executiveId,
            events: result.value.events,
            historyIds: result.value.historyIds,
            now: input.now,
          });
        }
      }
      return result;
    },
  };
}
