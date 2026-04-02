import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanCreateSale } from "../../domain/workflow";
import {
  createPipelineAuditService,
  createPipelineDeps,
} from "../../infrastructure/deps";

export async function createSale(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    const auditService = createPipelineAuditService(deps);
    const lead = await deps.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const allowed = ensureCanCreateSale({
      stage: lead.stage,
      executiveId: lead.executiveId,
      actorUserId: input.actorUserId,
      bank: input.banco,
      cci: input.cci,
    });
    if (!allowed.ok) {
      return allowed;
    }

    const saleId = await deps.leadSales.insert({
      leadId: input.leadId,
      executiveId: input.actorUserId,
      proveedorActual: input.proveedorActual,
      tasaActual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidadPos: input.cantidadPos,
      banco: input.banco,
      nroCuenta: input.nroCuenta,
      cci: input.cci,
      createdAt: Date.now(),
    });

    const now = Date.now();
    await deps.leads.updateById(input.leadId, {
      stage: "CONVERTED",
      updatedAt: now,
    });
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "sale_created",
        actorUserId: input.actorUserId,
        payload: { saleId },
        occurredAt: now,
      }),
    );
    await deps.leadHistory.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: lead.stage, to: "CONVERTED" },
        occurredAt: now,
      }),
    );
    await auditService.log(
      input.actorUserId,
      "sale_created",
      "lead",
      input.leadId,
      { saleId, to: "CONVERTED" },
    );

    return Ok({ id: saleId });
  });
}
