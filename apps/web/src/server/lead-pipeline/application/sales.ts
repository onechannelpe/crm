import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { db } from "~/lib/db/db";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { pipelineAuditService } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureLeadCanCreateSale } from "../domain/lead";
import { createLeadPipelineRepos } from "../infrastructure/repos";

type SaleRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createLeadPipelineRepos>["sales"]["findById"]>
  >
>;

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

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateSale({
      stage: lead.stage,
      executiveId: lead.executive_id,
      actorUserId: input.actorUserId,
      banco: input.banco,
      cci: input.cci,
    });
    if (!canCreate.ok) {
      return canCreate;
    }

    const saleId = await repos.sales.insert({
      lead_id: input.leadId,
      executive_id: input.actorUserId,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      banco: input.banco,
      nro_cuenta: input.nroCuenta,
      cci: input.cci,
      created_at: Date.now(),
    });

    await repos.leads.updateById(input.leadId, {
      stage: "CONVERTED",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "sale_created",
        "lead",
        input.leadId,
        {
          saleId,
          to: "CONVERTED",
        },
      );
    });

    return Ok({ id: saleId });
  });
}

export async function listSales(input: {
  actorRole: Role;
  actorUserId: number;
  limit?: number;
  offset?: number;
}): Promise<Result<SaleRow[], DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  if (input.actorRole === "executive") {
    return Ok(
      await repos.sales.listByExecutive(input.actorUserId, limit, offset),
    );
  }

  return Ok(await repos.sales.list(limit, offset));
}

export async function getSaleDetail(input: {
  actorRole: Role;
  actorUserId: number;
  saleId: number;
}): Promise<Result<SaleRow, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const sale = await repos.sales.findById(input.saleId);
  if (!sale) {
    return Err(domainError("not_found", "sale_not_found", "Sale not found"));
  }

  const canViewAll = input.actorRole !== "executive";
  if (!canViewAll && sale.executive_id !== input.actorUserId) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return Ok(sale);
}
