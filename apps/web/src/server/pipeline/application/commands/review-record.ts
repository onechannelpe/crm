import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import type { LeadStatus, Prioridad } from "~/lib/db/types";
import {
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { resolveReviewTransition } from "../../domain/workflow";
import { createPipelineDeps } from "../../infrastructure/deps";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";

export async function reviewRecord(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  leadId: number;
  status: LeadStatus;
  prioridad: Prioridad;
  reason: string;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:review")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    const record = await deps.records.findById(input.leadId);
    if (!record) {
      return Err(
        domainError("not_found", "record_not_found", "Record not found"),
      );
    }

    const transition = resolveReviewTransition({
      currentStage: record.stage,
      status: input.status,
      prioridad: input.prioridad,
    });
    if (!transition.ok) {
      return transition;
    }

    const now = Date.now();
    await deps.records.updateById(input.leadId, {
      status: input.status,
      prioridad: input.prioridad,
      stage: transition.value,
      updated_at: now,
    });
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "record_reviewed",
        actorUserId: input.actorUserId,
        payload: {
          status: input.status,
          prioridad: input.prioridad,
          reason: input.reason,
          fromStage: record.stage,
          toStage: transition.value,
        },
        occurredAt: now,
      }),
    );
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: record.stage, to: transition.value },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "record_reviewed",
      "lead",
      input.leadId,
      {
        fromStage: record.stage,
        toStage: transition.value,
        fromStatus: record.status,
        toStatus: input.status,
        fromPrioridad: record.prioridad,
        toPrioridad: input.prioridad,
        reason: input.reason,
      },
    );

    if (transition.value === "NEEDS_EXECUTIVE_INPUT") {
      await notifyExecutiveInputRequired({
        center: pipelineNotificationCenter,
        executiveId: record.executive_id,
        leadId: record.id,
        ruc: record.ruc,
      });
    }

    if (transition.value === "READY_FOR_QUOTATION") {
      await notifyReadyForQuotation({
        center: pipelineNotificationCenter,
        branchId: input.branchId,
        leadId: record.id,
        ruc: record.ruc,
      });
    }

    return Ok(undefined);
  });
}
