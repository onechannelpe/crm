import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanCreateSale } from "../../domain/workflow";
import type { CreateSaleDeps } from "../deps/sales";
import type { PipelineAuditService } from "../ports/audit-service";
import { writeLeadSale } from "./create-sale-writer";

export async function createSale(
  deps: CreateSaleDeps,
  auditService: PipelineAuditService,
  input: {
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
  },
): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

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

  const now = Date.now();
  const saleId = await writeLeadSale({
    deps,
    auditService,
    lead,
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
