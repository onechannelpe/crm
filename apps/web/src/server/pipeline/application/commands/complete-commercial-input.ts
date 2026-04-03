import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanCompleteCommercialInput } from "../../domain/workflow";
import { notifyReadyForQuotation } from "../notifications";
import type { PipelineAuditService } from "../ports/audit-service";
import type { LeadCommercialInputRepository } from "../ports/commercial-input-repository";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { PipelineNotificationCenter } from "../ports/notification-center";

type CompleteCommercialInputDeps = {
  leads: LeadRepository;
  leadCommercialInputs: LeadCommercialInputRepository;
  leadHistory: LeadHistoryRepository;
};

export async function completeCommercialInput(
  deps: CompleteCommercialInputDeps,
  auditService: PipelineAuditService,
  notificationCenter: PipelineNotificationCenter,
  input: {
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
  },
): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

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
}
