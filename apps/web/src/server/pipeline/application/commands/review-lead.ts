import type { Role } from "~/lib/auth/access/rbac";
import type {
  LeadPriority,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { ReviewLeadDeps } from "../deps/review-lead";
import { loadPendingReviewLead } from "../loaders/lead-subject-loader";
import { canReviewLead, requirePipelineActionAccess } from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { recomputeReviewStage } from "./recompute-review-stage";

export async function reviewLead(input: {
  deps: ReviewLeadDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  leadId: number;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
}): Promise<Result<void, DomainError>> {
  const canReview = requirePipelineActionAccess(input.actorRole, canReviewLead);
  if (!canReview.ok) {
    return canReview;
  }

  const lead = await loadPendingReviewLead(input.deps.leads, input.leadId);
  if (!lead.ok) {
    return lead;
  }

  const now = Date.now();
  const result = await recomputeReviewStage({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    branchId: input.branchId,
    lead: lead.value,
    actorUserId: input.actorUserId,
    status: input.status,
    prioridad: input.prioridad,
    reason: input.reason,
    now,
  });
  if (!result.ok) {
    return result;
  }
  return Ok(undefined);
}
