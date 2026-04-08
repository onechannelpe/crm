import type { LeadPriority } from "~/pipeline/contracts/lead-schema";
import { type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { recomputeReviewStage } from "../../pipeline/application/commands/recompute-review-stage";
import type { ReviewLeadDeps } from "../../pipeline/application/deps/review-lead";
import { loadPendingReviewLead } from "../../pipeline/application/loaders/lead-subject-loader";
import type { PipelineAuditService } from "../../pipeline/application/ports/audit-service";
import type { PipelineNotificationCenter } from "../../pipeline/application/ports/notification-center";
import { createHistoryEvent } from "../../pipeline/domain/history";

export async function applyPrioridadImport(input: {
  deps: ReviewLeadDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  actorUserId: number;
  branchId: number;
  leadId: number;
  prioridad: LeadPriority;
  reason: string;
}): Promise<Result<void, DomainError>> {
  const lead = await loadPendingReviewLead(input.deps.leads, input.leadId);
  if (!lead.ok) {
    return lead;
  }
  const subject = lead.value;

  const now = Date.now();
  await input.deps.leads.updateById(subject.id, {
    prioridad: input.prioridad,
    updatedAt: now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: subject.id,
      eventType: "lead_priority_updated",
      actorUserId: input.actorUserId,
      payload: {
        fromPrioridad: subject.prioridad,
        toPrioridad: input.prioridad,
        reason: input.reason,
      },
      occurredAt: now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "lead_priority_imported",
    "lead",
    subject.id,
    {
      fromPrioridad: subject.prioridad,
      toPrioridad: input.prioridad,
      reason: input.reason,
    },
  );

  if (!subject.status) {
    return Ok(undefined);
  }

  return recomputeReviewStage({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    actorUserId: input.actorUserId,
    branchId: input.branchId,
    lead: subject,
    status: subject.status,
    prioridad: input.prioridad,
    reason: input.reason,
    now,
  });
}
