import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadPriority, LeadStatus } from "../../domain/lead";
import { resolveReviewTransition } from "../../domain/workflow";
import type { ReviewLeadDeps } from "../deps/review-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { notifyLeadReviewOutcome } from "./review-lead-notifier";
import { writeLeadReview } from "./review-lead-writer";

export async function reviewLead(
  deps: ReviewLeadDeps,
  auditService: PipelineAuditService,
  notificationCenter: PipelineNotificationCenter,
  input: {
    actorUserId: number;
    actorRole: Role;
    branchId: number;
    leadId: number;
    status: LeadStatus;
    prioridad: LeadPriority;
    reason: string;
  },
): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:review")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

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
  await writeLeadReview({
    deps,
    auditService,
    lead,
    actorUserId: input.actorUserId,
    status: input.status,
    prioridad: input.prioridad,
    reason: input.reason,
    nextStage: transition.value,
    now,
  });

  await notifyLeadReviewOutcome({
    notificationCenter,
    branchId: input.branchId,
    lead,
    nextStage: transition.value,
  });

  return Ok(undefined);
}
