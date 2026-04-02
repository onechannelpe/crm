import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanApproveForSale } from "../../domain/workflow";
import {
  createPipelineAuditService,
  createPipelineDeps,
  createPipelineNotificationCenter,
} from "../../infrastructure/deps";
import { notifyReadyForSale } from "../notifications";

export async function approveForSale(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
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
  });
}
