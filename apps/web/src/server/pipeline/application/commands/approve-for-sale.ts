import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import {
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanApproveForSale } from "../../domain/workflow";
import { createPipelineDeps } from "../../infrastructure/deps";
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
    const record = await deps.records.findById(input.leadId);
    if (!record) {
      return Err(
        domainError("not_found", "record_not_found", "Record not found"),
      );
    }

    const allowed = ensureCanApproveForSale(record.stage);
    if (!allowed.ok) {
      return allowed;
    }

    const now = Date.now();
    await deps.records.updateById(input.leadId, {
      stage: "READY_FOR_SALE",
      updated_at: now,
    });
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "sale_approved",
        actorUserId: input.actorUserId,
        occurredAt: now,
      }),
    );
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: record.stage, to: "READY_FOR_SALE" },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "sale_approved",
      "lead",
      input.leadId,
      { from: record.stage, to: "READY_FOR_SALE" },
    );

    await notifyReadyForSale({
      center: pipelineNotificationCenter,
      executiveId: record.executive_id,
      leadId: record.id,
      ruc: record.ruc,
    });

    return Ok(undefined);
  });
}
