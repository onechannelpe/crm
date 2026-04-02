import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanCompleteCommercialInput } from "../../domain/workflow";
import {
  createPipelineAuditService,
  createPipelineDeps,
  createPipelineNotificationCenter,
} from "../../infrastructure/deps";
import { notifyReadyForQuotation } from "../notifications";

export async function completeCommercialInput(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
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

    const allowed = ensureCanCompleteCommercialInput({
      stage: lead.stage,
      executiveId: lead.executiveId,
      actorUserId: input.actorUserId,
    });
    if (!allowed.ok) {
      return allowed;
    }

    const now = Date.now();
    await deps.leadCommercialInputs.upsert({
      leadId: input.leadId,
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidadPos: input.cantidadPos,
      updatedAt: now,
      updatedBy: input.actorUserId,
    });
    await deps.leads.updateById(input.leadId, {
      stage: "READY_FOR_QUOTATION",
      updatedAt: now,
    });
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "commercial_input_completed",
        actorUserId: input.actorUserId,
        payload: {
          proveedorActual: input.proveedorActual,
          tasaActual: input.tasaActual,
          gpv: input.gpv,
          ticket: input.ticket,
          abono: input.abono,
          cantidadPos: input.cantidadPos,
        },
        occurredAt: now,
      }),
    );
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: lead.stage, to: "READY_FOR_QUOTATION" },
        occurredAt: now,
      }),
    );
    await auditService.log(
      input.actorUserId,
      "commercial_input_completed",
      "lead",
      input.leadId,
      { from: lead.stage, to: "READY_FOR_QUOTATION" },
    );

    await notifyReadyForQuotation({
      center: notificationCenter,
      branchId: input.branchId,
      leadId: lead.id,
      ruc: lead.ruc,
    });

    return Ok(undefined);
  });
}
