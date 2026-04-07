import type {
  LeadPriority,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { PendingReviewLeadSubject } from "../../domain/lead-subjects";
import { resolveReviewTransition } from "../../domain/workflow";
import type { ReviewLeadDeps } from "../deps/review-lead";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { persistLeadReviewTransition } from "./review-lead-effects";
import { notifyLeadReviewOutcome } from "./review-lead-notifier";

export async function recomputeReviewStage(input: {
  deps: ReviewLeadDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  actorUserId: number;
  branchId: number;
  lead: PendingReviewLeadSubject;
  status: LeadStatus;
  prioridad: LeadPriority;
  reason: string;
  now: number;
}): Promise<Result<void, DomainError>> {
  const transition = resolveReviewTransition({
    lead: input.lead,
    status: input.status,
    prioridad: input.prioridad,
  });

  await persistLeadReviewTransition({
    deps: input.deps,
    auditService: input.auditService,
    lead: input.lead,
    actorUserId: input.actorUserId,
    status: input.status,
    prioridad: input.prioridad,
    reason: input.reason,
    nextStage: transition,
    now: input.now,
  });

  await notifyLeadReviewOutcome({
    notificationCenter: input.notificationCenter,
    branchId: input.branchId,
    lead: input.lead,
    nextStage: transition,
  });

  return Ok(undefined);
}
