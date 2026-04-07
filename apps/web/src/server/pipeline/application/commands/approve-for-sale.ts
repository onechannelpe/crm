import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { ApproveForSaleDeps } from "../deps/quotations";
import { createLeadSubjectLoader } from "../loaders/lead-subject-loader";
import {
  canApproveForSale,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { persistLeadSaleApproval } from "./approve-for-sale-effects";

export async function approveForSale(input: {
  deps: ApproveForSaleDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<void, DomainError>> {
  const canApprove = requirePipelineActionAccess(
    input.actorRole,
    canApproveForSale,
  );
  if (!canApprove.ok) {
    return canApprove;
  }

  const lead = await createLeadSubjectLoader(input.deps.leads).loadQuotedLead(
    input.leadId,
  );
  if (!lead.ok) {
    return lead;
  }

  const now = Date.now();
  await persistLeadSaleApproval({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    lead: lead.value,
    actorUserId: input.actorUserId,
    now,
  });

  return Ok(undefined);
}
