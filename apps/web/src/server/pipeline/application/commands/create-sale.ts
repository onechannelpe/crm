import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { CreateSaleDeps } from "../deps/sales";
import { loadReadyForSaleLead } from "../loaders/lead-subject-loader";
import { canCreateSale, requirePipelineActionAccess } from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import { writeSaleCreationEffects } from "./create-sale-effects";

export async function createSale(input: {
  deps: CreateSaleDeps;
  auditService: PipelineAuditService;
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
  const canCreate = requirePipelineActionAccess(input.actorRole, canCreateSale);
  if (!canCreate.ok) {
    return canCreate;
  }

  const lead = await loadReadyForSaleLead(input.deps.leads, input.leadId);
  if (!lead.ok) {
    return lead;
  }
  if (lead.value.executiveId !== input.actorUserId) {
    return {
      ok: false,
      error: domainError(
        "forbidden",
        "not_owner",
        "Only the assigned executive can create the sale",
      ),
    };
  }
  if (input.banco.trim().toUpperCase() !== "BCP" && !input.cci?.trim()) {
    return {
      ok: false,
      error: domainError(
        "validation",
        "missing_cci",
        "CCI is required when the selected bank is not BCP",
      ),
    };
  }

  const now = Date.now();
  const saleId = await writeSaleCreationEffects({
    deps: input.deps,
    auditService: input.auditService,
    lead: lead.value,
    actorUserId: input.actorUserId,
    proveedorActual: input.proveedorActual,
    tasaActual: input.tasaActual,
    gpv: input.gpv,
    ticket: input.ticket,
    abono: input.abono,
    cantidadPos: input.cantidadPos,
    banco: input.banco,
    nroCuenta: input.nroCuenta,
    cci: input.cci,
    now,
  });

  return Ok({ id: saleId });
}
