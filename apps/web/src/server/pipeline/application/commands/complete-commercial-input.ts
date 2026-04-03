import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanCompleteCommercialInput } from "../../domain/workflow";
import type { CompleteCommercialInputDeps } from "../deps/sales";
import {
  canCompleteCommercialInput,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import type { PipelineNotificationCenter } from "../ports/notification-center";
import { persistCommercialInputCompletion } from "./complete-commercial-input-effects";

export async function completeCommercialInput(input: {
  deps: CompleteCommercialInputDeps;
  auditService: PipelineAuditService;
  notificationCenter: PipelineNotificationCenter;
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
  const canComplete = requirePipelineActionAccess(
    input.actorRole,
    canCompleteCommercialInput,
  );
  if (!canComplete.ok) {
    return canComplete;
  }

  const lead = await input.deps.leads.findById(input.leadId);
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
  await persistCommercialInputCompletion({
    deps: input.deps,
    auditService: input.auditService,
    notificationCenter: input.notificationCenter,
    lead,
    actorUserId: input.actorUserId,
    branchId: input.branchId,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    abono: input.abono,
    cantidadPos: input.cantidadPos,
    now,
  });

  return Ok(undefined);
}
