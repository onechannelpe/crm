import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import type { LeadStatus, Prioridad } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { resolveReviewTransition } from "../../domain/workflow";
import {
  createPipelineAuditService,
  createPipelineDeps,
  createPipelineNotificationCenter,
} from "../../infrastructure/deps";
import {
  notifyExecutiveInputRequired,
  notifyReadyForQuotation,
} from "../notifications";

export async function reviewLead(input: {
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
    const auditService = createPipelineAuditService(deps);
    const notificationCenter = createPipelineNotificationCenter(executor);
    const lead = await deps.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const transition = resolveReviewTransition({
      currentStage: lead.stage,
      status: input.status,
      prioridad: input.prioridad,
    });
    if (!transition.ok) {
      return transition;
    }

    const now = Date.now();
    await deps.leads.updateById(input.leadId, {
      status: input.status,
      prioridad: input.prioridad,
      stage: transition.value,
      updated_at: now,
    });
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "lead_reviewed",
        actorUserId: input.actorUserId,
        payload: {
          status: input.status,
          prioridad: input.prioridad,
          reason: input.reason,
          fromStage: lead.stage,
          toStage: transition.value,
        },
        occurredAt: now,
      }),
    );
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: lead.stage, to: transition.value },
        occurredAt: now,
      }),
    );
    await auditService.log(
      input.actorUserId,
      "lead_reviewed",
      "lead",
      input.leadId,
      {
        fromStage: lead.stage,
        toStage: transition.value,
        fromStatus: lead.status,
        toStatus: input.status,
        fromPrioridad: lead.prioridad,
        toPrioridad: input.prioridad,
        reason: input.reason,
      },
    );

    if (transition.value === "NEEDS_EXECUTIVE_INPUT") {
      await notifyExecutiveInputRequired({
        center: notificationCenter,
        executiveId: lead.executive_id,
        leadId: lead.id,
        ruc: lead.ruc,
      });
    }

    if (transition.value === "READY_FOR_QUOTATION") {
      await notifyReadyForQuotation({
        center: notificationCenter,
        branchId: input.branchId,
        leadId: lead.id,
        ruc: lead.ruc,
      });
    }

    return Ok(undefined);
  });
}
