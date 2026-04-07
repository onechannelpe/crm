import { createHistoryEvent } from "../../domain/history";
import type { ReadyForSaleLeadSubject } from "../../domain/lead-subjects";
import type { CreateSaleDeps } from "../deps/sales";
import type { PipelineAuditService } from "../ports/audit-service";

export async function writeSaleCreationEffects(input: {
  deps: CreateSaleDeps;
  auditService: PipelineAuditService;
  lead: ReadyForSaleLeadSubject;
  actorUserId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
  now: number;
}) {
  const saleId = await input.deps.leadSales.insert({
    leadId: input.lead.id,
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
    createdAt: input.now,
  });

  await input.deps.leads.updateById(input.lead.id, {
    stage: "CONVERTED",
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "sale_created",
      actorUserId: input.actorUserId,
      payload: { saleId },
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: input.lead.stage, to: "CONVERTED" },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "sale_created",
    "lead",
    input.lead.id,
    { saleId, to: "CONVERTED" },
  );

  return saleId;
}
