import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanApproveForSale } from "../../domain/workflow";
import type { ApproveForSaleDeps } from "../deps/quotations";
import {
  canApproveForSale,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { writeLeadSaleApproval } from "./approve-for-sale-writer";

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

  const lead = await input.deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const allowed = ensureCanApproveForSale(lead.stage);
  if (!allowed.ok) {
    return allowed;
  }

  const now = Date.now();
  await writeLeadSaleApproval({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    lead,
    actorUserId: input.actorUserId,
    now,
  });

  return Ok(undefined);
}
