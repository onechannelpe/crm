import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import { projectLeadStageChangedEvent } from "~/server/notifications/unified";
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
  async function resolveExecutiveBranchId(executiveId: number) {
    const row = await executor
      .selectFrom("users")
      .select("branch_id")
      .where("id", "=", executiveId)
      .executeTakeFirst();
    return row?.branch_id ?? null;
  }

  async function enqueueWorkflowNotifications(input: {
    leadId: string;
    ruc: string;
    executiveId: number;
    events: LeadMutationOutcome["events"];
    historyIds: string[];
    now: number;
  }) {
    const branchId = await resolveExecutiveBranchId(input.executiveId);
    for (let index = 0; index < input.events.history.length; index += 1) {
      const event = input.events.history[index];
      const sourceEventId = input.historyIds[index];
      if (!sourceEventId) {
        continue;
      }
      if (event.eventType !== "workflow_stage_changed") {
        continue;
      }
      await projectLeadStageChangedEvent(executor, {
        id: sourceEventId,
        leadId: input.leadId,
        toStage: event.payload.to,
        ruc: input.ruc,
        executiveId: input.executiveId,
        branchId,
        occurredAt: input.now,
      });
    }
  }

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

      const result = await executeLeadMutation({
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
      if (!result.ok) return result;

      await enqueueWorkflowNotifications({
        leadId: input.lead.id,
        ruc: input.lead.ruc,
        executiveId: input.lead.executiveId,
        events: result.value.events,
        historyIds: result.value.historyIds,
        now: input.now,
      });

      return result;
    },

    async commitChecked(
      input,
    ): Promise<Result<CheckedLeadMutationOutcome, DomainError>> {
      const deps = createMutationDeps(executor);
      const result = await executeCheckedLeadMutation({
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
      if (!result.ok || !result.value.applied) return result;

      if (result.value.events && result.value.historyIds) {
        await enqueueWorkflowNotifications({
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
  };
}
