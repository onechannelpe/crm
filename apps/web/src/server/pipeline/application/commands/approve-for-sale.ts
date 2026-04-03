import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanApproveForSale } from "../../domain/workflow";
import type { ApproveForSaleDeps } from "../deps/quotations";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { writeLeadSaleApproval } from "./approve-for-sale-writer";

export async function approveForSale(
  deps: ApproveForSaleDeps,
  auditService: PipelineAuditService,
  notificationCenter: PipelineNotificationCenter,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
  },
): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const allowed = ensureCanApproveForSale(lead.stage);
  if (!allowed.ok) {
    return allowed;
  }

  const now = Date.now();
  await writeLeadSaleApproval({
    deps,
    auditService,
    notificationCenter,
    lead,
    actorUserId: input.actorUserId,
    now,
  });

  return Ok(undefined);
}
