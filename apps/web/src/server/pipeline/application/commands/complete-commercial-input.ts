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
import { ensureCanCompleteCommercialInput } from "../../domain/workflow";
import { createPipelineDeps } from "../../infrastructure/deps";
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
    const record = await deps.records.findById(input.leadId);
    if (!record) {
      return Err(
        domainError("not_found", "record_not_found", "Record not found"),
      );
    }

    const allowed = ensureCanCompleteCommercialInput({
      stage: record.stage,
      executiveId: record.executive_id,
      actorUserId: input.actorUserId,
    });
    if (!allowed.ok) {
      return allowed;
    }

    const now = Date.now();
    await deps.commercialInputs.upsert({
      lead_id: input.leadId,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      updated_at: now,
      updated_by: input.actorUserId,
    });
    await deps.records.updateById(input.leadId, {
      stage: "READY_FOR_QUOTATION",
      updated_at: now,
    });
    await deps.history.insert(
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
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: record.stage, to: "READY_FOR_QUOTATION" },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "commercial_input_completed",
      "lead",
      input.leadId,
      { from: record.stage, to: "READY_FOR_QUOTATION" },
    );

    await notifyReadyForQuotation({
      center: pipelineNotificationCenter,
      branchId: input.branchId,
      leadId: record.id,
      ruc: record.ruc,
    });

    return Ok(undefined);
  });
}
