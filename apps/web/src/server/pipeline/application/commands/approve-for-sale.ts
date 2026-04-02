import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanApproveForSale } from "../../domain/workflow";
import { notifyReadyForSale } from "../notifications";
import type {
  LeadHistoryRepository,
  LeadRepository,
  PipelineAuditService,
  PipelineNotificationCenter,
} from "../ports";

type ApproveForSaleDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
};

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
  await deps.leads.updateById(input.leadId, {
    stage: "READY_FOR_SALE",
    updatedAt: now,
  });
  await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "sale_approved",
      actorUserId: input.actorUserId,
      payload: null,
      occurredAt: now,
    }),
  );
  await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: lead.stage, to: "READY_FOR_SALE" },
      occurredAt: now,
    }),
  );
  await auditService.log(
    input.actorUserId,
    "sale_approved",
    "lead",
    input.leadId,
    { from: lead.stage, to: "READY_FOR_SALE" },
  );

  await notifyReadyForSale({
    center: notificationCenter,
    executiveId: lead.executiveId,
    leadId: lead.id,
    ruc: lead.ruc,
  });

  return Ok(undefined);
}
