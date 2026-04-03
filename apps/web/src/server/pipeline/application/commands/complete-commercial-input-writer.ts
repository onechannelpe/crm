import { createHistoryEvent } from "../../domain/history";
import type { Lead } from "../../domain/lead";
import type { CompleteCommercialInputDeps } from "../deps/sales";
import { notifyReadyForQuotation } from "../notifications";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";

export async function writeCompletedCommercialInput(input: {
  deps: CompleteCommercialInputDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  lead: Lead;
  actorUserId: number;
  branchId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  now: number;
}) {
  await input.deps.leadCommercialInputs.upsert({
    leadId: input.lead.id,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    abono: input.abono,
    cantidadPos: input.cantidadPos,
    updatedAt: input.now,
    updatedBy: input.actorUserId,
  });
  await input.deps.leads.updateById(input.lead.id, {
    stage: "READY_FOR_QUOTATION",
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
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
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: input.lead.stage, to: "READY_FOR_QUOTATION" },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "commercial_input_completed",
    "lead",
    input.lead.id,
    { from: input.lead.stage, to: "READY_FOR_QUOTATION" },
  );
  await notifyReadyForQuotation({
    center: input.notificationCenter,
    branchId: input.branchId,
    leadId: input.lead.id,
    ruc: input.lead.ruc,
  });
}
