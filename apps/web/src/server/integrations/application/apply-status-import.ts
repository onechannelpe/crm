import type { LeadStatus } from "~/pipeline/contracts/lead-schema";
import { type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { recomputeReviewStage } from "../../pipeline/application/commands/recompute-review-stage";
import type { ReviewLeadDeps } from "../../pipeline/application/deps/review-lead";
import { createLeadSubjectLoader } from "../../pipeline/application/loaders/lead-subject-loader";
import type { PipelineAuditService } from "../../pipeline/application/ports/audit-service";
import type { PipelineNotificationCenter } from "../../pipeline/application/ports/notification-center";
import { createHistoryEvent } from "../../pipeline/domain/history";

export async function applyStatusImport(input: {
  deps: ReviewLeadDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  actorUserId: number;
  branchId: number;
  leadId: number;
  status: LeadStatus;
  reason: string;
}): Promise<Result<void, DomainError>> {
  const lead = await createLeadSubjectLoader(
    input.deps.leads,
  ).loadPendingReviewLead(input.leadId);
  if (!lead.ok) {
    return lead;
  }
  const subject = lead.value;

  const now = Date.now();
  await input.deps.leads.updateById(subject.id, {
    status: input.status,
    updatedAt: now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: subject.id,
      eventType: "lead_status_updated",
      actorUserId: input.actorUserId,
      payload: {
        fromStatus: subject.status,
        toStatus: input.status,
        reason: input.reason,
      },
      occurredAt: now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "lead_status_imported",
    "lead",
    subject.id,
    {
      fromStatus: subject.status,
      toStatus: input.status,
      reason: input.reason,
    },
  );

  if (!subject.prioridad) {
    return Ok(undefined);
  }

  return recomputeReviewStage({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    actorUserId: input.actorUserId,
    branchId: input.branchId,
    lead: subject,
    status: input.status,
    prioridad: subject.prioridad,
    reason: input.reason,
    now,
  });
}
