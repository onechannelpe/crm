import { createHistoryEvent } from "../../domain/history";
import type { NeedsExecutiveInputLeadSubject } from "../../domain/lead-subjects";
import type { CompleteCommercialInputDeps } from "../deps/sales";
import { notifyReadyForQuotation } from "../notifications";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { applyLeadMutation } from "../services/lead-mutation-service";

export async function persistCommercialInputCompletion(input: {
  deps: CompleteCommercialInputDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
  lead: NeedsExecutiveInputLeadSubject;
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
  await applyLeadMutation({
    leads: input.deps.leads,
    leadId: input.lead.id,
    actorUserId: input.actorUserId,
    now: input.now,
    patch: { stage: "READY_FOR_QUOTATION" },
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
